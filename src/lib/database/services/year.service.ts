/**
 * Year database service
 * Handles all year-related database operations
 */

import { BaseService } from "./base.service";
import { NotFoundError, ConflictError } from "@/lib/errors";

export interface YearData {
  year: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateYearData {
  year?: number;
  description?: string;
  isActive?: boolean;
}

export class YearService extends BaseService {
  /**
   * Get all years ordered by year descending
   */
  async getAllYears() {
    return this.findMany("year", {
      orderBy: { year: "desc" },
    });
  }

  /**
   * Get year by ID
   */
  async getYearById(id: string) {
    const year = await this.findById("year", id);
    if (!year) {
      throw new NotFoundError("Year");
    }
    return year;
  }

  /**
   * Get active year
   */
  async getActiveYear() {
    return this.findMany("year", {
      where: { isActive: true },
      take: 1,
    }).then((years) => years[0] || null);
  }

  /**
   * Create a new year
   */
  async createYear(data: YearData) {
    // Check if year already exists
    const existingYear = await this.exists("year", { year: data.year });
    if (existingYear) {
      throw new ConflictError(`Year ${data.year} already exists`);
    }

    // If setting as active, deactivate all other years
    if (data.isActive) {
      await this.updateMany("year", { isActive: true }, { isActive: false });
    }

    return this.create("year", data);
  }

  /**
   * Update a year
   */
  async updateYear(id: string, data: UpdateYearData) {
    // Check if year exists
    await this.getYearById(id);

    // If setting as active, deactivate all other years
    if (data.isActive) {
      await this.updateMany("year", { isActive: true }, { isActive: false });
    }

    return this.updateById("year", id, data);
  }

  /**
   * Delete a year
   */
  async deleteYear(id: string) {
    const year = await this.getYearById(id);

    // Check if year is active
    if ((year as any).isActive) {
      throw new ConflictError("Cannot delete the currently active year");
    }

    // Check if year has associated data
    const [teamsCount, eventsCount, gamesCount] = await this.parallel([
      () => this.count("team", { year: (year as any).year }),
      () => this.count("event", { year: (year as any).year }),
      () => this.count("game", { year: (year as any).year }),
    ]);

    if (teamsCount > 0 || eventsCount > 0 || gamesCount > 0) {
      throw new ConflictError(
        "Cannot delete year - it contains teams, events, or games. Delete those first or move them to another year."
      );
    }

    await this.deleteById("year", id);
    return { message: "Year deleted successfully" };
  }

  /**
   * Get year statistics
   */
  async getYearStats(year: number) {
    const [teamsCount, eventsCount, gamesCount, activeYear] =
      await this.parallel([
        () => this.count("team", { year }),
        () => this.count("event", { year }),
        () => this.count("game", { year }),
        () => this.getActiveYear(),
      ]);

    return {
      year,
      teamsCount,
      eventsCount,
      gamesCount,
      isActive: (activeYear as any)?.year === year,
    };
  }

  /**
   * Set year as active
   */
  async setActiveYear(id: string) {
    await this.getYearById(id);

    // Deactivate all years
    await this.updateMany("year", { isActive: true }, { isActive: false });

    // Activate the specified year
    return this.updateById("year", id, { isActive: true });
  }
}
