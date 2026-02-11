import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { calculateCompletionRate } from '@/lib/storage';

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, entries, updateProfile, isLoading } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

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

  const handleToggleReminder = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateProfile({ reminderEnabled: value });
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

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

        <View style={styles.statsGrid}>
          <StatCard icon="zap" label="Current Streak" value={profile.currentLevelStreak} delay={200} />
          <StatCard icon="trending-up" label="Longest Streak" value={profile.longestStreak} delay={250} />
          <StatCard icon="check-circle" label="Tasks Done" value={profile.totalTasksCompleted} delay={300} />
          <StatCard icon="percent" label="Completion" value={`${completionRate}%`} delay={350} />
        </View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Feather name="bell" size={18} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Daily Reminder</Text>
            </View>
            <Switch
              value={profile.reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: Colors.neutral, true: Colors.accent + '60' }}
              thumbColor={profile.reminderEnabled ? Colors.accent : Colors.surface}
            />
          </View>

          {profile.reminderEnabled && (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="clock" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingText}>Reminder Time</Text>
              </View>
              <Text style={styles.settingValue}>{profile.reminderTime}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>One Thing v1.0.0</Text>
          <Text style={styles.aboutCredit}>Made with care</Text>
        </Animated.View>
      </ScrollView>
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
  },
  settingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  settingValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
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
});
