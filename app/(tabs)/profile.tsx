import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Switch,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { calculateCompletionRate, formatTime12h } from '@/lib/storage';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  openNotificationSettings,
  rescheduleAllReminders,
} from '@/lib/notifications';
import { useScreenAnalytics } from '@/lib/useAnalytics';
import { trackReminderToggled } from '@/lib/analytics';
import { useShakeDetector } from '@/lib/useShakeDetector';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/Kanishkaanand/One-Thing-Focus/blob/main/docs/PRIVACY_POLICY.md';
const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ||
  'https://github.com/Kanishkaanand/One-Thing-Focus/blob/main/docs/TERMS_OF_USE.md';

function StatCard({ icon, label, value, delay }: { icon: string; label: string; value: string | number; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Feather name={icon as any} size={18} color={Colors.accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function TimePicker({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (time: string) => void;
}) {
  const [h, m] = value.split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState(h);
  const [selectedMinute, setSelectedMinute] = useState(m);

  useEffect(() => {
    if (visible) {
      const [hh, mm] = value.split(':').map(Number);
      setSelectedHour(hh);
      setSelectedMinute(mm);
    }
  }, [visible, value]);

  const handleDone = () => {
    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onSelect(timeStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Set Time</Text>

          <View style={styles.pickerColumns}>
            <ScrollView
              style={styles.pickerColumn}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerColumnContent}
            >
              {HOURS.map(hour => (
                <Pressable
                  key={hour}
                  onPress={() => setSelectedHour(hour)}
                  style={[styles.pickerOption, selectedHour === hour && styles.pickerOptionSelected]}
                >
                  <Text style={[styles.pickerOptionText, selectedHour === hour && styles.pickerOptionTextSelected]}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              style={styles.pickerColumn}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerColumnContent}
            >
              {MINUTES.map(minute => (
                <Pressable
                  key={minute}
                  onPress={() => setSelectedMinute(minute)}
                  style={[styles.pickerOption, selectedMinute === minute && styles.pickerOptionSelected]}
                >
                  <Text style={[styles.pickerOptionText, selectedMinute === minute && styles.pickerOptionTextSelected]}>
                    :{String(minute).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable style={styles.pickerDoneBtn} onPress={handleDone}>
            <Text style={styles.pickerDoneBtnText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, todayEntry, entries, updateProfile, resetAllData, isLoading } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notifStatus, setNotifStatus] = useState<{ granted: boolean; canAskAgain: boolean }>({ granted: true, canAskAgain: true });
  const [timePickerTarget, setTimePickerTarget] = useState<'pick' | null>(null);

  // Track screen views
  useScreenAnalytics('Profile');

  // Shake gesture triggers hidden reset flow
  useShakeDetector({
    onShake: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowResetConfirm(true);
    },
  });

  useEffect(() => {
    checkNotifStatus();
  }, []);

  const checkNotifStatus = async () => {
    const status = await getNotificationPermissionStatus();
    setNotifStatus(status);
  };

  if (isLoading || !profile) return <View style={[styles.container, { paddingTop: insets.top }]} />;

  const completionRate = calculateCompletionRate(entries);
  const levelLabels: Record<number, string> = { 1: 'Focused', 2: 'Growing', 3: 'Momentum' };

  const handleEditName = () => {
    setNameInput(profile.name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    await updateProfile({ name: nameInput.trim() });
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTogglePickReminder = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value && !notifStatus.granted) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        return;
      }
      setNotifStatus({ granted: true, canAskAgain: true });
    }

    const updated = { ...profile.reminderPickTask, enabled: value };
    await updateProfile({ reminderPickTask: updated });
    trackReminderToggled('pick', value);
    const newProfile = { ...profile, reminderPickTask: updated };
    await rescheduleAllReminders(newProfile, todayEntry);
  };

  const handleTimeSelect = async (time: string) => {
    if (timePickerTarget === 'pick') {
      const updated = { ...profile.reminderPickTask, time };
      await updateProfile({ reminderPickTask: updated });
      const newProfile = { ...profile, reminderPickTask: updated };
      await rescheduleAllReminders(newProfile, todayEntry);
    }
  };

  const openExternalUrl = async (url: string, label: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Link unavailable', `Could not open ${label}.`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', `Could not open ${label}.`);
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const showNotifWarning = Platform.OS !== 'web' && !notifStatus.granted && !notifStatus.canAskAgain;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 20, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>Profile</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.nameSection}>
          <View style={styles.avatarCircle}>
            <Feather name="user" size={28} color={Colors.accent} />
          </View>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameEditInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={Colors.neutral}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Pressable onPress={handleSaveName} style={styles.nameEditBtn}>
                <Feather name="check" size={20} color={Colors.success} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleEditName} style={styles.nameRow}>
              <Text style={styles.nameText}>{profile.name || 'Tap to set name'}</Text>
              <Feather name="edit-2" size={14} color={Colors.textSecondary} />
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={styles.levelBadge}>
          <View style={styles.levelBadgeIcon}>
            <Feather name="award" size={20} color={Colors.accent} />
          </View>
          <View>
            <Text style={styles.levelBadgeTitle}>Level {profile.currentLevel}</Text>
            <Text style={styles.levelBadgeSubtitle}>
              {levelLabels[profile.currentLevel]} — {profile.currentLevel} task{profile.currentLevel > 1 ? 's' : ''} per day
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170)} style={styles.levelInfoCard}>
          <View style={styles.levelInfoRow}>
            <Feather name="arrow-up-circle" size={16} color={Colors.success} />
            <Text style={styles.levelInfoText}>
              Complete all tasks for 7 days in a row to level up
            </Text>
          </View>
          <View style={styles.levelInfoRow}>
            <Feather name="arrow-down-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.levelInfoText}>
              Miss a day and your streak resets — but your level only drops after 3 missed days
            </Text>
          </View>
        </Animated.View>

        <View style={styles.statsGrid}>
          <StatCard icon="zap" label="Current Streak" value={profile.currentLevelStreak} delay={200} />
          <StatCard icon="trending-up" label="Longest Streak" value={profile.longestStreak} delay={250} />
          <StatCard icon="check-circle" label="Tasks Done" value={profile.totalTasksCompleted} delay={300} />
          <StatCard icon="percent" label="Completion" value={`${completionRate}%`} delay={350} />
        </View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Reminders</Text>

          {showNotifWarning && (
            <View style={styles.notifWarning}>
              <Text style={styles.notifWarningText}>
                Notifications are turned off in your phone settings
              </Text>
              <Pressable onPress={openNotificationSettings} style={styles.notifWarningLink}>
                <Text style={styles.notifWarningLinkText}>Open Settings</Text>
                <Feather name="external-link" size={12} color={Colors.accent} />
              </Pressable>
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Feather name="sunrise" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Pick your task</Text>
            </View>
            <View style={styles.settingRight}>
              {profile.reminderPickTask.enabled && (
                <Pressable onPress={() => setTimePickerTarget('pick')} style={styles.settingTimeChip}>
                  <Text style={styles.settingTimeText}>{formatTime12h(profile.reminderPickTask.time)}</Text>
                </Pressable>
              )}
              <Switch
                value={profile.reminderPickTask.enabled}
                onValueChange={handleTogglePickReminder}
                trackColor={{ false: Colors.neutral, true: Colors.accent + '60' }}
                thumbColor={profile.reminderPickTask.enabled ? Colors.accent : Colors.surface}
              />
            </View>
          </View>

        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Pressable
            style={styles.legalRow}
            onPress={() => openExternalUrl(PRIVACY_POLICY_URL, 'Privacy Policy')}
          >
            <View style={styles.settingLeft}>
              <Feather name="shield" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <Feather name="external-link" size={16} color={Colors.neutral} />
          </Pressable>
          <Pressable
            style={styles.legalRow}
            onPress={() => openExternalUrl(TERMS_URL, 'Terms of Use')}
          >
            <View style={styles.settingLeft}>
              <Feather name="file-text" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Terms of Use</Text>
            </View>
            <Feather name="external-link" size={16} color={Colors.neutral} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(560)} style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>One Thing v1.0.0</Text>
          <Text style={styles.aboutCredit}>Made with love in Bangalore ❤️</Text>
        </Animated.View>
      </ScrollView>

      <Modal visible={showResetConfirm} transparent animationType="fade">
        <Pressable style={styles.resetOverlay} onPress={() => setShowResetConfirm(false)}>
          <Pressable style={styles.resetSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.resetIconWrap}>
              <Feather name="alert-triangle" size={28} color="#D45B5B" />
            </View>
            <Text style={styles.resetTitle}>Reset everything?</Text>
            <Text style={styles.resetDesc}>
              This will erase all your tasks, streaks, level progress, and settings. You&apos;ll start fresh from onboarding.
            </Text>
            <Pressable
              style={styles.resetConfirmBtn}
              onPress={async () => {
                setShowResetConfirm(false);
                await resetAllData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/onboarding');
              }}
            >
              <Text style={styles.resetConfirmBtnText}>Yes, reset everything</Text>
            </Pressable>
            <Pressable
              style={styles.resetCancelBtn}
              onPress={() => setShowResetConfirm(false)}
            >
              <Text style={styles.resetCancelBtnText}>Never mind</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <TimePicker
        visible={timePickerTarget !== null}
        value={
          timePickerTarget === 'pick'
            ? profile.reminderPickTask.time
            : '08:00'
        }
        onClose={() => setTimePickerTarget(null)}
        onSelect={handleTimeSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameEditInput: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 180,
    textAlign: 'center',
  },
  nameEditBtn: {
    padding: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  levelBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: Colors.textPrimary,
  },
  levelBadgeSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  settingsSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  settingTimeChip: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingTimeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.accent,
  },
  notifWarning: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  notifWarningText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  notifWarningLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifWarningLinkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
  aboutSection: {
    alignItems: 'center',
    gap: 4,
  },
  aboutText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  aboutCredit: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.neutral,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerColumns: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  pickerColumn: {
    maxHeight: 200,
    width: 90,
  },
  pickerColumnContent: {
    paddingVertical: 8,
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.accentLight,
  },
  pickerOptionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  pickerOptionTextSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  pickerDoneBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  pickerDoneBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  resetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  resetSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  resetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D45B5B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resetTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  resetDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetConfirmBtn: {
    backgroundColor: '#D45B5B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  resetConfirmBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  resetCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  resetCancelBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  levelInfoCard: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  levelInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  levelInfoText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
});
