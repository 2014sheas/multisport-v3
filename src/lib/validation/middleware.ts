/**
 * Validation middleware for API routes
 * Integrates Zod schemas with our error handling system
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema } from "zod";
import { ValidationError } from "@/lib/errors";
import { withErrorHandling } from "@/lib/api-handler";

// Validation middleware for request body
export function withValidation<T>(
  schema: ZodSchema<T>,
  options: {
    path?: string;
    transform?: boolean;
  } = {}
) {
  return (
    handler: (data: T, request: NextRequest, context?: any) => Promise<any>
  ) => {
    return withErrorHandling(async (request: NextRequest, context?: any) => {
      let body: any;

      try {
        const contentType = request.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          body = await request.json();
        } else if (contentType?.includes("multipart/form-data")) {
          const formData = await request.formData();
          body = Object.fromEntries(formData.entries());
        } else if (contentType?.includes("application/x-www-form-urlencoded")) {
          const formData = await request.formData();
          body = Object.fromEntries(formData.entries());
        } else {
          throw new ValidationError("Unsupported content type");
        }
      } catch (error) {
        throw new ValidationError("Invalid request body");
      }

      // Parse and validate the data
      const result = schema.safeParse(body);

      if (!result.success) {
        throw new ValidationError("Validation failed", result.error.issues);
      }

      return handler(result.data, request, context);
    }, options.path);
  };
}

// Validation middleware for query parameters
export function withQueryValidation<T>(
  schema: ZodSchema<T>,
  options: {
    path?: string;
  } = {}
) {
  return (
    handler: (query: T, request: NextRequest, context?: any) => Promise<any>
  ) => {
    return withErrorHandling(async (request: NextRequest, context?: any) => {
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());

      const result = schema.safeParse(queryParams);

      if (!result.success) {
        throw new ValidationError(
          "Invalid query parameters",
          result.error.issues
        );
      }

      return handler(result.data, request, context);
    }, options.path);
  };
}

// Validation middleware for route parameters
export function withParamsValidation<T>(
  schema: ZodSchema<T>,
  options: {
    path?: string;
  } = {}
) {
  return (
    handler: (params: T, request: NextRequest, context?: any) => Promise<any>
  ) => {
    return withErrorHandling(async (request: NextRequest, context?: any) => {
      if (!context?.params) {
        throw new ValidationError("Route parameters not found");
      }

      const params = await context.params;
      const result = schema.safeParse(params);

      if (!result.success) {
        throw new ValidationError(
          "Invalid route parameters",
          result.error.issues
        );
      }

      return handler(result.data, request, context);
    }, options.path);
  };
}

// Combined validation middleware
export function withFullValidation<TBody, TQuery, TParams>(
  schemas: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
  },
  options: {
    path?: string;
  } = {}
) {
  return (
    handler: (
      data: {
        body?: TBody;
        query?: TQuery;
        params?: TParams;
      },
      request: NextRequest,
      context?: any
    ) => Promise<any>
  ) => {
    return withErrorHandling(async (request: NextRequest, context?: any) => {
      const validatedData: any = {};

      // Validate body
      if (schemas.body) {
        let body: any;

        try {
          const contentType = request.headers.get("content-type");

          if (contentType?.includes("application/json")) {
            body = await request.json();
          } else if (contentType?.includes("multipart/form-data")) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
          } else if (
            contentType?.includes("application/x-www-form-urlencoded")
          ) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
          } else {
            throw new ValidationError("Unsupported content type");
          }
        } catch (error) {
          throw new ValidationError("Invalid request body");
        }

        const bodyResult = schemas.body.safeParse(body);
        if (!bodyResult.success) {
          throw new ValidationError(
            "Request body validation failed",
            bodyResult.error.issues
          );
        }
        validatedData.body = bodyResult.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        const queryResult = schemas.query.safeParse(queryParams);
        if (!queryResult.success) {
          throw new ValidationError(
            "Query parameters validation failed",
            queryResult.error.issues
          );
        }
        validatedData.query = queryResult.data;
      }

      // Validate route parameters
      if (schemas.params) {
        if (!context?.params) {
          throw new ValidationError("Route parameters not found");
        }

        const params = await context.params;
        const paramsResult = schemas.params.safeParse(params);
        if (!paramsResult.success) {
          throw new ValidationError(
            "Route parameters validation failed",
            paramsResult.error.issues
          );
        }
        validatedData.params = paramsResult.data;
      }

      return handler(validatedData, request, context);
    }, options.path);
  };
}

// Helper function to create custom validation schemas
export function createCustomSchema<T>(schema: ZodSchema<T>) {
  return schema;
}

// Helper function to validate data outside of middleware
export function validateData<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.issues);
  }

  return result.data;
}

// Helper function to safely parse data (returns null on validation failure)
export function safeValidateData<T>(
  schema: ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
