/**
 * Base database service class
 * Provides common database operations and query patterns
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export abstract class BaseService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  protected async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  /**
   * Execute multiple operations in parallel
   */
  protected async parallel<T extends readonly unknown[] | []>(operations: {
    [K in keyof T]: () => Promise<T[K]>;
  }): Promise<T> {
    return Promise.all(operations.map((op) => op())) as Promise<T>;
  }

  /**
   * Find a record by ID with error handling
   */
  protected async findById<T>(
    model: keyof PrismaClient,
    id: string,
    include?: any
  ): Promise<T | null> {
    const modelClient = this.prisma[model] as any;
    return modelClient.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Find many records with pagination
   */
  protected async findMany<T>(
    model: keyof PrismaClient,
    options: {
      where?: any;
      include?: any;
      select?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    } = {}
  ): Promise<T[]> {
    const modelClient = this.prisma[model] as any;
    return modelClient.findMany(options);
  }

  /**
   * Count records with optional where clause
   */
  protected async count(
    model: keyof PrismaClient,
    where?: any
  ): Promise<number> {
    const modelClient = this.prisma[model] as any;
    return modelClient.count({ where });
  }

  /**
   * Create a record with error handling
   */
  protected async create<T>(
    model: keyof PrismaClient,
    data: any,
    include?: any
  ): Promise<T> {
    const modelClient = this.prisma[model] as any;
    return modelClient.create({
      data,
      include,
    });
  }

  /**
   * Update a record by ID
   */
  protected async updateById<T>(
    model: keyof PrismaClient,
    id: string,
    data: any,
    include?: any
  ): Promise<T> {
    const modelClient = this.prisma[model] as any;
    return modelClient.update({
      where: { id },
      data,
      include,
    });
  }

  /**
   * Delete a record by ID
   */
  protected async deleteById(
    model: keyof PrismaClient,
    id: string
  ): Promise<void> {
    const modelClient = this.prisma[model] as any;
    await modelClient.delete({
      where: { id },
    });
  }

  /**
   * Update many records
   */
  protected async updateMany(
    model: keyof PrismaClient,
    where: any,
    data: any
  ): Promise<{ count: number }> {
    const modelClient = this.prisma[model] as any;
    return modelClient.updateMany({
      where,
      data,
    });
  }

  /**
   * Execute raw SQL query
   */
  protected async rawQuery<T = any>(query: string, params?: any[]): Promise<T> {
    return this.prisma.$queryRawUnsafe(query, ...(params || []));
  }

  /**
   * Check if a record exists
   */
  protected async exists(
    model: keyof PrismaClient,
    where: any
  ): Promise<boolean> {
    const modelClient = this.prisma[model] as any;
    const count = await modelClient.count({ where });
    return count > 0;
  }

  /**
   * Get pagination metadata
   */
  protected getPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
