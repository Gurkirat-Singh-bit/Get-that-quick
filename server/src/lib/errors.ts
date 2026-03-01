/**
 * @fileoverview Error handling utilities for consistent error responses.
 *
 * Provides standardized error handling patterns to reduce code duplication
 * across route handlers and services.
 *
 * @module lib/errors
 */

/**
 * Custom error class for API responses.
 * Use this to throw errors that should be returned to the client.
 */
export class ApiError extends Error {
  /** HTTP status code for this error. */
  public readonly statusCode: number;

  /**
   * @param message - Human-readable error message.
   * @param statusCode - HTTP status code (default: 500).
   */
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/**
 * Extract a clean error message from an unknown error value.
 * Handles Error instances, strings, and other types safely.
 *
 * @param err - The error value (unknown type from catch block).
 * @returns A clean error message string.
 *
 * @example
 * ```ts
 * try {
 *   await somethingRisky();
 * } catch (err) {
 *   const message = extractErrorMessage(err);
 *   return c.json({ ok: false, error: message }, 500);
 * }
 * ```
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return String(err);
}

/**
 * Create a standardized error response object.
 * Use this for consistent error responses across all API endpoints.
 *
 * @param message - Human-readable error message.
 * @param details - Optional additional error details.
 * @returns Error response object matching ApiError interface.
 *
 * @example
 * ```ts
 * return c.json(errorResponse("Template not found"), 404);
 * ```
 */
export function errorResponse(message: string, details?: unknown) {
  const response: { ok: false; error: string; details?: unknown } = {
    ok: false,
    error: message,
  };
  if (details !== undefined) {
    response.details = details;
  }
  return response;
}

/**
 * Create a standardized success response object.
 * Use this for consistent success responses across all API endpoints.
 *
 * @param data - Response payload data.
 * @returns Success response object matching ApiResponse interface.
 *
 * @example
 * ```ts
 * return c.json(successResponse(session), 201);
 * ```
 */
export function successResponse<T>(data: T) {
  return {
    ok: true as const,
    data,
  };
}

/**
 * Wrap an async function with standardized error handling.
 * Catches errors and converts them to appropriate HTTP responses.
 *
 * @param handler - The async function to wrap.
 * @returns A wrapped function that handles errors automatically.
 *
 * @example
 * ```ts
 * app.get("/sessions/:id", withErrorHandling(async (c) => {
 *   const session = await getSession(c.req.param("id"));
 *   if (!session) throw new ApiError("Not found", 404);
 *   return c.json(successResponse(session));
 * }));
 * ```
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        const c = args[0]; // Hono context is always first arg
        return c.json(errorResponse(err.message), err.statusCode);
      }
      const message = extractErrorMessage(err);
      const c = args[0];
      return c.json(errorResponse(message), 500);
    }
  }) as T;
}
