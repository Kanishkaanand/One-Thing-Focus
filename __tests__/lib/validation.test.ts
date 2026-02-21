import {
  validateTaskInput,
  validateNameInput,
  validateNoteInput,
  parseUserProfile,
  parseEntries,
  UserProfileSchema,
  DailyEntrySchema,
} from '../../lib/validation';

describe('validateTaskInput', () => {
  it('should reject empty strings', () => {
    expect(validateTaskInput('')).toEqual({
      valid: false,
      error: 'Task cannot be empty',
    });
  });

  it('should reject whitespace-only strings', () => {
    expect(validateTaskInput('   ')).toEqual({
      valid: false,
      error: 'Task cannot be empty',
    });
  });

  it('should accept valid task text', () => {
    const result = validateTaskInput('Buy groceries');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Buy groceries');
  });

  it('should trim whitespace', () => {
    const result = validateTaskInput('  Buy groceries  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Buy groceries');
  });

  it('should reject text over 500 characters', () => {
    const longText = 'a'.repeat(501);
    expect(validateTaskInput(longText)).toEqual({
      valid: false,
      error: 'Task is too long (max 500 characters)',
    });
  });

  it('should accept text at exactly 500 characters', () => {
    const exactText = 'a'.repeat(500);
    const result = validateTaskInput(exactText);
    expect(result.valid).toBe(true);
  });

  it('should sanitize control characters', () => {
    const result = validateTaskInput('Buy\x00groceries\x1F');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Buygroceries');
  });
});

describe('validateNameInput', () => {
  it('should accept valid names', () => {
    const result = validateNameInput('John');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('John');
  });

  it('should accept empty names', () => {
    const result = validateNameInput('');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('');
  });

  it('should reject names over 50 characters', () => {
    const longName = 'a'.repeat(51);
    expect(validateNameInput(longName)).toEqual({
      valid: false,
      error: 'Name is too long (max 50 characters)',
    });
  });

  it('should sanitize control characters', () => {
    const result = validateNameInput('John\x00Doe');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('JohnDoe');
  });
});

describe('validateNoteInput', () => {
  it('should accept valid notes', () => {
    const result = validateNoteInput('Felt great today!');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Felt great today!');
  });

  it('should reject notes over 500 characters', () => {
    const longNote = 'a'.repeat(501);
    expect(validateNoteInput(longNote)).toEqual({
      valid: false,
      error: 'Note is too long (max 500 characters)',
    });
  });
});

describe('parseUserProfile', () => {
  const validProfile = {
    name: 'John',
    createdAt: '2024-01-01T00:00:00.000Z',
    currentLevel: 1 as const,
    currentLevelStreak: 5,
    longestStreak: 10,
    totalTasksCompleted: 50,
    reminderEnabled: true,
    reminderTime: '09:00',
    onboardingComplete: true,
    reminderPickTask: { enabled: true, time: '08:00' },
    reminderFocusNudge: { enabled: true },
    reminderWrapUp: { enabled: true, time: '19:00' },
  };

  it('should parse valid profile data', () => {
    const result = parseUserProfile(validProfile);
    expect(result).toEqual(validProfile);
  });

  it('should return null for invalid profile data', () => {
    const invalidProfile = { ...validProfile, currentLevel: 5 };
    const result = parseUserProfile(invalidProfile);
    expect(result).toBeNull();
  });

  it('should return null for missing required fields', () => {
    const incompleteProfile = { name: 'John' };
    const result = parseUserProfile(incompleteProfile);
    expect(result).toBeNull();
  });

  it('should reject negative streak values', () => {
    const invalidProfile = { ...validProfile, currentLevelStreak: -1 };
    const result = parseUserProfile(invalidProfile);
    expect(result).toBeNull();
  });
});

describe('parseEntries', () => {
  const validEntry = {
    date: '2024-01-15',
    tasks: [
      {
        id: '123',
        text: 'Buy groceries',
        createdAt: '2024-01-15T10:00:00.000Z',
        isCompleted: true,
        completedAt: '2024-01-15T15:00:00.000Z',
      },
    ],
    completed: true,
    levelAtTime: 1 as const,
  };

  it('should parse valid entries', () => {
    const entries = { '2024-01-15': validEntry };
    const result = parseEntries(entries);
    expect(result).toEqual(entries);
  });

  it('should filter out invalid entries', () => {
    const invalidEntry = { ...validEntry, completed: 'yes' }; // should be boolean
    const entries = {
      '2024-01-15': validEntry,
      '2024-01-16': invalidEntry,
    };
    const result = parseEntries(entries);
    expect(Object.keys(result)).toEqual(['2024-01-15']);
  });

  it('should return empty object for null input', () => {
    const result = parseEntries(null);
    expect(result).toEqual({});
  });

  it('should return empty object for non-object input', () => {
    const result = parseEntries('invalid');
    expect(result).toEqual({});
  });
});

describe('Zod Schemas', () => {
  describe('UserProfileSchema', () => {
    it('should only accept level 1, 2, or 3', () => {
      expect(UserProfileSchema.shape.currentLevel.safeParse(1).success).toBe(true);
      expect(UserProfileSchema.shape.currentLevel.safeParse(2).success).toBe(true);
      expect(UserProfileSchema.shape.currentLevel.safeParse(3).success).toBe(true);
      expect(UserProfileSchema.shape.currentLevel.safeParse(4).success).toBe(false);
      expect(UserProfileSchema.shape.currentLevel.safeParse(0).success).toBe(false);
    });
  });

  describe('DailyEntrySchema', () => {
    it('should accept valid mood values', () => {
      const validReflection = { mood: 'energized' as const };
      expect(DailyEntrySchema.shape.reflection.unwrap().safeParse(validReflection).success).toBe(true);
    });

    it('should reject invalid mood values', () => {
      const invalidReflection = { mood: 'happy' };
      expect(DailyEntrySchema.shape.reflection.unwrap().safeParse(invalidReflection).success).toBe(false);
    });
  });
});
