/**
 * Custom error classes for dompile
 * Provides specific error types for different failure scenarios
 */

/**
 * Base error class for dompile errors
 */
export class VanillaWaferError extends Error {
  constructor(message, filePath = null, lineNumber = null) {
    super(message);
    this.name = this.constructor.name;
    this.filePath = filePath;
    this.lineNumber = lineNumber;
    
    // Include file context in message if available
    if (filePath) {
      const location = lineNumber ? `${filePath}:${lineNumber}` : filePath;
      this.message = `${message} in ${location}`;
    }
  }
}

/**
 * Error thrown when an include file is not found
 */
export class IncludeNotFoundError extends VanillaWaferError {
  constructor(includePath, parentFile) {
    super(`Include file not found: ${includePath}`, parentFile);
    this.includePath = includePath;
    this.parentFile = parentFile;
  }
}

/**
 * Error thrown when a circular dependency is detected in includes
 */
export class CircularDependencyError extends VanillaWaferError {
  constructor(filePath, dependencyChain) {
    const chain = dependencyChain.join(' → ');
    super(`Circular dependency detected: ${chain} → ${filePath}`, filePath);
    this.dependencyChain = dependencyChain;
  }
}

/**
 * Error thrown when a path escapes the source directory (security)
 */
export class PathTraversalError extends VanillaWaferError {
  constructor(attemptedPath, sourceRoot) {
    super(`Path traversal attempt blocked: ${attemptedPath} (source root: ${sourceRoot})`);
    this.attemptedPath = attemptedPath;
    this.sourceRoot = sourceRoot;
  }
}

/**
 * Error thrown when include directive syntax is malformed
 */
export class MalformedDirectiveError extends VanillaWaferError {
  constructor(directive, filePath, lineNumber) {
    super(`Malformed include directive: ${directive}`, filePath, lineNumber);
    this.directive = directive;
  }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends VanillaWaferError {
  constructor(operation, filePath, originalError) {
    super(`File system error during ${operation}: ${originalError.message}`, filePath);
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when CLI arguments are invalid
 */
export class InvalidArgumentError extends VanillaWaferError {
  constructor(argument, value, reason) {
    super(`Invalid argument ${argument}: ${value} (${reason})`);
    this.argument = argument;
    this.value = value;
    this.reason = reason;
  }
}

/**
 * Error thrown when build process fails
 */
export class BuildError extends VanillaWaferError {
  constructor(message, cause = null) {
    super(`Build failed: ${message}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when development server fails to start
 */
export class ServerError extends VanillaWaferError {
  constructor(message, port = null) {
    super(`Server error: ${message}`);
    this.port = port;
  }
}