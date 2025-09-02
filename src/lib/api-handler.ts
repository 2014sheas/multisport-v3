/**
 * API Handler utilities for consistent request/response patterns
 * Provides error handling, validation, and response formatting
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError, createSuccessResponse } from "./errors";

// Generic API handler type
export type ApiHandler<T = any> = (
  request: NextRequest,
  context?: any
) => Promise<T>;

// Wrapper for API route handlers with automatic error handling
export function withErrorHandling<T>(handler: ApiHandler<T>, path?: string) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const result = await handler(request, context);

      // If handler returns a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result;
      }

      // Otherwise, wrap in success response
      return createSuccessResponse(result);
    } catch (error) {
      return handleApiError(error, path);
    }
  };
}

// Enhanced API handler with request context
export function createApiHandler<T = any>(
  handler: (request: NextRequest, context: any) => Promise<T>,
  options: {
    path?: string;
    method?: string;
  } = {}
) {
  return withErrorHandling(async (request: NextRequest, context: any) => {
    // Add method validation if specified
    if (options.method && request.method !== options.method) {
      throw new Error(`Method ${request.method} not allowed`);
    }

    return handler(request, context);
  }, options.path);
}

// Helper to extract and validate route parameters
export function getRouteParams<T extends Record<string, string>>(context: {
  params: Promise<T>;
}): Promise<T> {
  return context.params;
}

// Helper to parse and validate query parameters
export function getQueryParams(request: NextRequest): URLSearchParams {
  return new URL(request.url).searchParams;
}

// Helper to parse request body with error handling
export async function getRequestBody<T = any>(
  request: NextRequest
): Promise<T> {
  try {
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return await request.json();
    }

    if (contentType?.includes("multipart/form-data")) {
      return (await request.formData()) as any;
    }

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      const result: any = {};
      for (const [key, value] of formData.entries()) {
        result[key] = value;
      }
      return result;
    }

    throw new Error("Unsupported content type");
  } catch (error) {
    throw new Error("Invalid request body");
  }
}

// Helper to get pagination parameters
export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  offset: number;
} {
  const searchParams = getQueryParams(request);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20"))
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Helper to get sorting parameters
export function getSortParams(
  request: NextRequest,
  defaultSort: string = "createdAt"
): {
  sortBy: string;
  sortOrder: "asc" | "desc";
} {
  const searchParams = getQueryParams(request);
  const sortBy = searchParams.get("sortBy") || defaultSort;
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  return { sortBy, sortOrder };
}

// Helper to get search parameters
export function getSearchParams(request: NextRequest): {
  search?: string;
  filters: Record<string, any>;
} {
  const searchParams = getQueryParams(request);
  const search = searchParams.get("search") || undefined;

  const filters: Record<string, any> = {};
  for (const [key, value] of searchParams.entries()) {
    if (
      key !== "search" &&
      key !== "page" &&
      key !== "limit" &&
      key !== "sortBy" &&
      key !== "sortOrder"
    ) {
      filters[key] = value;
    }
  }

  return { search, filters };
}
