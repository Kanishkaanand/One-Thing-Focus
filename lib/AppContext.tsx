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
  generateId,
  processEndOfDay,
} from './storage';
import { syncNotifications, rescheduleAllReminders } from './notifications';

interface AppContextValue {
  profile: UserProfile | null;
  todayEntry: DailyEntry | null;
  entries: Record<string, DailyEntry>;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addTask: (text: string) => Promise<void>;
  completeTask: (taskId: string, proof?: TaskItem['proof']) => Promise<void>;
  addReflection: (mood: 'energized' | 'calm' | 'neutral' | 'tough', note?: string) => Promise<void>;
  canAddMoreTasks: boolean;
  refreshData: () => Promise<void>;
  yesterdayMissed: boolean;
  justLeveledUp: boolean;
  setJustLeveledUp: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<Record<string, DailyEntry>>({});
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yesterdayMissed, setYesterdayMissed] = useState(false);
  const [justLeveledUp, setJustLeveledUp] = useState(false);

  const loadData = useCallback(async () => {
    try {
      let prof = await getProfile();
      const allEntries = await getAllEntries();

      const processed = await processEndOfDay(prof, allEntries);
      if (processed.currentLevel !== prof.currentLevel || processed.currentLevelStreak !== prof.currentLevelStreak) {
        prof = processed;
        await saveProfile(prof);
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const yEntry = allEntries[yStr];
      setYesterdayMissed(!!yEntry && !yEntry.completed && yEntry.tasks.length > 0);

      setProfile(prof);
      setEntries(allEntries);

      const today = getTodayDate();
      const currentTodayEntry = allEntries[today] || null;
      setTodayEntry(currentTodayEntry);

      await syncNotifications(prof, currentTodayEntry);
    } catch (e) {
      console.error('Failed to load data:', e);
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
    const today = getTodayDate();
    const current = todayEntry || {
      date: today,
      tasks: [] as TaskItem[],
      completed: false,
      levelAtTime: profile.currentLevel,
    };

    const newTask: TaskItem = {
      id: generateId(),
      text,
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

    await syncNotifications(profile, updated);
  }, [profile, todayEntry]);

  const completeTask = useCallback(async (taskId: string, proof?: TaskItem['proof']) => {
    if (!todayEntry || !profile) return;

    const updatedTasks = todayEntry.tasks.map(t =>
      t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString(), proof } : t
    );

    const allDone = updatedTasks.every(t => t.isCompleted);
    const completedCount = updatedTasks.filter(t => t.isCompleted).length;

    let newProfile = { ...profile };
    newProfile.totalTasksCompleted = profile.totalTasksCompleted + 1;

    if (allDone && updatedTasks.length > 0) {
      newProfile.currentLevelStreak = profile.currentLevelStreak + 1;
      if (newProfile.currentLevelStreak > newProfile.longestStreak) {
        newProfile.longestStreak = newProfile.currentLevelStreak;
      }

      if (newProfile.currentLevelStreak >= 7 && newProfile.currentLevel < 3) {
        const newLevel = (newProfile.currentLevel + 1) as 1 | 2 | 3;
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
  }, [todayEntry, profile]);

  const addReflection = useCallback(async (mood: 'energized' | 'calm' | 'neutral' | 'tough', note?: string) => {
    if (!todayEntry) return;
    const updated: DailyEntry = {
      ...todayEntry,
      reflection: { mood, note },
    };
    await saveEntry(updated);
    setTodayEntry(updated);
    setEntries(prev => ({ ...prev, [todayEntry.date]: updated }));
  }, [todayEntry]);

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
    updateProfile,
    addTask,
    completeTask,
    addReflection,
    canAddMoreTasks,
    refreshData: loadData,
    yesterdayMissed,
    justLeveledUp,
    setJustLeveledUp,
  }), [profile, todayEntry, entries, isLoading, updateProfile, addTask, completeTask, addReflection, canAddMoreTasks, loadData, yesterdayMissed, justLeveledUp]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
