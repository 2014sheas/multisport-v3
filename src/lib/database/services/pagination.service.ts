/**
 * Pagination service
 * Provides standardized pagination patterns and utilities
 */

import { NextRequest } from "next/server";
import { createPaginatedResponse } from "@/lib/errors";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: PaginationResult;
  total: number;
}

export class PaginationService {
  /**
   * Parse pagination parameters from request
   */
  static parsePaginationParams(
    request: NextRequest,
    options: PaginationOptions = {}
  ): {
    page: number;
    limit: number;
    offset: number;
  } {
    const { maxLimit = 100, defaultLimit = 20 } = options;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      maxLimit,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || defaultLimit.toString())
      )
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Parse sorting parameters from request
   */
  static parseSortParams(
    request: NextRequest,
    defaultSort: string = "createdAt",
    allowedSortFields: string[] = []
  ): {
    sortBy: string;
    sortOrder: "asc" | "desc";
  } {
    const { searchParams } = new URL(request.url);
    let sortBy = searchParams.get("sortBy") || defaultSort;
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    // Validate sort field if allowed fields are specified
    if (allowedSortFields.length > 0 && !allowedSortFields.includes(sortBy)) {
      sortBy = defaultSort;
    }

    return { sortBy, sortOrder };
  }

  /**
   * Parse search parameters from request
   */
  static parseSearchParams(request: NextRequest): {
    search?: string;
    filters: Record<string, any>;
  } {
    const { searchParams } = new URL(request.url);
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

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    page: number,
    limit: number,
    total: number
  ): PaginationResult {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      page,
      limit,
      offset: (page - 1) * limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    const pagination = this.calculatePagination(page, limit, total);
    return createPaginatedResponse(data, page, limit, total);
  }

  /**
   * Build Prisma orderBy clause from sort parameters
   */
  static buildOrderByClause(
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): Record<string, "asc" | "desc"> {
    return { [sortBy]: sortOrder };
  }

  /**
   * Build Prisma where clause for search
   */
  static buildSearchWhereClause(
    searchTerm: string,
    searchFields: string[],
    additionalFilters: Record<string, any> = {}
  ): any {
    if (!searchTerm) {
      return additionalFilters;
    }

    const searchConditions = searchFields.map((field) => ({
      [field]: { contains: searchTerm, mode: "insensitive" as const },
    }));

    return {
      ...additionalFilters,
      OR: searchConditions,
    };
  }

  /**
   * Optimize count query for large datasets
   * Returns estimated count when exact count is not needed
   */
  static async getOptimizedCount(
    countFunction: () => Promise<number>,
    dataLength: number,
    limit: number,
    page: number
  ): Promise<number> {
    // If we got fewer results than the limit, we know the exact total
    if (dataLength < limit) {
      return (page - 1) * limit + dataLength;
    }

    // Otherwise, get the exact count
    return await countFunction();
  }

  /**
   * Create pagination metadata for API responses
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const pagination = this.calculatePagination(page, limit, total);

    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePaginationParams(
    page: number,
    limit: number,
    maxLimit: number = 100
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push("Page must be greater than 0");
    }

    if (limit < 1) {
      errors.push("Limit must be greater than 0");
    }

    if (limit > maxLimit) {
      errors.push(`Limit cannot exceed ${maxLimit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get pagination parameters with validation
   */
  static getValidatedPaginationParams(
    request: NextRequest,
    options: PaginationOptions = {}
  ): {
    page: number;
    limit: number;
    offset: number;
    isValid: boolean;
    errors: string[];
  } {
    const { page, limit, offset } = this.parsePaginationParams(
      request,
      options
    );
    const validation = this.validatePaginationParams(
      page,
      limit,
      options.maxLimit
    );

    return {
      page,
      limit,
      offset,
      isValid: validation.isValid,
      errors: validation.errors,
    };
  }
}
