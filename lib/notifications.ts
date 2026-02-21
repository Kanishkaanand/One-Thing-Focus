import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { DailyEntry, UserProfile } from './storage';

const PICK_TASK_ID = 'pick-task-reminder';
const TASK_NUDGE_PREFIX = 'task-nudge-';
const WRAP_UP_PREFIX = 'wrap-up-';

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

const taskNudgeMessages = [
  "It's time. Your one thing: TASK",
  "Now's the moment. TASK",
  "NAME, you said TIME. Here it is. TASK",
];

const taskNudgeMessagesNoName = [
  "It's time. Your one thing: TASK",
  "Now's the moment. TASK",
  "Time to start: TASK",
];

const taskNudgeAutoMessages = [
  "Hey NAME, still have your one thing: TASK",
  "Gentle nudge: TASK",
  "Your one thing is waiting: TASK",
];

const taskNudgeAutoMessagesNoName = [
  "Still have your one thing: TASK",
  "Gentle nudge: TASK",
  "Your one thing is waiting: TASK",
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

function isAfter9PM(date: Date): boolean {
  return date.getHours() >= 21;
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

export async function scheduleTaskNudge(
  taskId: string,
  taskText: string,
  scheduledTime: string | undefined,
  taskCreatedAt: string,
  name?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  const nudgeId = `${TASK_NUDGE_PREFIX}${taskId}`;
  const wrapUpId = `${WRAP_UP_PREFIX}${taskId}`;

  try {
    await Notifications.cancelScheduledNotificationAsync(nudgeId);
    await Notifications.cancelScheduledNotificationAsync(wrapUpId);
  } catch {}

  const now = new Date();
  let nudgeTime: Date;

  if (scheduledTime) {
    const [hourStr, minuteStr] = scheduledTime.split(':');
    nudgeTime = new Date();
    nudgeTime.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);

    if (nudgeTime.getTime() <= now.getTime()) return;
  } else {
    nudgeTime = new Date(new Date(taskCreatedAt).getTime() + 2 * 60 * 60 * 1000);

    if (nudgeTime.getTime() <= now.getTime()) return;
  }

  if (isAfter9PM(nudgeTime)) return;

  const secondsUntilNudge = Math.floor((nudgeTime.getTime() - now.getTime()) / 1000);

  let nudgeBody: string;
  if (scheduledTime) {
    const messages = name ? taskNudgeMessages : taskNudgeMessagesNoName;
    nudgeBody = pickRandom(messages)
      .replace('TASK', taskText)
      .replace('NAME', name || '')
      .replace('TIME', formatTime12h(scheduledTime));
  } else {
    const messages = name ? taskNudgeAutoMessages : taskNudgeAutoMessagesNoName;
    nudgeBody = pickRandom(messages)
      .replace('TASK', taskText)
      .replace('NAME', name || '');
  }

  await Notifications.scheduleNotificationAsync({
    identifier: nudgeId,
    content: {
      title: 'One Thing',
      body: nudgeBody,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilNudge,
      repeats: false,
    },
  });

  const wrapUpTime = new Date(nudgeTime.getTime() + 2 * 60 * 60 * 1000);

  if (!isAfter9PM(wrapUpTime)) {
    const secondsUntilWrapUp = Math.floor((wrapUpTime.getTime() - now.getTime()) / 1000);

    if (secondsUntilWrapUp > 0) {
      const wrapUpBody = pickRandom(wrapUpMessages).replace('TASK', taskText);

      await Notifications.scheduleNotificationAsync({
        identifier: wrapUpId,
        content: {
          title: 'One Thing',
          body: wrapUpBody,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilWrapUp,
          repeats: false,
        },
      });
    }
  }
}

export async function cancelPickTaskReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(PICK_TASK_ID);
  } catch {}
}

export async function cancelTaskNudge(taskId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`${TASK_NUDGE_PREFIX}${taskId}`);
    await Notifications.cancelScheduledNotificationAsync(`${WRAP_UP_PREFIX}${taskId}`);
  } catch {}
}

export async function cancelAllTaskNudges(tasks: { id: string }[]): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const task of tasks) {
    await cancelTaskNudge(task.id);
  }
}

export async function cancelAllReminders(tasks?: { id: string }[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelPickTaskReminder();
  if (tasks) {
    await cancelAllTaskNudges(tasks);
  }
}

export async function syncNotifications(
  profile: UserProfile,
  todayEntry: DailyEntry | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  const name = profile.name || undefined;

  if (!todayEntry || todayEntry.tasks.length === 0) {
    if (profile.reminderPickTask.enabled) {
      await schedulePickTaskReminder(profile.reminderPickTask.time, name);
    } else {
      await cancelPickTaskReminder();
    }
    return;
  }

  if (todayEntry.completed) {
    await cancelAllReminders(todayEntry.tasks);
    return;
  }

  await cancelPickTaskReminder();

  for (const task of todayEntry.tasks) {
    if (task.isCompleted) {
      await cancelTaskNudge(task.id);
    } else {
      await scheduleTaskNudge(
        task.id,
        task.text,
        task.scheduledTime,
        task.createdAt,
        name,
      );
    }
  }
}

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
}
