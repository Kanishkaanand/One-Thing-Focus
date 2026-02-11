import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseUserProfile, parseEntries } from './validation';

export interface ReminderConfig {
  enabled: boolean;
  time: string;
}

export interface UserProfile {
  name: string;
  createdAt: string;
  currentLevel: 1 | 2 | 3;
  currentLevelStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  reminderEnabled: boolean;
  reminderTime: string;
  onboardingComplete: boolean;
  reminderPickTask: ReminderConfig;
  reminderCompleteTask: ReminderConfig;
}

export interface TaskItem {
  id: string;
  text: string;
  createdAt: string;
  completedAt?: string;
  proof?: {
    type: 'photo' | 'screenshot' | 'document';
    uri: string;
  };
  isCompleted: boolean;
}

export interface DailyEntry {
  date: string;
  tasks: TaskItem[];
  reflection?: {
    mood: 'energized' | 'calm' | 'neutral' | 'tough';
    note?: string;
  };
  completed: boolean;
  levelAtTime: 1 | 2 | 3;
  completionMessageIndex?: number;
  completionAnimationSeen?: boolean;
}

const PROFILE_KEY = '@onething_profile';
const ENTRIES_KEY = '@onething_entries';

const defaultProfile: UserProfile = {
  name: '',
  createdAt: new Date().toISOString(),
  currentLevel: 1,
  currentLevelStreak: 0,
  longestStreak: 0,
  totalTasksCompleted: 0,
  reminderEnabled: false,
  reminderTime: '09:00',
  onboardingComplete: false,
  reminderPickTask: {
    enabled: false,
    time: '08:00',
  },
  reminderCompleteTask: {
    enabled: false,
    time: '18:00',
  },
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    if (!data) return { ...defaultProfile };
    const parsed = JSON.parse(data);

    // Merge with defaults first to ensure all fields exist
    const merged = {
      ...defaultProfile,
      ...parsed,
      reminderPickTask: { ...defaultProfile.reminderPickTask, ...(parsed.reminderPickTask || {}) },
      reminderCompleteTask: { ...defaultProfile.reminderCompleteTask, ...(parsed.reminderCompleteTask || {}) },
    };

    // Validate with Zod schema
    const validated = parseUserProfile(merged);
    if (validated) {
      return validated;
    }

    // If validation fails, return merged data (backwards compatibility)
    console.warn('Profile validation failed, using merged defaults');
    return merged;
  } catch (e) {
    console.error('Failed to parse profile data:', e);
    return { ...defaultProfile };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getAllEntries(): Promise<Record<string, DailyEntry>> {
  try {
    const data = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);

    // Validate entries with Zod schema (filters out invalid entries)
    return parseEntries(parsed);
  } catch (e) {
    console.error('Failed to parse entries data:', e);
    return {};
  }
}

export async function getEntry(date: string): Promise<DailyEntry | null> {
  const entries = await getAllEntries();
  return entries[date] || null;
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const entries = await getAllEntries();
  entries[entry.date] = entry;
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

export function getStreakMessage(streak: number): string {
  if (streak === 0) return '';
  if (streak === 1) return 'And so it begins.';
  if (streak === 2) return 'Two days running. Keep it going.';
  if (streak === 3) return "Three days strong. You're finding your rhythm.";
  if (streak <= 6) return `${streak} days and counting. Consistency looks good on you.`;
  if (streak === 7) return "A whole week! You've earned this.";
  if (streak <= 13) return `${streak} days of showing up. That takes real commitment.`;
  if (streak === 14) return "Two weeks of showing up. That's not luck — that's you.";
  if (streak <= 29) return `${streak} days. You're building something real.`;
  if (streak === 30) return "30 days. You've built something real.";
  return `${streak} days. Extraordinary.`;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([PROFILE_KEY, ENTRIES_KEY]);
}

export async function processEndOfDay(profile: UserProfile, entries: Record<string, DailyEntry>): Promise<UserProfile> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const yesterdayEntry = entries[yesterdayStr];

  if (!yesterdayEntry) {
    if (profile.currentLevelStreak > 0) {
      const hasAnyPriorEntry = Object.keys(entries).some(d => d < yesterdayStr);
      if (hasAnyPriorEntry) {
        if (profile.currentLevel > 1) {
          return { ...profile, currentLevel: (profile.currentLevel - 1) as 1 | 2 | 3, currentLevelStreak: 0 };
        }
        return { ...profile, currentLevelStreak: 0 };
      }
    }
    return profile;
  }

  if (yesterdayEntry.tasks.length > 0 && !yesterdayEntry.completed) {
    if (profile.currentLevel > 1) {
      return { ...profile, currentLevel: (profile.currentLevel - 1) as 1 | 2 | 3, currentLevelStreak: 0 };
    }
    return { ...profile, currentLevelStreak: 0 };
  }

  return profile;
}

export function calculateCompletionRate(entries: Record<string, DailyEntry>): number {
  const entryList = Object.values(entries);
  if (entryList.length === 0) return 0;
  const completed = entryList.filter(e => e.completed).length;
  return Math.round((completed / entryList.length) * 100);
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}
