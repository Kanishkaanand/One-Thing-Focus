/**
 * Analytics Service
 *
 * Local-first analytics tracking for understanding user behavior.
 * Events are stored locally in AsyncStorage and can optionally be synced to a backend.
 *
 * Privacy considerations:
 * - No PII (task text, notes, names) is stored
 * - Only event types and aggregated metrics
 * - Data stays on device by default
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Types
// ============================================

export interface AnalyticsEvent {
  id: string;
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
}

export interface AnalyticsSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  eventCount: number;
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  eventsByType: Record<string, number>;
  lastEventAt?: string;
  firstEventAt?: string;
}

// ============================================
// Constants
// ============================================

const ANALYTICS_EVENTS_KEY = '@onething_analytics_events';
const ANALYTICS_SESSION_KEY = '@onething_analytics_session';
const MAX_EVENTS = 1000; // Keep last 1000 events

// ============================================
// State
// ============================================

let currentSession: AnalyticsSession | null = null;
let eventQueue: AnalyticsEvent[] = [];
let isInitialized = false;

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getTimestamp(): string {
  return new Date().toISOString();
}

// ============================================
// Core Functions
// ============================================

/**
 * Initialize analytics - loads events from storage and starts a session
 */
export async function initAnalytics(): Promise<void> {
  if (isInitialized) return;

  try {
    // Load existing events
    const storedEvents = await AsyncStorage.getItem(ANALYTICS_EVENTS_KEY);
    if (storedEvents) {
      eventQueue = JSON.parse(storedEvents);
    }

    // Start new session
    await startSession();
    isInitialized = true;
  } catch (e) {
    console.error('Failed to initialize analytics:', e);
  }
}

/**
 * Start a new analytics session
 */
export async function startSession(): Promise<string> {
  const sessionId = generateId();
  currentSession = {
    id: sessionId,
    startedAt: getTimestamp(),
    eventCount: 0,
  };

  // Track session start
  await trackEvent('session_started', {
    isFirstSession: eventQueue.length === 0,
  });

  return sessionId;
}

/**
 * End the current session
 */
export async function endSession(): Promise<void> {
  if (!currentSession) return;

  currentSession.endedAt = getTimestamp();

  await trackEvent('session_ended', {
    duration: Date.now() - new Date(currentSession.startedAt).getTime(),
    eventCount: currentSession.eventCount,
  });

  currentSession = null;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  name: string,
  properties?: Record<string, unknown>
): Promise<void> {
  // Ensure we have a session
  if (!currentSession) {
    await startSession();
  }

  const event: AnalyticsEvent = {
    id: generateId(),
    name,
    properties,
    timestamp: getTimestamp(),
    sessionId: currentSession!.id,
  };

  // Add to queue
  eventQueue.push(event);
  currentSession!.eventCount++;

  // Trim if over limit
  if (eventQueue.length > MAX_EVENTS) {
    eventQueue = eventQueue.slice(-MAX_EVENTS);
  }

  // Persist to storage
  try {
    await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(eventQueue));
  } catch (e) {
    console.error('Failed to persist analytics event:', e);
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, properties || '');
  }
}

// ============================================
// Event Tracking Helpers
// ============================================

/**
 * Track app opened event
 */
export async function trackAppOpened(daysSinceLastOpen?: number): Promise<void> {
  await trackEvent('app_opened', {
    daysSinceLastOpen,
    platform: require('react-native').Platform.OS,
  });
}

/**
 * Track task created
 */
export async function trackTaskCreated(level: number, taskCount: number): Promise<void> {
  await trackEvent('task_created', {
    level,
    taskCount,
  });
}

/**
 * Track task completed
 */
export async function trackTaskCompleted(
  withProof: boolean,
  proofType?: 'photo' | 'screenshot' | 'document'
): Promise<void> {
  await trackEvent('task_completed', {
    withProof,
    proofType,
  });
}

/**
 * Track all tasks completed for the day
 */
export async function trackDayCompleted(
  streak: number,
  taskCount: number,
  level: number
): Promise<void> {
  await trackEvent('day_completed', {
    streak,
    taskCount,
    level,
  });
}

/**
 * Track level up achievement
 */
export async function trackLevelUp(
  fromLevel: number,
  toLevel: number,
  streakDays: number
): Promise<void> {
  await trackEvent('level_up', {
    fromLevel,
    toLevel,
    streakDays,
  });
}

/**
 * Track streak milestone
 */
export async function trackStreakMilestone(days: number): Promise<void> {
  await trackEvent('streak_milestone', { days });
}

/**
 * Track onboarding completed
 */
export async function trackOnboardingCompleted(
  hasName: boolean,
  remindersEnabled: boolean
): Promise<void> {
  await trackEvent('onboarding_completed', {
    hasName,
    remindersEnabled,
  });
}

/**
 * Track reflection added
 */
export async function trackReflectionAdded(
  mood: string,
  hasNote: boolean
): Promise<void> {
  await trackEvent('reflection_added', {
    mood,
    hasNote,
  });
}

/**
 * Track proof uploaded
 */
export async function trackProofUploaded(
  proofType: 'photo' | 'screenshot' | 'document'
): Promise<void> {
  await trackEvent('proof_uploaded', { proofType });
}

/**
 * Track proof skipped
 */
export async function trackProofSkipped(): Promise<void> {
  await trackEvent('proof_skipped');
}

/**
 * Track reminder toggled
 */
export async function trackReminderToggled(
  reminderType: 'pick' | 'complete',
  enabled: boolean
): Promise<void> {
  await trackEvent('reminder_toggled', {
    reminderType,
    enabled,
  });
}

/**
 * Track screen viewed
 */
export async function trackScreenViewed(screenName: string): Promise<void> {
  await trackEvent('screen_viewed', { screenName });
}

/**
 * Track data reset
 */
export async function trackDataReset(
  streakAtReset: number,
  totalTasks: number
): Promise<void> {
  await trackEvent('data_reset', {
    streakAtReset,
    totalTasks,
  });
}

// ============================================
// Analytics Retrieval
// ============================================

/**
 * Get all stored events
 */
export async function getEvents(): Promise<AnalyticsEvent[]> {
  return [...eventQueue];
}

/**
 * Get events by type
 */
export async function getEventsByType(eventName: string): Promise<AnalyticsEvent[]> {
  return eventQueue.filter((e) => e.name === eventName);
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const eventsByType: Record<string, number> = {};

  for (const event of eventQueue) {
    eventsByType[event.name] = (eventsByType[event.name] || 0) + 1;
  }

  const timestamps = eventQueue.map((e) => e.timestamp).sort();

  return {
    totalEvents: eventQueue.length,
    totalSessions: new Set(eventQueue.map((e) => e.sessionId)).size,
    eventsByType,
    firstEventAt: timestamps[0],
    lastEventAt: timestamps[timestamps.length - 1],
  };
}

/**
 * Clear all analytics data
 */
export async function clearAnalytics(): Promise<void> {
  eventQueue = [];
  currentSession = null;
  isInitialized = false;

  try {
    await AsyncStorage.removeItem(ANALYTICS_EVENTS_KEY);
    await AsyncStorage.removeItem(ANALYTICS_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear analytics:', e);
  }
}

// ============================================
// Export for future cloud sync
// ============================================

/**
 * Get events for upload (batch export)
 */
export async function getEventsForUpload(
  since?: string
): Promise<AnalyticsEvent[]> {
  if (!since) return [...eventQueue];

  const sinceTime = new Date(since).getTime();
  return eventQueue.filter(
    (e) => new Date(e.timestamp).getTime() > sinceTime
  );
}

/**
 * Mark events as uploaded (for future cloud sync)
 */
export async function markEventsUploaded(eventIds: string[]): Promise<void> {
  // In a cloud-sync implementation, this would mark events as synced
  // For now, it's a placeholder for future extension
  console.log(`[Analytics] Marked ${eventIds.length} events as uploaded`);
}
