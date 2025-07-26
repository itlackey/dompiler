/**
 * Simple logging utility for dompile
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL ? 
      LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO : 
      LOG_LEVELS.INFO;
  }
  
  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug('🐛', ...args);
    }
  }
  
  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log('ℹ️ ', ...args);
    }
  }
  
  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn('⚠️ ', ...args);
    }
  }
  
  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error('❌', ...args);
    }
  }
  
  success(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log('✅', ...args);
    }
  }
}

export const logger = new Logger();