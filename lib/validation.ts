import { z } from 'zod';

// ============================================
// Zod Schemas for Data Validation
// ============================================

export const ReminderConfigSchema = z.object({
  enabled: z.boolean(),
  time: z.string(),
});

export const UserProfileSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
  currentLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  currentLevelStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  totalTasksCompleted: z.number().int().min(0),
  reminderEnabled: z.boolean(),
  reminderTime: z.string(),
  onboardingComplete: z.boolean(),
  reminderPickTask: ReminderConfigSchema,
  reminderCompleteTask: ReminderConfigSchema,
});

export const TaskProofSchema = z.object({
  type: z.enum(['photo', 'screenshot', 'document']),
  uri: z.string(),
});

export const TaskItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  proof: TaskProofSchema.optional(),
  isCompleted: z.boolean(),
});

export const ReflectionSchema = z.object({
  mood: z.enum(['energized', 'calm', 'neutral', 'tough']),
  note: z.string().optional(),
});

export const DailyEntrySchema = z.object({
  date: z.string(),
  tasks: z.array(TaskItemSchema),
  reflection: ReflectionSchema.optional(),
  completed: z.boolean(),
  levelAtTime: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  completionMessageIndex: z.number().optional(),
  completionAnimationSeen: z.boolean().optional(),
});

export const EntriesRecordSchema = z.record(z.string(), DailyEntrySchema);

// ============================================
// Input Validation
// ============================================

const MAX_TASK_LENGTH = 500;
const MAX_NAME_LENGTH = 50;
const MAX_NOTE_LENGTH = 500;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates and sanitizes task input text
 */
export function validateTaskInput(text: string): ValidationResult {
  const trimmed = text.trim();

  if (!trimmed) {
    return { valid: false, error: 'Task cannot be empty' };
  }

  if (trimmed.length > MAX_TASK_LENGTH) {
    return { valid: false, error: `Task is too long (max ${MAX_TASK_LENGTH} characters)` };
  }

  // Sanitize: remove control characters except newlines
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

/**
 * Validates and sanitizes user name input
 */
export function validateNameInput(text: string): ValidationResult {
  const trimmed = text.trim();

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name is too long (max ${MAX_NAME_LENGTH} characters)` };
  }

  // Sanitize: remove control characters
  const sanitized = trimmed.replace(/[\x00-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

/**
 * Validates and sanitizes reflection note input
 */
export function validateNoteInput(text: string): ValidationResult {
  const trimmed = text.trim();

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { valid: false, error: `Note is too long (max ${MAX_NOTE_LENGTH} characters)` };
  }

  // Sanitize: remove control characters except newlines
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

// ============================================
// Schema Validation Helpers
// ============================================

/**
 * Safely parses and validates a UserProfile
 * Returns the validated profile or null if invalid
 */
export function parseUserProfile(data: unknown): z.infer<typeof UserProfileSchema> | null {
  const result = UserProfileSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Invalid profile data:', result.error.issues);
  return null;
}

/**
 * Safely parses and validates entries record
 * Returns validated entries, filtering out invalid ones
 */
export function parseEntries(data: unknown): Record<string, z.infer<typeof DailyEntrySchema>> {
  if (typeof data !== 'object' || data === null) {
    return {};
  }

  const validEntries: Record<string, z.infer<typeof DailyEntrySchema>> = {};

  for (const [key, value] of Object.entries(data)) {
    const result = DailyEntrySchema.safeParse(value);
    if (result.success) {
      validEntries[key] = result.data;
    } else {
      console.warn(`Invalid entry for date ${key}:`, result.error.issues);
    }
  }

  return validEntries;
}
