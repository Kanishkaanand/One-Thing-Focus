import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { DailyEntry, UserProfile } from './storage';

const PICK_TASK_ID = 'pick-task-reminder';
const WRAP_UP_ID = 'wrap-up-reminder';
const FOCUS_NUDGE_PREFIX = 'focus-nudge-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const pickTaskMessages = [
  "Good morning, NAME. What's your one thing today?",
  "New day, clean slate. What matters most today?",
  "Just one thing. That's all. Whenever you're ready.",
];

const pickTaskMessagesNoName = [
  "Good morning! What's your one thing today?",
  "New day, clean slate. What matters most today?",
  "Just one thing. That's all. Whenever you're ready.",
];

const focusNudgeMessages = [
  "It's time. Your one thing: TASK",
  "Now's the moment. TASK",
  "NAME, you said TIME. Here it is. TASK",
];

const focusNudgeMessagesNoName = [
  "It's time. Your one thing: TASK",
  "Now's the moment. TASK",
  "Time to start: TASK",
];

const wrapUpMessages = [
  "Still have your one thing open. There's still time.",
  "Day's winding down. One thing left: TASK",
  "No rush, but your task is waiting when you're ready.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (Platform.OS === 'web') return { granted: false, canAskAgain: false };

  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return { granted: status === 'granted', canAskAgain: canAskAgain ?? true };
}

export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.warn('Could not open settings:', e);
    }
  }
}

export async function schedulePickTaskReminder(
  time: string,
  name?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelPickTaskReminder();

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour >= 21) return;

  const messages = name ? pickTaskMessages : pickTaskMessagesNoName;
  const body = pickRandom(messages).replace('NAME', name || '');

  await Notifications.scheduleNotificationAsync({
    identifier: PICK_TASK_ID,
    content: {
      title: 'One Thing',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleFocusNudge(
  taskId: string,
  taskText: string,
  scheduledTime: string,
  name?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  const identifier = `${FOCUS_NUDGE_PREFIX}${taskId}`;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {}

  const [hourStr, minuteStr] = scheduledTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour >= 21) return;

  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  if (target.getTime() <= now.getTime()) return;

  const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);

  const messages = name ? focusNudgeMessages : focusNudgeMessagesNoName;
  const body = pickRandom(messages)
    .replace('TASK', taskText)
    .replace('NAME', name || '')
    .replace('TIME', formatTime12h(scheduledTime));

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'One Thing',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
      repeats: false,
    },
  });
}

export async function scheduleWrapUpReminder(
  time: string,
  taskText?: string,
  name?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelWrapUpReminder();

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour >= 21) return;

  const body = pickRandom(wrapUpMessages).replace('TASK', taskText || 'your task');

  await Notifications.scheduleNotificationAsync({
    identifier: WRAP_UP_ID,
    content: {
      title: 'One Thing',
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelPickTaskReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(PICK_TASK_ID);
  } catch {}
}

export async function cancelWrapUpReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(WRAP_UP_ID);
  } catch {}
}

export async function cancelFocusNudge(taskId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`${FOCUS_NUDGE_PREFIX}${taskId}`);
  } catch {}
}

export async function cancelAllFocusNudges(tasks: { id: string }[]): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const task of tasks) {
    await cancelFocusNudge(task.id);
  }
}

export async function cancelAllReminders(tasks?: { id: string }[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelPickTaskReminder();
  await cancelWrapUpReminder();
  if (tasks) {
    await cancelAllFocusNudges(tasks);
  }
}

function isWithinOneHour(time1: string, time2: string): boolean {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const mins1 = h1 * 60 + m1;
  const mins2 = h2 * 60 + m2;
  return Math.abs(mins1 - mins2) <= 60;
}

export async function syncNotifications(
  profile: UserProfile,
  todayEntry: DailyEntry | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  const pickEnabled = profile.reminderPickTask.enabled;
  const focusEnabled = profile.reminderFocusNudge.enabled;
  const wrapUpEnabled = profile.reminderWrapUp.enabled;
  const name = profile.name || undefined;

  if (!todayEntry || todayEntry.tasks.length === 0) {
    if (pickEnabled) {
      await schedulePickTaskReminder(profile.reminderPickTask.time, name);
    } else {
      await cancelPickTaskReminder();
    }
    await cancelWrapUpReminder();
    return;
  }

  if (todayEntry.completed) {
    await cancelAllReminders(todayEntry.tasks);
    return;
  }

  await cancelPickTaskReminder();

  const incompleteTasks = todayEntry.tasks.filter(t => !t.isCompleted);
  const firstIncomplete = incompleteTasks[0];

  if (focusEnabled) {
    for (const task of todayEntry.tasks) {
      if (task.isCompleted) {
        await cancelFocusNudge(task.id);
      } else if (task.scheduledTime) {
        await scheduleFocusNudge(task.id, task.text, task.scheduledTime, name);
      }
    }
  } else {
    await cancelAllFocusNudges(todayEntry.tasks);
  }

  if (wrapUpEnabled && incompleteTasks.length > 0) {
    const taskWithTime = incompleteTasks.find(t => t.scheduledTime);
    const shouldSkipWrapUp = taskWithTime?.scheduledTime &&
      isWithinOneHour(taskWithTime.scheduledTime, profile.reminderWrapUp.time);

    if (!shouldSkipWrapUp) {
      await scheduleWrapUpReminder(
        profile.reminderWrapUp.time,
        firstIncomplete?.text,
        name,
      );
    } else {
      await cancelWrapUpReminder();
    }
  } else {
    await cancelWrapUpReminder();
  }
}

export { cancelFocusNudge as cancelTaskTimeNotification };

export async function rescheduleAllReminders(profile: UserProfile, todayEntry?: DailyEntry | null): Promise<void> {
  if (Platform.OS === 'web') return;

  if (todayEntry !== undefined) {
    await syncNotifications(profile, todayEntry);
    return;
  }

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  if (profile.reminderPickTask.enabled) {
    await schedulePickTaskReminder(profile.reminderPickTask.time, profile.name || undefined);
  } else {
    await cancelPickTaskReminder();
  }

  if (profile.reminderWrapUp.enabled) {
    await scheduleWrapUpReminder(profile.reminderWrapUp.time);
  } else {
    await cancelWrapUpReminder();
  }
}
