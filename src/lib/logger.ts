/**
 * Structured Logging Utility
 *
 * Provides consistent logging with context and levels
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  service?: string
  requestId?: string
  userId?: string
  brandId?: string
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  error?: any
}

class Logger {
  private context: LogContext = {}
  private minLevel: LogLevel = LogLevel.INFO

  constructor() {
    // Set min level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase()
    if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
      this.minLevel = envLevel as LogLevel
    }
  }

  /**
   * Set global context for all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger()
    childLogger.setContext({ ...this.context, ...context })
    childLogger.minLevel = this.minLevel
    return childLogger
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log an error
   */
  error(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, { ...context, error })
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...context },
      timestamp: new Date().toISOString(),
    }

    if (context?.error) {
      entry.error = this.serializeError(context.error)
    }

    // In production, this would go to a structured logging service
    // (e.g., Winston, Pino, or cloud logging)
    const formatted = this.format(entry)
    this.output(level, formatted)
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const minIndex = levels.indexOf(this.minLevel)
    const levelIndex = levels.indexOf(level)
    return levelIndex >= minIndex
  }

  /**
   * Format log entry
   */
  private format(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // JSON format for production
      return JSON.stringify(entry)
    } else {
      // Human-readable format for development
      const icon = this.getIcon(entry.level)
      const contextStr = Object.keys(entry.context || {}).length > 0
        ? ` ${JSON.stringify(entry.context)}`
        : ''

      return `${icon} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`
    }
  }

  /**
   * Output log entry to appropriate stream
   */
  private output(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.ERROR:
        console.error(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      default:
        console.log(message)
    }
  }

  /**
   * Serialize error object
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any), // Capture additional properties
      }
    }
    return error
  }

  /**
   * Get icon for log level
   */
  private getIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍'
      case LogLevel.INFO:
        return 'ℹ️'
      case LogLevel.WARN:
        return '⚠️'
      case LogLevel.ERROR:
        return '❌'
    }
  }
}

// Global logger instance
export const logger = new Logger()

// Set service context
logger.setContext({ service: 'sns-content-autopilot' })
