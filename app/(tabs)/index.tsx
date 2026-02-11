import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { DailyEntry, saveEntry } from '@/lib/storage';
import { getGreeting, formatDate, getTodayDate, getStreakMessage } from '@/lib/storage';

type MoodType = 'energized' | 'calm' | 'neutral' | 'tough';

const GENERIC_MESSAGES = [
  "Done and dusted. The rest of the day is yours.",
  "One thing. Done. That's a win.",
  "You showed up today. That matters more than you think.",
  "Nothing left to do. How good does that feel?",
  "Today's sorted. Go enjoy the rest of it.",
  "You said you'd do it, and you did. That's who you are.",
  "That's it. You're free. Go do something fun.",
  "Look at you, showing up for yourself.",
];

const STREAK_MESSAGES: Record<number, string> = {
  3: "Three days running. Something's clicking.",
  5: "Five days in. This is becoming your thing.",
  7: "A whole week. You've earned what comes next.",
  10: "Ten days. Double digits. That's real momentum.",
  14: "Two weeks of showing up. That's not luck \u2014 that's you.",
  21: "Three weeks. You're not trying anymore \u2014 you just do this now.",
  30: "30 days. You've built something real.",
  50: "Fifty days. Most people never get here. You did.",
  100: "One hundred days. That's not a streak \u2014 that's who you are.",
};

const LEVEL_UP_MESSAGES: Record<string, string> = {
  '1_2': "You've unlocked 2 tasks per day. You earned this.",
  '2_3': "Three tasks per day. Look how far you've come.",
};

const moodOptions: { key: MoodType; icon: string; label: string }[] = [
  { key: 'energized', icon: 'flame-outline', label: 'Energized' },
  { key: 'calm', icon: 'leaf-outline', label: 'Calm' },
  { key: 'neutral', icon: 'remove-circle-outline', label: 'Neutral' },
  { key: 'tough', icon: 'fitness-outline', label: 'Tough' },
];

const moodDisplay: Record<string, { icon: string; label: string }> = {
  energized: { icon: 'flame-outline', label: 'Energized' },
  calm: { icon: 'leaf-outline', label: 'Calm' },
  neutral: { icon: 'remove-circle-outline', label: 'Neutral' },
  tough: { icon: 'fitness-outline', label: 'Tough' },
};

const SAGE_GREEN = '#7DB07A';

function AnimatedCheckmark({ animate, delay: startDelay }: { animate: boolean; delay: number }) {
  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      progress.value = withDelay(
        startDelay,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
      pulseScale.value = withDelay(
        startDelay + 600,
        withSequence(
          withTiming(1.3, { duration: 200 }),
          withSpring(1, { damping: 10 })
        )
      );
    } else {
      progress.value = 1;
      pulseScale.value = 1;
    }
  }, [animate]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [0.5, 1.1, 1]) }],
  }));

  return (
    <Animated.View style={[styles.completedCheckCircle, containerStyle]}>
      <Animated.View style={checkStyle}>
        <Feather name="check" size={18} color="#FFF" />
      </Animated.View>
    </Animated.View>
  );
}

function CompletedTaskCard({
  task,
  animate,
  onProofTap,
}: {
  task: any;
  animate: boolean;
  onProofTap?: (uri: string) => void;
}) {
  const borderOpacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      borderOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    }
  }, [animate]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const completedTime = task.completedAt
    ? new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View style={styles.completedCardOuter}>
      <Animated.View style={[styles.completedCardBorder, borderStyle]} />
      <View style={styles.completedCardInner}>
        <View style={styles.completedCardTop}>
          <AnimatedCheckmark animate={animate} delay={0} />
          <View style={styles.completedCardTextWrap}>
            <Text style={styles.completedTaskText}>{task.text}</Text>
            {completedTime && (
              <Text style={styles.completedTimeText}>Done at {completedTime}</Text>
            )}
          </View>
        </View>
        {task.proof?.uri && (
          <Pressable
            onPress={() => onProofTap?.(task.proof.uri)}
            style={styles.proofThumbnailWrap}
          >
            <Image source={{ uri: task.proof.uri }} style={styles.proofThumbnail} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ActiveTaskCard({ task, onComplete }: { task: any; onComplete: (id: string) => void }) {
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!task.isCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withTiming(0.97, { duration: 100 }),
        withSpring(1, { damping: 15 })
      );
      onComplete(task.id);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={cardStyle}>
      <Pressable
        onPress={handlePress}
        style={[styles.taskCard, task.isCompleted && styles.taskCardDoneInline]}
      >
        <View style={styles.taskLeft}>
          <View style={[styles.checkbox, task.isCompleted && styles.checkboxCompleted]}>
            {task.isCompleted && <Feather name="check" size={14} color="#FFF" />}
          </View>
          <Text style={[styles.taskText, task.isCompleted && styles.taskTextCompleted]}>
            {task.text}
          </Text>
        </View>
        {task.proof && (
          <View style={styles.proofBadge}>
            <Feather name="image" size={12} color={Colors.success} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function CelebrationOverlay({ visible, streak, leveledUp, onDismiss }: {
  visible: boolean;
  streak: number;
  leveledUp: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  const streakMsg = getStreakMessage(streak);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.celebrationOverlay} onPress={onDismiss}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.celebrationContent}>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={[styles.celebrationIcon, leveledUp && { backgroundColor: Colors.streakGlow + '30' }]}>
              <Feather
                name={leveledUp ? 'award' : 'check-circle'}
                size={48}
                color={leveledUp ? Colors.streakGlow : Colors.success}
              />
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.celebrationTitle}>
            {leveledUp ? 'Level Up!' : 'Well done!'}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.celebrationSubtitle}>
            {leveledUp
              ? "You've unlocked more tasks per day!"
              : streakMsg || 'One thing done. That\'s all it takes.'
            }
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(500)}>
            <Pressable style={styles.celebrationButton} onPress={onDismiss}>
              <Text style={styles.celebrationButtonText}>Continue</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function getCompletionMessage(
  entry: DailyEntry,
  streak: number,
  leveledUp: boolean,
  prevLevel?: number
): { message: string; index: number } {
  if (leveledUp && prevLevel !== undefined) {
    const key = `${prevLevel}_${prevLevel + 1}`;
    if (LEVEL_UP_MESSAGES[key]) {
      return { message: LEVEL_UP_MESSAGES[key], index: -2 };
    }
  }

  if (STREAK_MESSAGES[streak]) {
    return { message: STREAK_MESSAGES[streak], index: -1 };
  }

  if (entry.completionMessageIndex !== undefined && entry.completionMessageIndex >= 0) {
    return {
      message: GENERIC_MESSAGES[entry.completionMessageIndex % GENERIC_MESSAGES.length],
      index: entry.completionMessageIndex,
    };
  }

  const randomIndex = Math.floor(Math.random() * GENERIC_MESSAGES.length);
  return { message: GENERIC_MESSAGES[randomIndex], index: randomIndex };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    profile,
    todayEntry,
    entries,
    addTask,
    completeTask,
    addReflection,
    canAddMoreTasks,
    yesterdayMissed,
    justLeveledUp,
    setJustLeveledUp,
    isLoading,
  } = useApp();

  const [taskInput, setTaskInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showProofSheet, setShowProofSheet] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionNote, setReflectionNote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [proofViewUri, setProofViewUri] = useState<string | null>(null);
  const [playAnimation, setPlayAnimation] = useState(false);
  const justCompletedRef = useRef(false);

  const allDone = (todayEntry?.tasks?.length ?? 0) > 0 && (todayEntry?.tasks?.every(t => t.isCompleted) ?? false);
  const hasTasks = (todayEntry?.tasks?.length ?? 0) > 0;
  const someDone = hasTasks && !allDone && todayEntry!.tasks.some(t => t.isCompleted);

  const messageOpacity = useSharedValue(0);
  const reflectionOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  const messageAnimStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  const reflectionAnimStyle = useAnimatedStyle(() => ({
    opacity: reflectionOpacity.value,
  }));

  const footerAnimStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  useEffect(() => {
    if (allDone && todayEntry) {
      if (!todayEntry.completionAnimationSeen && !justCompletedRef.current) {
        justCompletedRef.current = true;
        setPlayAnimation(true);

        messageOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
        reflectionOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
        footerOpacity.value = withDelay(1500, withTiming(1, { duration: 500 }));

        const markSeen = async () => {
          const msgData = getCompletionMessage(todayEntry, profile?.currentLevelStreak ?? 0, justLeveledUp);
          const updated = {
            ...todayEntry,
            completionAnimationSeen: true,
            completionMessageIndex: todayEntry.completionMessageIndex ?? msgData.index,
          };
          await saveEntry(updated);
        };
        setTimeout(markSeen, 2000);
      } else {
        messageOpacity.value = 1;
        reflectionOpacity.value = 1;
        footerOpacity.value = 1;
        setPlayAnimation(false);
      }
    }
  }, [allDone, todayEntry?.completed]);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isLoading, profile]);

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addTask(taskInput.trim());
    setTaskInput('');
    setShowInput(false);
  };

  const handleCompleteTask = (taskId: string) => {
    setCompletingTaskId(taskId);
    setShowProofSheet(true);
  };

  const handleProofOption = async (type: 'photo' | 'screenshot' | 'skip') => {
    if (!completingTaskId) return;

    if (type === 'skip') {
      await completeTask(completingTaskId);
      setShowProofSheet(false);
      setCompletingTaskId(null);
      checkForCompletion();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await completeTask(completingTaskId, {
          type: type === 'photo' ? 'photo' : 'screenshot',
          uri: result.assets[0].uri,
        });
      } else {
        await completeTask(completingTaskId);
      }
    } catch {
      await completeTask(completingTaskId);
    }

    setShowProofSheet(false);
    setCompletingTaskId(null);
    checkForCompletion();
  };

  const checkForCompletion = () => {
    setTimeout(() => {
      if (justLeveledUp) {
        setShowCelebration(true);
      } else {
        const updated = todayEntry?.tasks?.map(t =>
          t.id === completingTaskId ? { ...t, isCompleted: true } : t
        );
        const done = updated?.every(t => t.isCompleted);
        if (done && updated && updated.length > 0) {
          setShowCelebration(true);
        }
      }
    }, 300);
  };

  const handleCelebrationDismiss = () => {
    setShowCelebration(false);
    setJustLeveledUp(false);
    if (allDone && !todayEntry?.reflection) {
      setTimeout(() => setShowReflection(true), 300);
    }
  };

  const handleReflection = async (mood: MoodType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addReflection(mood, reflectionNote.trim() || undefined);
    setShowReflection(false);
    setReflectionNote('');
  };

  if (isLoading || !profile) return <View style={[styles.container, { paddingTop: insets.top }]} />;

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const greeting = getGreeting();
  const dateStr = formatDate(getTodayDate());
  const streakDays = profile.currentLevelStreak;

  const completionMsg = allDone && todayEntry
    ? getCompletionMessage(todayEntry, streakDays, justLeveledUp, justLeveledUp ? (profile.currentLevel - 1) : undefined)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 20, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <Text style={styles.greeting}>
            {greeting}{profile.name ? `, ${profile.name}` : ''}
          </Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.levelBar}>
          <Text style={styles.levelText}>Level {profile.currentLevel}</Text>
          <View style={styles.levelDots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[styles.levelDot, i < streakDays && styles.levelDotFilled]}
              />
            ))}
          </View>
          <Text style={styles.levelDaysText}>Day {Math.min(streakDays, 7)} of 7</Text>
        </Animated.View>

        {yesterdayMissed && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.missedBanner}>
            <Text style={styles.missedText}>
              Yesterday didn't go as planned — that's completely okay. Every day is a fresh start.
            </Text>
          </Animated.View>
        )}

        {streakDays > 0 && !allDone && (
          <Animated.View entering={FadeInDown.delay(250)} style={styles.streakBanner}>
            <Feather name="zap" size={16} color={Colors.streakGlow} />
            <Text style={styles.streakText}>{streakDays} day streak</Text>
          </Animated.View>
        )}

        {allDone && todayEntry ? (
          <View style={styles.completedStateWrap}>
            <Animated.View style={[styles.completionMessageWrap, messageAnimStyle]}>
              <Text style={styles.completionMessage}>
                {completionMsg?.message}
              </Text>
            </Animated.View>

            {todayEntry.tasks.map((task) => (
              <CompletedTaskCard
                key={task.id}
                task={task}
                animate={playAnimation}
                onProofTap={(uri) => setProofViewUri(uri)}
              />
            ))}

            {todayEntry.reflection && (
              <Animated.View style={[styles.journalWrap, reflectionAnimStyle]}>
                <View style={styles.journalMoodRow}>
                  <Ionicons
                    name={moodDisplay[todayEntry.reflection.mood]?.icon as any}
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.journalMoodLabel}>
                    {moodDisplay[todayEntry.reflection.mood]?.label}
                  </Text>
                </View>
                {todayEntry.reflection.note ? (
                  <Text style={styles.journalNote}>
                    "{todayEntry.reflection.note}"
                  </Text>
                ) : null}
              </Animated.View>
            )}

            <Animated.View style={[styles.footerWrap, footerAnimStyle]}>
              <Text style={styles.footerText}>See you tomorrow</Text>
            </Animated.View>
          </View>
        ) : hasTasks ? (
          <View style={styles.tasksSection}>
            {todayEntry?.tasks.map((task) => (
              <ActiveTaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
              />
            ))}

            {canAddMoreTasks && !allDone && (
              <Pressable
                style={styles.addMoreButton}
                onPress={() => setShowInput(true)}
              >
                <Feather name="plus" size={18} color={Colors.textSecondary} />
                <Text style={styles.addMoreText}>
                  Add another task ({todayEntry?.tasks.length || 0}/{profile.currentLevel})
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="edit-3" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>What's your one thing today?</Text>
            <Text style={styles.emptySubtitle}>
              Focus on just one task. That's all it takes.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => setShowInput(true)}
            >
              <Feather name="plus" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add your task</Text>
            </Pressable>
          </Animated.View>
        )}

        {showInput && (
          <Animated.View entering={SlideInUp.duration(300)} style={styles.inputCard}>
            <TextInput
              testID="task-input"
              style={styles.taskInput}
              placeholder="What will you focus on?"
              placeholderTextColor={Colors.neutral}
              value={taskInput}
              onChangeText={setTaskInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddTask}
              multiline={false}
            />
            <View style={styles.inputActions}>
              <Pressable onPress={() => { setShowInput(false); setTaskInput(''); }}>
                <Feather name="x" size={22} color={Colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={handleAddTask}
                style={[styles.submitBtn, !taskInput.trim() && { opacity: 0.4 }]}
                disabled={!taskInput.trim()}
              >
                <Feather name="check" size={20} color="#FFF" />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showProofSheet} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowProofSheet(false)}>
          <Pressable style={styles.sheetContent} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add proof</Text>
            <Text style={styles.sheetSubtitle}>Optional — capture your progress</Text>
            <View style={styles.sheetOptions}>
              <Pressable
                style={({ pressed }) => [styles.proofOption, pressed && { opacity: 0.7 }]}
                onPress={() => handleProofOption('photo')}
              >
                <View style={styles.proofIconWrap}>
                  <Feather name="camera" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.proofOptionText}>Upload Photo</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.proofOption, pressed && { opacity: 0.7 }]}
                onPress={() => handleProofOption('screenshot')}
              >
                <View style={styles.proofIconWrap}>
                  <Feather name="image" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.proofOptionText}>Upload Screenshot</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.skipProofButton, pressed && { opacity: 0.7 }]}
              onPress={() => handleProofOption('skip')}
            >
              <Text style={styles.skipProofText}>Skip — just mark as done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showReflection} transparent animationType="fade">
        <View style={styles.reflectionOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.reflectionSheet}>
            <Text style={styles.reflectionTitle}>How did today feel?</Text>
            <View style={styles.moodGrid}>
              {moodOptions.map((mood) => (
                <Pressable
                  key={mood.key}
                  style={({ pressed }) => [styles.moodOption, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                  onPress={() => handleReflection(mood.key)}
                >
                  <View style={styles.moodIconWrap}>
                    <Ionicons name={mood.icon as any} size={28} color={Colors.accent} />
                  </View>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.reflectionInput}
              placeholder="Anything to remember?"
              placeholderTextColor={Colors.neutral}
              value={reflectionNote}
              onChangeText={setReflectionNote}
            />
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={!!proofViewUri} transparent animationType="fade">
        <Pressable
          style={styles.proofViewOverlay}
          onPress={() => setProofViewUri(null)}
        >
          {proofViewUri && (
            <Image
              source={{ uri: proofViewUri }}
              style={styles.proofViewImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={styles.proofViewClose}
            onPress={() => setProofViewUri(null)}
          >
            <Feather name="x" size={24} color="#FFF" />
          </Pressable>
        </Pressable>
      </Modal>

      <CelebrationOverlay
        visible={showCelebration}
        streak={streakDays}
        leveledUp={justLeveledUp}
        onDismiss={handleCelebrationDismiss}
      />
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  greeting: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  levelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  levelText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: Colors.accent,
  },
  levelDots: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.inputBg,
  },
  levelDotFilled: {
    backgroundColor: Colors.accent,
  },
  levelDaysText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  missedBanner: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  missedText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  streakText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: Colors.streakGlow,
  },

  tasksSection: {
    gap: 12,
    marginTop: 8,
  },
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardDoneInline: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.neutral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  taskText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  taskTextCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  proofBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  addMoreText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  completedStateWrap: {
    marginTop: 8,
  },
  completionMessageWrap: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  completionMessage: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 21,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  completedCardOuter: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: 'rgba(125, 176, 122, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  completedCardBorder: {
    width: 4,
    backgroundColor: SAGE_GREEN,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  completedCardInner: {
    flex: 1,
    padding: 18,
    gap: 12,
  },
  completedCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  completedCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SAGE_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  completedCardTextWrap: {
    flex: 1,
    gap: 4,
  },
  completedTaskText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  completedTimeText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.neutral,
  },
  proofThumbnailWrap: {
    marginLeft: 42,
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.inputBg,
  },
  proofThumbnail: {
    width: 56,
    height: 56,
  },

  journalWrap: {
    marginTop: 20,
    paddingHorizontal: 8,
    gap: 6,
  },
  journalMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journalMoodLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  journalNote: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    marginTop: 2,
    lineHeight: 21,
  },

  footerWrap: {
    marginTop: 60,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.neutral,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  taskInput: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    color: Colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  sheetOptions: {
    gap: 12,
    marginBottom: 20,
  },
  proofOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
  },
  proofIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofOptionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  skipProofButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipProofText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  reflectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reflectionSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
  },
  reflectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodOption: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  moodIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reflectionInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
  },

  proofViewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofViewImage: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH - 48,
    borderRadius: 12,
  },
  proofViewClose: {
    position: 'absolute' as const,
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(250, 247, 242, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  celebrationContent: {
    alignItems: 'center',
    gap: 16,
  },
  celebrationIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  celebrationTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  celebrationSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  celebrationButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
  },
  celebrationButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
});
