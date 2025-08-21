// Centralized logging wrapper for CBRT UI
// Supports levels: debug, info, warn, error
// Optional Sentry integration behind VITE_SENTRY_DSN

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const CURRENT_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

class Logger {
  constructor() {
    this.level = LOG_LEVELS[CURRENT_LEVEL] || LOG_LEVELS.info;
    this.initSentry();
  }

  initSentry() {
    // Sentry integration disabled for now
    // To enable: npm install @sentry/browser and set VITE_SENTRY_DSN
    this.sentry = null;
    
    if (SENTRY_DSN) {
      console.info('📊 Sentry DSN configured but package not installed');
      console.info('To enable error tracking: npm install @sentry/browser');
    }
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const userContext = this.getUserContext();
    
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      metadata: {
        ...metadata,
        ...userContext,
        url: window.location?.href,
        userAgent: navigator?.userAgent
      }
    };
  }

  getUserContext() {
    try {
      // Try to get user context from various sources
      const user = window.__CBRT_USER__ || {};
      return {
        userId: user.id || 'anonymous',
        userRole: user.role || 'unknown',
        userEmail: user.email || 'unknown'
      };
    } catch (err) {
      return {
        userId: 'unknown',
        userRole: 'unknown', 
        userEmail: 'unknown'
      };
    }
  }

  shouldLog(level) {
    return LOG_LEVELS[level] >= this.level;
  }

  debug(message, metadata = {}) {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, metadata);
    console.debug('🐛 [DEBUG]', formatted.message, formatted.metadata);
  }

  info(message, metadata = {}) {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, metadata);
    console.info('ℹ️ [INFO]', formatted.message, formatted.metadata);
  }

  warn(message, metadata = {}) {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, metadata);
    console.warn('⚠️ [WARN]', formatted.message, formatted.metadata);
    
    if (this.sentry) {
      this.sentry.captureMessage(message, 'warning');
    }
  }

  error(message, error = null, metadata = {}) {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    });
    
    console.error('🚨 [ERROR]', formatted.message, formatted.metadata);
    
    if (this.sentry) {
      if (error) {
        this.sentry.captureException(error);
      } else {
        this.sentry.captureMessage(message, 'error');
      }
    }
  }

  // Method to set user context for all subsequent logs
  setUserContext(user) {
    window.__CBRT_USER__ = user;
    
    if (this.sentry) {
      this.sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role
      });
    }
  }

  // Performance timing utility
  time(label) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        this.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error, setUserContext, time } = logger;

export default logger;