import {
  getTodayDate,
  getGreeting,
  formatDate,
  getStreakMessage,
  generateId,
  calculateCompletionRate,
  formatTime12h,
  processEndOfDay,
  UserProfile,
  DailyEntry,
} from '../../lib/storage';

describe('getTodayDate', () => {
  it('should return date in YYYY-MM-DD format', () => {
    const result = getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should pad single-digit months and days', () => {
    // Mock date to January 5th
    const mockDate = new Date(2024, 0, 5); // January 5, 2024
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const result = getTodayDate();
    expect(result).toBe('2024-01-05');

    jest.restoreAllMocks();
  });
});

describe('getGreeting', () => {
  it('should return "Good morning" before noon', () => {
    const mockDate = new Date();
    mockDate.setHours(9, 0, 0);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    expect(getGreeting()).toBe('Good morning');

    jest.restoreAllMocks();
  });

  it('should return "Good afternoon" between noon and 5pm', () => {
    const mockDate = new Date();
    mockDate.setHours(14, 0, 0);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    expect(getGreeting()).toBe('Good afternoon');

    jest.restoreAllMocks();
  });

  it('should return "Good evening" after 5pm', () => {
    const mockDate = new Date();
    mockDate.setHours(19, 0, 0);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    expect(getGreeting()).toBe('Good evening');

    jest.restoreAllMocks();
  });
});

describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate('2024-01-15')).toBe('Monday, 15 January');
  });

  it('should handle different months', () => {
    expect(formatDate('2024-12-25')).toBe('Wednesday, 25 December');
  });
});

describe('getStreakMessage', () => {
  it('should return empty string for streak of 0', () => {
    expect(getStreakMessage(0)).toBe('');
  });

  it('should return message for streak of 1', () => {
    expect(getStreakMessage(1)).toBe('And so it begins.');
  });

  it('should return message for streak of 7', () => {
    expect(getStreakMessage(7)).toBe("A whole week! You've earned this.");
  });

  it('should return special message for streak of 30', () => {
    expect(getStreakMessage(30)).toBe("30 days. You've built something real.");
  });

  it('should return extraordinary message for streak over 30', () => {
    expect(getStreakMessage(100)).toContain('Extraordinary');
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate string IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should generate unique IDs each time', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();

    // Each ID should be unique
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

describe('calculateCompletionRate', () => {
  it('should return 0 for empty entries', () => {
    expect(calculateCompletionRate({})).toBe(0);
  });

  it('should calculate 100% for all completed entries', () => {
    const entries: Record<string, DailyEntry> = {
      '2024-01-15': {
        date: '2024-01-15',
        tasks: [],
        completed: true,
        levelAtTime: 1,
      },
      '2024-01-16': {
        date: '2024-01-16',
        tasks: [],
        completed: true,
        levelAtTime: 1,
      },
    };
    expect(calculateCompletionRate(entries)).toBe(100);
  });

  it('should calculate 50% for half completed entries', () => {
    const entries: Record<string, DailyEntry> = {
      '2024-01-15': {
        date: '2024-01-15',
        tasks: [],
        completed: true,
        levelAtTime: 1,
      },
      '2024-01-16': {
        date: '2024-01-16',
        tasks: [],
        completed: false,
        levelAtTime: 1,
      },
    };
    expect(calculateCompletionRate(entries)).toBe(50);
  });

  it('should round to nearest integer', () => {
    const entries: Record<string, DailyEntry> = {
      '2024-01-15': { date: '2024-01-15', tasks: [], completed: true, levelAtTime: 1 },
      '2024-01-16': { date: '2024-01-16', tasks: [], completed: true, levelAtTime: 1 },
      '2024-01-17': { date: '2024-01-17', tasks: [], completed: false, levelAtTime: 1 },
    };
    // 2/3 = 66.67% -> rounds to 67
    expect(calculateCompletionRate(entries)).toBe(67);
  });
});

describe('formatTime12h', () => {
  it('should format morning times correctly', () => {
    expect(formatTime12h('09:30')).toBe('9:30 AM');
  });

  it('should format afternoon times correctly', () => {
    expect(formatTime12h('14:30')).toBe('2:30 PM');
  });

  it('should handle noon correctly', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
  });

  it('should handle midnight correctly', () => {
    expect(formatTime12h('00:30')).toBe('12:30 AM');
  });

  it('should handle 11pm correctly', () => {
    expect(formatTime12h('23:45')).toBe('11:45 PM');
  });
});

describe('processEndOfDay', () => {
  const baseProfile: UserProfile = {
    name: 'Test',
    createdAt: '2024-01-01T00:00:00.000Z',
    currentLevel: 2,
    currentLevelStreak: 5,
    longestStreak: 10,
    totalTasksCompleted: 50,
    reminderEnabled: false,
    reminderTime: '09:00',
    onboardingComplete: true,
    reminderPickTask: { enabled: false, time: '08:00' },
    reminderFocusNudge: { enabled: false },
    reminderWrapUp: { enabled: false, time: '19:00' },
  };

  it('should return unchanged profile if yesterday has no entry and no prior entries', async () => {
    const result = await processEndOfDay(baseProfile, {});
    expect(result).toEqual(baseProfile);
  });

  it('should reset streak if yesterday was incomplete with tasks', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const entries: Record<string, DailyEntry> = {
      [yesterdayStr]: {
        date: yesterdayStr,
        tasks: [{ id: '1', text: 'Task', createdAt: '', isCompleted: false }],
        completed: false,
        levelAtTime: 2,
      },
    };

    const result = await processEndOfDay(baseProfile, entries);
    expect(result.currentLevelStreak).toBe(0);
    expect(result.currentLevel).toBe(1); // Should drop a level
  });

  it('should not change level if already at level 1', async () => {
    const level1Profile = { ...baseProfile, currentLevel: 1 as const };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const entries: Record<string, DailyEntry> = {
      [yesterdayStr]: {
        date: yesterdayStr,
        tasks: [{ id: '1', text: 'Task', createdAt: '', isCompleted: false }],
        completed: false,
        levelAtTime: 1,
      },
    };

    const result = await processEndOfDay(level1Profile, entries);
    expect(result.currentLevel).toBe(1);
    expect(result.currentLevelStreak).toBe(0);
  });
});
