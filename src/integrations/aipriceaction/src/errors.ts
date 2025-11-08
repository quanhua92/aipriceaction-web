/**
 * Custom error classes for AIPriceAction SDK
 */

/**
 * Base error class for all SDK errors
 */
export class AIPriceActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIPriceActionError";
    Object.setPrototypeOf(this, AIPriceActionError.prototype);
  }
}

/**
 * Network-related errors (connection failures, timeouts)
 */
export class NetworkError extends AIPriceActionError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * API errors (4xx, 5xx responses)
 */
export class APIError extends AIPriceActionError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = "APIError";
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Validation errors (invalid parameters)
 */
export class ValidationError extends AIPriceActionError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Rate limit errors (429 responses)
 */
export class RateLimitError extends APIError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, 429);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
