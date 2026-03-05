import React, { useState, useEffect, useCallback } from 'react';
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
import { useIsFocused } from '@react-navigation/native';
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

type TimePillOption = 'morning' | 'afternoon' | 'evening' | 'custom' | null;

const TIME_PRESETS: { key: TimePillOption; label: string; icon: string; time: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunrise', time: '09:00' },
  { key: 'afternoon', label: 'Afternoon', icon: 'sun', time: '13:00' },
  { key: 'evening', label: 'Evening', icon: 'sunset', time: '17:00' },
];

function getAvailableHours(): number[] {
  const now = new Date();
  const currentHour = now.getHours();
  const earliest = now.getMinutes() >= 45 ? currentHour + 1 : currentHour;
  const start = Math.max(earliest, 7);
  const end = 23;
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

function isPresetPast(time: string): boolean {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/Kanishkaanand/One-Thing-Focus/blob/main/docs/PRIVACY_POLICY.md';
const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ||
  'https://github.com/Kanishkaanand/One-Thing-Focus/blob/main/docs/TERMS_OF_USE.md';
const APP_STORE_URL =
  'https://apps.apple.com/app/id6759150671?action=write-review';

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
  const [selectedPill, setSelectedPill] = useState<TimePillOption>(null);
  const [customHour, setCustomHour] = useState(() => {
    const hours = getAvailableHours();
    return hours.length > 0 ? hours[0] : 23;
  });
  const [customMinute, setCustomMinute] = useState(0);
  const [showCustom, setShowCustom] = useState(false);

  const now = new Date();
  const allMinutes = [0, 15, 30, 45];
  const availableMinutes = customHour === now.getHours()
    ? allMinutes.filter((m) => m > now.getMinutes())
    : allMinutes;

  useEffect(() => {
    if (visible) {
      const [hh, mm] = value.split(':').map(Number);
      const matchedPreset = TIME_PRESETS.find((p) => {
        const [ph, pm] = p.time.split(':').map(Number);
        return ph === hh && pm === mm;
      });
      if (matchedPreset && !isPresetPast(matchedPreset.time)) {
        setSelectedPill(matchedPreset.key);
        setShowCustom(false);
      } else {
        setSelectedPill('custom');
        setCustomHour(hh);
        setCustomMinute(mm);
        setShowCustom(true);
      }
    }
  }, [visible, value]);

  useEffect(() => {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (customHour === currentHour && customMinute <= currentMinute) {
      const nextValid = allMinutes.find((m) => m > currentMinute);
      setCustomMinute(nextValid ?? 0);
    }
  }, [customHour]);

  const handlePillPress = useCallback((key: TimePillOption) => {
    if (key === selectedPill) {
      setSelectedPill(null);
      setShowCustom(false);
      return;
    }
    setSelectedPill(key);
    setShowCustom(key === 'custom');
  }, [selectedPill]);

  const getTimeString = (): string | null => {
    if (!selectedPill) return null;
    const preset = TIME_PRESETS.find((p) => p.key === selectedPill);
    if (preset) return preset.time;
    if (selectedPill === 'custom') {
      return `${String(customHour).padStart(2, '0')}:${String(customMinute).padStart(2, '0')}`;
    }
    return null;
  };

  const handleDone = () => {
    const time = getTimeString();
    if (time) {
      onSelect(time);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Set Time</Text>

          <View style={styles.pillRow}>
            {TIME_PRESETS.map((preset) => {
              const past = isPresetPast(preset.time);
              return (
                <Pressable
                  key={preset.key}
                  style={[
                    styles.pill,
                    selectedPill === preset.key && styles.pillSelected,
                    past && styles.pillDisabled,
                  ]}
                  onPress={() => !past && handlePillPress(preset.key)}
                  disabled={past}
                >
                  <Feather
                    name={preset.icon as any}
                    size={14}
                    color={past ? Colors.neutral : selectedPill === preset.key ? Colors.accent : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.pillText,
                    selectedPill === preset.key && styles.pillTextSelected,
                    past && styles.pillTextDisabled,
                  ]}>
                    {preset.label} {formatTime12h(preset.time)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[
                styles.pill,
                selectedPill === 'custom' && styles.pillSelected,
              ]}
              onPress={() => handlePillPress('custom')}
            >
              <Feather
                name="sliders"
                size={14}
                color={selectedPill === 'custom' ? Colors.accent : Colors.textSecondary}
              />
              <Text style={[
                styles.pillText,
                selectedPill === 'custom' && styles.pillTextSelected,
              ]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {showCustom && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.pickerColumns}>
              <View style={styles.pickerColumnWrap}>
                <Text style={styles.pickerColumnLabel}>Hour</Text>
                <ScrollView
                  style={styles.pickerColumn}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerColumnContent}
                >
                  {getAvailableHours().map((h) => {
                    let displayH = h;
                    const ampm = h >= 12 ? 'p' : 'a';
                    if (h === 0) displayH = 12;
                    else if (h > 12) displayH = h - 12;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => setCustomHour(h)}
                        style={[styles.pickerOption, customHour === h && styles.pickerOptionSelected]}
                      >
                        <Text style={[styles.pickerOptionText, customHour === h && styles.pickerOptionTextSelected]}>
                          {displayH}{ampm}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.pickerColumnWrap}>
                <Text style={styles.pickerColumnLabel}>Min</Text>
                <ScrollView
                  style={styles.pickerColumn}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pickerColumnContent}
                >
                  {availableMinutes.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setCustomMinute(m)}
                      style={[styles.pickerOption, customMinute === m && styles.pickerOptionSelected]}
                    >
                      <Text style={[styles.pickerOptionText, customMinute === m && styles.pickerOptionTextSelected]}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          )}

          <Pressable style={[styles.pickerDoneBtn, !selectedPill && styles.pickerDoneBtnDisabled]} onPress={handleDone} disabled={!selectedPill}>
            <Text style={styles.pickerDoneBtnText}>
              {selectedPill ? 'Done' : 'Pick a time'}
            </Text>
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
  const isFocused = useIsFocused();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notifStatus, setNotifStatus] = useState<{ granted: boolean; canAskAgain: boolean }>({ granted: true, canAskAgain: true });
  const [timePickerTarget, setTimePickerTarget] = useState<'pick' | null>(null);

  // Track screen views
  useScreenAnalytics('Profile');

  // Shake gesture triggers hidden reset flow (only when Profile tab is focused)
  useShakeDetector({
    onShake: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowResetConfirm(true);
    },
    enabled: isFocused,
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
      await checkNotifStatus();
      if (!granted) {
        return;
      }
    }

    const updated = { ...profile.reminderPickTask, enabled: value };
    await updateProfile({ reminderPickTask: updated });
    trackReminderToggled('pick', value);
    const newProfile = { ...profile, reminderPickTask: updated };
    await rescheduleAllReminders(newProfile, todayEntry);

    if (value) {
      setTimePickerTarget('pick');
    }
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
              <Text style={styles.settingText}>Remind me to plan</Text>
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
          <Pressable
            style={styles.legalRow}
            onPress={() => openExternalUrl(APP_STORE_URL, 'App Store')}
          >
            <View style={styles.settingLeft}>
              <Feather name="star" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Rate on App Store</Text>
            </View>
            <Feather name="external-link" size={16} color={Colors.neutral} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(560)} style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>One Thing v1.1.0</Text>
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
  },
  pillSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: Colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillTextDisabled: {
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
  pickerColumnWrap: {
    alignItems: 'center',
  },
  pickerColumnLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
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
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
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
  pickerDoneBtnDisabled: {
    opacity: 0.4,
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
