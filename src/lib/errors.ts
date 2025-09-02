/**
 * Centralized error handling system for the multisport application
 * Provides consistent error responses and logging across all API routes
 */

import { NextResponse } from "next/server";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): string {
    const codes: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "VALIDATION_ERROR",
      429: "RATE_LIMITED",
      500: "INTERNAL_SERVER_ERROR",
      503: "SERVICE_UNAVAILABLE",
    };
    return codes[statusCode] || "UNKNOWN_ERROR";
  }
}

// Specific error classes for common scenarios
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 422, "VALIDATION_ERROR");
    this.details = details;
  }
  public readonly details?: any;
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_REQUIRED");
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_REQUIRED");
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMITED");
  }
}

// Error response interface
export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  path?: string;
}

// Centralized error handler
export function handleApiError(error: unknown, path?: string): NextResponse {
  // Log the error for monitoring
  console.error("API Error:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    path,
    timestamp: new Date().toISOString(),
  });

  // Handle known API errors
  if (error instanceof ApiError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      path,
    };

    // Add details for validation errors
    if (error instanceof ValidationError && error.details) {
      response.details = error.details;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        return NextResponse.json(
          {
            error: "A record with this information already exists",
            code: "DUPLICATE_RECORD",
            timestamp: new Date().toISOString(),
            path,
          },
          { status: 409 }
        );

      case "P2025":
        return NextResponse.json(
          {
            error: "Record not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
            path,
          },
          { status: 404 }
        );

      case "P2003":
        return NextResponse.json(
          {
            error: "Invalid reference to related record",
            code: "INVALID_REFERENCE",
            timestamp: new Date().toISOString(),
            path,
          },
          { status: 400 }
        );

      default:
        console.error("Unhandled Prisma error:", prismaError);
        break;
    }
  }

  // Handle validation errors (Zod, etc.)
  if (error && typeof error === "object" && "issues" in error) {
    const validationError = error as any;
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: validationError.issues,
        timestamp: new Date().toISOString(),
        path,
      },
      { status: 422 }
    );
  }

  // Handle unexpected errors
  console.error("Unexpected error:", error);
  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      timestamp: new Date().toISOString(),
      path,
    },
    { status: 500 }
  );
}

// Success response helper
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// Pagination response helper
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
}
