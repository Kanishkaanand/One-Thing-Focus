import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { DailyEntry, UserProfile } from './storage';

const PICK_TASK_ID = 'pick-task-reminder';
const COMPLETE_TASK_ID = 'complete-task-reminder';

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
  "Good morning! What's your one thing today?",
  "A new day, a fresh start. Ready to pick your one thing?",
  "Your day is wide open. What one thing will make it count?",
];

const pickTaskMessagesWithName = [
  "Hey NAME, one task is all it takes. What will it be?",
];

const completeTaskMessages = [
  "Your one thing is waiting. You've got this.",
  "Still time to finish today's task. Just one thing, remember?",
  "Almost end of day — your task is still open. Wrap it up?",
];

const completeTaskMessagesWithName = [
  "Hey NAME, don't forget — you committed to one thing today.",
];

function getRandomMessage(messages: string[], messagesWithName: string[], name?: string): string {
  const allMessages = name
    ? [...messages, ...messagesWithName.map(m => m.replace('NAME', name))]
    : messages;
  return allMessages[Math.floor(Math.random() * allMessages.length)];
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

  await Notifications.scheduleNotificationAsync({
    identifier: PICK_TASK_ID,
    content: {
      title: 'One Thing',
      body: getRandomMessage(pickTaskMessages, pickTaskMessagesWithName, name),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleCompleteTaskReminder(
  time: string,
  name?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelCompleteTaskReminder();

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  await Notifications.scheduleNotificationAsync({
    identifier: COMPLETE_TASK_ID,
    content: {
      title: 'One Thing',
      body: getRandomMessage(completeTaskMessages, completeTaskMessagesWithName, name),
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

export async function cancelCompleteTaskReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(COMPLETE_TASK_ID);
  } catch {}
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelPickTaskReminder();
  await cancelCompleteTaskReminder();
}

export async function syncNotifications(
  profile: UserProfile,
  todayEntry: DailyEntry | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { granted } = await getNotificationPermissionStatus();
  if (!granted) return;

  const pickEnabled = profile.reminderPickTask.enabled;
  const completeEnabled = profile.reminderCompleteTask.enabled;

  if (!todayEntry || todayEntry.tasks.length === 0) {
    if (pickEnabled) {
      await schedulePickTaskReminder(profile.reminderPickTask.time, profile.name || undefined);
    } else {
      await cancelPickTaskReminder();
    }
    await cancelCompleteTaskReminder();
    return;
  }

  if (!todayEntry.completed) {
    await cancelPickTaskReminder();
    if (completeEnabled) {
      await scheduleCompleteTaskReminder(profile.reminderCompleteTask.time, profile.name || undefined);
    } else {
      await cancelCompleteTaskReminder();
    }
    return;
  }

  await cancelAllReminders();
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

  if (profile.reminderCompleteTask.enabled) {
    await scheduleCompleteTaskReminder(profile.reminderCompleteTask.time, profile.name || undefined);
  } else {
    await cancelCompleteTaskReminder();
  }
}
