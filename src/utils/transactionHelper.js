// Transaction Helper - Provides retry logic with exponential backoff
import { runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from './logger';

class TransactionHelper {
  constructor() {
    this.defaultConfig = {
      maxRetries: 10, // Increased from 5 for better contention handling
      initialDelay: 50, // Reduced initial delay for faster first retry
      maxDelay: 5000, // Reduced max delay for faster overall resolution
      backoffFactor: 1.5, // Less aggressive backoff
      jitterMax: 100 // ms
    };
  }

  /**
   * Execute a transaction with automatic retry and exponential backoff
   * @param {Function} transactionFn - The transaction function to execute
   * @param {Object} config - Retry configuration
   * @returns {Promise} - Result of the transaction
   */
  async runWithRetry(transactionFn, config = {}) {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError = null;
    let attempt = 0;

    while (attempt < retryConfig.maxRetries) {
      try {
        // Attempt the transaction
        const result = await runTransaction(db, transactionFn);
        
        // Success - log if there were previous attempts
        if (attempt > 0) {
          await logger.info('Transaction succeeded after retry', {
            attempts: attempt + 1,
            lastError: lastError?.message
          });
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          await logger.error('Non-retryable transaction error', error, {
            attempt,
            errorCode: error.code
          });
          throw error;
        }
        
        // Check if we've exhausted retries
        if (attempt >= retryConfig.maxRetries) {
          await logger.error('Transaction failed after max retries', error, {
            attempts: attempt,
            maxRetries: retryConfig.maxRetries
          });
          throw new Error(`Transaction failed after ${attempt} attempts: ${error.message}`);
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, retryConfig);
        
        await logger.warn(`Transaction failed, retrying in ${delay}ms`, {
          attempt,
          delay,
          error: error.message,
          errorCode: error.code
        });
        
        // Wait before retry
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [
      'failed-precondition',
      'aborted',
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal'
    ];
    
    // Check Firebase error codes
    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }
    
    // Check for specific error messages
    const retryableMessages = [
      'contention',
      'conflict',
      'concurrent',
      'locked',
      'timeout',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: delay = initialDelay * (backoffFactor ^ attempt)
    let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, config.maxDelay);
    
    // Add random jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    delay += jitter;
    
    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a transaction wrapper with custom retry config
   * @param {Object} config - Custom retry configuration
   * @returns {Function} - Wrapped transaction function
   */
  createRetryWrapper(config = {}) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    return async (transactionFn) => {
      return this.runWithRetry(transactionFn, mergedConfig);
    };
  }

  /**
   * Execute multiple transactions in sequence with retry
   * @param {Array} transactions - Array of transaction functions
   * @param {Object} config - Retry configuration
   * @returns {Promise<Array>} - Results of all transactions
   */
  async runSequentialTransactions(transactions, config = {}) {
    const results = [];
    
    for (let i = 0; i < transactions.length; i++) {
      try {
        const result = await this.runWithRetry(transactions[i], config);
        results.push({ success: true, result, index: i });
      } catch (error) {
        results.push({ success: false, error: error.message, index: i });
        
        // Optionally stop on first failure
        if (config.stopOnFailure) {
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * Execute transactions with circuit breaker pattern
   * @param {Function} transactionFn - Transaction function
   * @param {Object} config - Configuration with circuit breaker settings
   * @returns {Promise} - Transaction result
   */
  async runWithCircuitBreaker(transactionFn, config = {}) {
    const circuitConfig = {
      ...this.defaultConfig,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      ...config
    };
    
    // Check circuit state
    if (this.isCircuitOpen(circuitConfig)) {
      throw new Error('Circuit breaker is open - transactions temporarily disabled');
    }
    
    try {
      const result = await this.runWithRetry(transactionFn, circuitConfig);
      this.recordSuccess(circuitConfig);
      return result;
    } catch (error) {
      this.recordFailure(circuitConfig);
      throw error;
    }
  }

  // Circuit breaker state management (simplified)
  circuitState = new Map();

  isCircuitOpen(config) {
    const state = this.circuitState.get(config);
    if (!state) return false;
    
    // Check if circuit should reset
    if (Date.now() - state.lastFailureTime > config.resetTimeout) {
      this.circuitState.delete(config);
      return false;
    }
    
    return state.failures >= config.failureThreshold;
  }

  recordFailure(config) {
    const state = this.circuitState.get(config) || { failures: 0 };
    state.failures++;
    state.lastFailureTime = Date.now();
    this.circuitState.set(config, state);
  }

  recordSuccess(config) {
    const state = this.circuitState.get(config);
    if (state) {
      state.failures = Math.max(0, state.failures - 1);
    }
  }
}

// Export singleton
export const transactionHelper = new TransactionHelper();
export default transactionHelper;