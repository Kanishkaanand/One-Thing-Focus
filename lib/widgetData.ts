import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, DailyEntry } from './storage';
import { createLogger } from './errorReporting';

const logger = createLogger('WidgetData');

const WIDGET_TIP_SHOWN_KEY = '@onething_widget_tip_shown';

interface WidgetPayload {
  taskText: string;
  isCompleted: boolean;
  allCompleted: boolean;
  totalTasks: number;
  completedTasks: number;
  streak: number;
  level: number;
  encouragingMessage: string;
  hasTask: boolean;
}

const noTaskMessages = [
  "What's your one thing today?",
  "Start small, start now",
  "Pick one thing that matters",
  "Today is a fresh start",
  "One task. Full focus. Let's go",
];

const inProgressMessages = [
  "You've got this! Stay focused",
  "One step at a time",
  "Keep going, you're doing great",
  "Focus on progress, not perfection",
  "Almost there — stay with it",
  "You chose this. Now own it",
];

const completedMessages = [
  "You did it! Rest up",
  "Another day conquered",
  "Well done — you showed up today",
  "Mission accomplished",
  "That's how it's done",
  "Take a breath. You earned it",
];

const streakMessages: Record<string, string[]> = {
  short: [
    "Keep the streak alive!",
    "Momentum is building",
    "Day by day, you're growing",
  ],
  medium: [
    "You're on fire! Keep going",
    "Consistency looks good on you",
    "This streak is no accident",
  ],
  long: [
    "Unstoppable!",
    "You're building something real",
    "Extraordinary dedication",
  ],
};

const levelUpMessages = [
  "Level up! You earned more tasks",
  "New level unlocked — you're ready",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEncouragingMessage(
  hasTask: boolean,
  allCompleted: boolean,
  completedTasks: number,
  totalTasks: number,
  streak: number,
  level: number,
): string {
  if (!hasTask) {
    return pickRandom(noTaskMessages);
  }

  if (allCompleted) {
    if (streak >= 7 && level < 3) {
      return pickRandom(levelUpMessages);
    }
    if (streak >= 14) {
      return pickRandom(streakMessages.long);
    }
    if (streak >= 7) {
      return pickRandom(streakMessages.medium);
    }
    if (streak >= 3) {
      return pickRandom(streakMessages.short);
    }
    return pickRandom(completedMessages);
  }

  if (completedTasks > 0 && totalTasks > 1) {
    return `${completedTasks}/${totalTasks} done — keep it up!`;
  }

  if (streak >= 3) {
    return `${streak}-day streak — don't break it!`;
  }

  return pickRandom(inProgressMessages);
}

export function buildWidgetPayload(
  profile: UserProfile | null,
  todayEntry: DailyEntry | null,
): WidgetPayload {
  const tasks = todayEntry?.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const allCompleted = todayEntry?.completed ?? false;
  const hasTask = totalTasks > 0;
  const firstTask = tasks[0];
  const streak = profile?.currentLevelStreak ?? 0;
  const level = profile?.currentLevel ?? 1;

  let taskText = '';
  if (hasTask) {
    if (totalTasks === 1) {
      taskText = firstTask.text;
    } else {
      const incomplete = tasks.find(t => !t.isCompleted);
      taskText = incomplete ? incomplete.text : firstTask.text;
    }
  }

  const encouragingMessage = getEncouragingMessage(
    hasTask,
    allCompleted,
    completedTasks,
    totalTasks,
    streak,
    level,
  );

  return {
    taskText,
    isCompleted: hasTask && (totalTasks === 1 ? firstTask.isCompleted : allCompleted),
    allCompleted,
    totalTasks,
    completedTasks,
    streak,
    level,
    encouragingMessage,
    hasTask,
  };
}

export async function syncWidgetData(
  profile: UserProfile | null,
  todayEntry: DailyEntry | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const payload = buildWidgetPayload(profile, todayEntry);
    const jsonString = JSON.stringify(payload);

    if (Platform.OS === 'ios') {
      try {
        const SharedGroupPreferences = require('react-native-shared-group-preferences');
        await SharedGroupPreferences.default.setItem(
          'widgetData',
          jsonString,
          'group.com.kanishkaanand.onethingfocus',
        );
      } catch {
        // Native module not available (Expo Go) — silently skip
      }
    } else if (Platform.OS === 'android') {
      try {
        const SharedGroupPreferences = require('react-native-shared-group-preferences');
        await SharedGroupPreferences.default.setItem(
          'widgetData',
          jsonString,
          'OneThingWidgetData',
        );
      } catch {
        // Native module not available (Expo Go) — silently skip
      }
    }
  } catch (e) {
    logger.warn('Widget sync skipped (native module unavailable)');
  }
}

export async function hasWidgetTipBeenShown(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(WIDGET_TIP_SHOWN_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markWidgetTipShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_TIP_SHOWN_KEY, 'true');
  } catch {
    // ignore
  }
}
