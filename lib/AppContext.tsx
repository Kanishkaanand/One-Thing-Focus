import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  UserProfile,
  DailyEntry,
  TaskItem,
  getProfile,
  saveProfile,
  getAllEntries,
  saveEntry,
  getTodayDate,
  getLocalDateStr,
  generateId,
  processEndOfDay,
  clearAllData,
  checkStorageQuota,
  StorageStatus,
} from './storage';
import { createLogger } from './errorReporting';

const logger = createLogger('AppContext');
import { syncNotifications, rescheduleAllReminders } from './notifications';
import { validateTaskInput, validateNoteInput, validateMood, type MoodType } from './validation';
import { syncWidgetData } from './widgetData';
import {
  initAnalytics,
  trackAppOpened,
  trackTaskCreated,
  trackTaskCompleted,
  trackDayCompleted,
  trackLevelUp,
  trackReflectionAdded,
  trackDataReset,
} from './analytics';

interface AppContextValue {
  profile: UserProfile | null;
  todayEntry: DailyEntry | null;
  entries: Record<string, DailyEntry>;
  isLoading: boolean;
  storageStatus: StorageStatus | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addTask: (text: string) => Promise<void>;
  completeTask: (taskId: string, proof?: TaskItem['proof']) => Promise<void>;
  addReflection: (mood: 'energized' | 'calm' | 'neutral' | 'tough', note?: string) => Promise<void>;
  canAddMoreTasks: boolean;
  refreshData: () => Promise<void>;
  resetAllData: () => Promise<void>;
  yesterdayMissed: boolean;
  justLeveledUp: boolean;
  setJustLeveledUp: (v: boolean) => void;
  onResetCallback: (() => void) | null;
  setOnResetCallback: (cb: (() => void) | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<Record<string, DailyEntry>>({});
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yesterdayMissed, setYesterdayMissed] = useState(false);
  const [justLeveledUp, setJustLeveledUp] = useState(false);
  const [onResetCallback, setOnResetCallback] = useState<(() => void) | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Initialize analytics on app load
      await initAnalytics();

      let prof = await getProfile();
      const allEntries = await getAllEntries();

      // Track app opened with days since last open
      const lastEntry = Object.keys(allEntries).sort().pop();
      const daysSinceLastOpen = lastEntry
        ? Math.floor((Date.now() - new Date(lastEntry).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
      trackAppOpened(daysSinceLastOpen);

      const processed = await processEndOfDay(prof, allEntries);
      if (processed.currentLevel !== prof.currentLevel || processed.currentLevelStreak !== prof.currentLevelStreak) {
        prof = processed;
        await saveProfile(prof);
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = getLocalDateStr(yesterday);
      const yEntry = allEntries[yStr];
      setYesterdayMissed(!!yEntry && !yEntry.completed && yEntry.tasks.length > 0);

      setProfile(prof);
      setEntries(allEntries);

      const today = getTodayDate();
      const currentTodayEntry = allEntries[today] || null;
      setTodayEntry(currentTodayEntry);

      await syncNotifications(prof, currentTodayEntry);
      syncWidgetData(prof, currentTodayEntry);

      // Check storage quota
      const quota = await checkStorageQuota();
      setStorageStatus(quota);
      if (quota.isCritical) {
        logger.error(new Error(`Storage critically full: ${quota.percentUsed}%`), 'checkStorageQuota');
      } else if (quota.isWarning) {
        logger.warn(`Storage warning: ${quota.percentUsed}% used`);
      }
    } catch (e) {
      logger.error(e instanceof Error ? e : new Error(String(e)), 'loadData');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updates };
    await saveProfile(newProfile);
    setProfile(newProfile);
  }, [profile]);

  const addTask = useCallback(async (text: string) => {
    if (!profile) return;

    // Validate and sanitize input
    const validation = validateTaskInput(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const sanitizedText = validation.sanitized!;

    const today = getTodayDate();
    const current = todayEntry || {
      date: today,
      tasks: [] as TaskItem[],
      completed: false,
      levelAtTime: profile.currentLevel,
    };

    const newTask: TaskItem = {
      id: generateId(),
      text: sanitizedText,
      createdAt: new Date().toISOString(),
      isCompleted: false,
    };

    const updated: DailyEntry = {
      ...current,
      tasks: [...current.tasks, newTask],
    };

    await saveEntry(updated);
    setTodayEntry(updated);
    setEntries(prev => ({ ...prev, [today]: updated }));

    // Track task creation
    trackTaskCreated(profile.currentLevel, updated.tasks.length);

    await syncNotifications(profile, updated);
    syncWidgetData(profile, updated);
  }, [profile, todayEntry]);

  const completeTask = useCallback(async (taskId: string, proof?: TaskItem['proof']) => {
    if (!todayEntry || !profile) return;

    const updatedTasks = todayEntry.tasks.map(t =>
      t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString(), proof } : t
    );

    const allDone = updatedTasks.every(t => t.isCompleted);
    const completedCount = updatedTasks.filter(t => t.isCompleted).length;

    // Track task completion
    trackTaskCompleted(!!proof, proof?.type);

    let newProfile = { ...profile };
    newProfile.totalTasksCompleted = profile.totalTasksCompleted + 1;

    if (allDone && updatedTasks.length > 0) {
      newProfile.currentLevelStreak = profile.currentLevelStreak + 1;
      if (newProfile.currentLevelStreak > newProfile.longestStreak) {
        newProfile.longestStreak = newProfile.currentLevelStreak;
      }

      // Track day completed
      trackDayCompleted(
        newProfile.currentLevelStreak,
        updatedTasks.length,
        profile.currentLevel
      );

      if (newProfile.currentLevelStreak >= 7 && newProfile.currentLevel < 3) {
        const newLevel = Math.min(newProfile.currentLevel + 1, 3) as 1 | 2 | 3;

        // Track level up
        trackLevelUp(profile.currentLevel, newLevel, newProfile.currentLevelStreak);

        newProfile.currentLevel = newLevel;
        newProfile.currentLevelStreak = 0;
        setJustLeveledUp(true);
      }
    }

    const updated: DailyEntry = {
      ...todayEntry,
      tasks: updatedTasks,
      completed: allDone,
    };

    await saveEntry(updated);
    await saveProfile(newProfile);
    setTodayEntry(updated);
    setProfile(newProfile);
    setEntries(prev => ({ ...prev, [todayEntry.date]: updated }));

    await syncNotifications(newProfile, updated);
    syncWidgetData(newProfile, updated);
  }, [todayEntry, profile]);

  const addReflection = useCallback(async (mood: 'energized' | 'calm' | 'neutral' | 'tough', note?: string) => {
    if (!todayEntry) return;

    // Runtime validate mood value (defense in depth)
    const validatedMood = validateMood(mood);
    if (!validatedMood) {
      logger.error(new Error(`Invalid mood value: ${mood}`), 'addReflection');
      throw new Error('Invalid mood value');
    }

    // Validate and sanitize note if provided
    let sanitizedNote: string | undefined;
    if (note) {
      const validation = validateNoteInput(note);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      sanitizedNote = validation.sanitized;
    }

    const updated: DailyEntry = {
      ...todayEntry,
      reflection: { mood: validatedMood, note: sanitizedNote },
    };
    await saveEntry(updated);
    setTodayEntry(updated);
    setEntries(prev => ({ ...prev, [todayEntry.date]: updated }));

    // Track reflection added
    trackReflectionAdded(validatedMood, !!sanitizedNote);

    if (profile) {
      await syncNotifications(profile, updated);
      syncWidgetData(profile, updated);
    }
  }, [todayEntry, profile]);

  const resetAllData = useCallback(async () => {
    // Track data reset before clearing
    if (profile) {
      trackDataReset(profile.currentLevelStreak, profile.totalTasksCompleted);
    }

    await clearAllData();
    setJustLeveledUp(false);
    setYesterdayMissed(false);
    onResetCallback?.();
    await loadData();
  }, [loadData, onResetCallback, profile]);

  const canAddMoreTasks = useMemo(() => {
    if (!profile || !todayEntry) return true;
    if (!todayEntry.tasks) return true;
    return todayEntry.tasks.length < profile.currentLevel;
  }, [profile, todayEntry]);

  const value = useMemo(() => ({
    profile,
    todayEntry,
    entries,
    isLoading,
    storageStatus,
    updateProfile,
    addTask,
    completeTask,
    addReflection,
    canAddMoreTasks,
    refreshData: loadData,
    resetAllData,
    yesterdayMissed,
    justLeveledUp,
    setJustLeveledUp,
    onResetCallback,
    setOnResetCallback,
  }), [profile, todayEntry, entries, isLoading, storageStatus, updateProfile, addTask, completeTask, addReflection, canAddMoreTasks, loadData, resetAllData, yesterdayMissed, justLeveledUp, onResetCallback]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
