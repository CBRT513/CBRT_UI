// File: /Users/cerion/CBRT_UI/src/utils/logger.js
// Centralized logging utility with error handling

const timestamp = () => new Date().toISOString();

const sendRemoteLog = async (level, message, extra = {}) => {
  // TODO: Hook into external logging service (e.g., Firestore logs collection)
  // Example: 
  // try {
  //   await addDoc(collection(db, 'logs'), {
  //     level,
  //     message,
  //     extra,
  //     timestamp: timestamp(),
  //     userAgent: navigator.userAgent,
  //     url: window.location.href
  //   });
  // } catch (err) {
  //   console.error('Failed to send remote log:', err);
  // }
  return;
};

export const logger = {
  debug: (msg, extra = {}) => {
    console.debug(`[DEBUG ${timestamp()}] ${msg}`, extra);
    sendRemoteLog('debug', msg, extra);
  },
  
  info: (msg, extra = {}) => {
    console.info(`[INFO  ${timestamp()}] ${msg}`, extra);
    sendRemoteLog('info', msg, extra);
  },
  
  warn: (msg, extra = {}) => {
    console.warn(`[WARN  ${timestamp()}] ${msg}`, extra);
    sendRemoteLog('warn', msg, extra);
  },
  
  error: (msg, error = null, extra = {}) => {
    const errorData = {
      ...extra,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };
    console.error(`[ERROR ${timestamp()}] ${msg}`, errorData);
    sendRemoteLog('error', msg, errorData);
  },
  
  // Method for wrapping async functions with error handling
  wrapAsync: (fn, context = 'Unknown') => {
    return async (...args) => {
      try {
        logger.debug(`Starting ${context}`, { args: args.length });
        const result = await fn(...args);
        logger.debug(`Completed ${context} successfully`);
        return result;
      } catch (error) {
        logger.error(`Failed in ${context}`, error, { args: args.length });
        throw error;
      }
    };
  },
  
  // Method for wrapping sync functions with error handling
  wrapSync: (fn, context = 'Unknown') => {
    return (...args) => {
      try {
        logger.debug(`Starting ${context}`, { args: args.length });
        const result = fn(...args);
        logger.debug(`Completed ${context} successfully`);
        return result;
      } catch (error) {
        logger.error(`Failed in ${context}`, error, { args: args.length });
        throw error;
      }
    };
  }
};