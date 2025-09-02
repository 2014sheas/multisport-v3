/**
 * Centralized validation schemas using Zod
 * Provides type-safe validation for all API endpoints
 */

import { z } from "zod";

// Re-export z for convenience
export { z };

// Common validation patterns
const cuidSchema = z.string().cuid();
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(6).max(100);
const nameSchema = z.string().min(1).max(100).trim();
const yearSchema = z.number().int().min(2000).max(2100);
const eloRatingSchema = z.number().int().min(0).max(9999);
const positiveIntSchema = z.number().int().min(0);
const optionalPositiveIntSchema = z.number().int().min(0).optional();

// User schemas
export const CreateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const UpdateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  isAdmin: z.boolean().optional(),
  isScorekeeper: z.boolean().optional(),
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

// Player schemas
export const CreatePlayerSchema = z.object({
  name: nameSchema,
  eloRating: eloRatingSchema.optional().default(5000),
  experience: optionalPositiveIntSchema,
  wins: optionalPositiveIntSchema,
  isActive: z.boolean().optional().default(true),
});

export const UpdatePlayerSchema = z.object({
  name: nameSchema.optional(),
  eloRating: eloRatingSchema.optional(),
  experience: optionalPositiveIntSchema,
  wins: optionalPositiveIntSchema,
  isActive: z.boolean().optional(),
});

// Team schemas
export const CreateTeamSchema = z.object({
  name: nameSchema,
  captainId: cuidSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default("#3B82F6"),
  abbreviation: z.string().min(1).max(10).optional(),
  logo: z.string().url().optional(),
  year: yearSchema.optional().default(new Date().getFullYear()),
});

export const UpdateTeamSchema = z.object({
  name: nameSchema.optional(),
  captainId: cuidSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  abbreviation: z.string().min(1).max(10).optional(),
  logo: z.string().url().optional(),
  year: yearSchema.optional(),
});

// Event schemas
export const CreateEventSchema = z.object({
  name: nameSchema,
  abbreviation: z.string().min(1).max(20),
  eventType: z.enum(["TOURNAMENT", "SCORED", "COMBINED_TEAM"]),
  location: z.string().max(255).optional(),
  points: z.array(z.number().int().min(0)).optional(),
  startTime: z.string().datetime().optional(),
  duration: positiveIntSchema.optional(),
  year: yearSchema.optional().default(new Date().getFullYear()),
});

export const UpdateEventSchema = z.object({
  name: nameSchema.optional(),
  abbreviation: z.string().min(1).max(20).optional(),
  eventType: z.enum(["TOURNAMENT", "SCORED", "COMBINED_TEAM"]).optional(),
  location: z.string().max(255).optional(),
  points: z.array(z.number().int().min(0)).optional(),
  startTime: z.string().datetime().optional(),
  duration: positiveIntSchema.optional(),
  status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED"]).optional(),
  finalStandings: z.array(z.string()).optional(),
  combinedTeamData: z.record(z.string(), z.any()).optional(),
});

// Game schemas
export const CreateGameSchema = z.object({
  eventId: cuidSchema,
  team1Id: cuidSchema.optional(),
  team2Id: cuidSchema.optional(),
  team1Score: positiveIntSchema.optional(),
  team2Score: positiveIntSchema.optional(),
  status: z
    .enum([
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "UNDETERMINED",
    ])
    .optional()
    .default("SCHEDULED"),
  scheduledTime: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  year: yearSchema.optional().default(new Date().getFullYear()),
});

export const UpdateGameSchema = z.object({
  team1Id: cuidSchema.optional(),
  team2Id: cuidSchema.optional(),
  team1Score: positiveIntSchema.optional(),
  team2Score: positiveIntSchema.optional(),
  status: z
    .enum([
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "UNDETERMINED",
    ])
    .optional(),
  scheduledTime: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
});

// Year schemas
export const CreateYearSchema = z.object({
  year: yearSchema,
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(false),
});

export const UpdateYearSchema = z.object({
  year: yearSchema.optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Vote schemas
export const CreateVoteSchema = z
  .object({
    keepId: cuidSchema,
    tradeId: cuidSchema,
    cutId: cuidSchema,
    eventId: cuidSchema,
    voterSession: z.string().min(1).max(100),
  })
  .refine(
    (data) =>
      data.keepId !== data.tradeId &&
      data.keepId !== data.cutId &&
      data.tradeId !== data.cutId,
    {
      message: "All three players must be different",
      path: ["keepId", "tradeId", "cutId"],
    }
  );

// Team member schemas
export const AddTeamMemberSchema = z.object({
  playerId: cuidSchema,
  teamId: cuidSchema,
  year: yearSchema.optional().default(new Date().getFullYear()),
});

export const RemoveTeamMemberSchema = z.object({
  playerId: cuidSchema,
  teamId: cuidSchema,
});

// Tournament schemas
export const GenerateBracketSchema = z.object({
  eventId: cuidSchema,
  seeds: z
    .array(
      z.object({
        teamId: cuidSchema,
        seed: z.number().int().min(1),
      })
    )
    .min(2),
});

export const UpdateMatchSchema = z.object({
  matchId: cuidSchema,
  winnerId: cuidSchema.optional(),
  score: z.record(z.string(), z.any()).optional(),
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.string().transform((val) => Math.max(1, parseInt(val) || 1)),
  limit: z
    .string()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val) || 20))),
});

export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const SearchSchema = z.object({
  search: z.string().optional(),
});

// Combined query schemas
export const ListQuerySchema =
  PaginationSchema.merge(SortSchema).merge(SearchSchema);

// Profile update schema
export const UpdateProfileSchema = z.object({
  experience: z
    .string()
    .transform((val) => (val === "" ? null : parseInt(val)))
    .pipe(z.number().int().min(0).max(50).nullable())
    .optional(),
  wins: z
    .string()
    .transform((val) => (val === "" ? null : parseInt(val)))
    .pipe(z.number().int().min(0).nullable())
    .optional(),
});

// Type exports for use in API handlers
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type UpdateGameInput = z.infer<typeof UpdateGameSchema>;
export type CreateYearInput = z.infer<typeof CreateYearSchema>;
export type UpdateYearInput = z.infer<typeof UpdateYearSchema>;
export type CreateVoteInput = z.infer<typeof CreateVoteSchema>;
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberSchema>;
export type RemoveTeamMemberInput = z.infer<typeof RemoveTeamMemberSchema>;
export type GenerateBracketInput = z.infer<typeof GenerateBracketSchema>;
export type UpdateMatchInput = z.infer<typeof UpdateMatchSchema>;
export type ListQueryInput = z.infer<typeof ListQuerySchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
