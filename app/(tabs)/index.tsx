import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Colors from '@/constants/colors';
import OrganicCheck from '@/components/OrganicCheck';
import { useApp } from '@/lib/AppContext';
import {
  DailyEntry,
  saveEntry,
  TaskItem,
  isImageSizeValid,
  getMaxImageSize,
  getGreeting,
  formatDate,
  getTodayDate,
  getStreakMessage,
} from '@/lib/storage';
import { createLogger } from '@/lib/errorReporting';
import { useScreenAnalytics } from '@/lib/useAnalytics';
import { trackProofUploaded, trackProofSkipped } from '@/lib/analytics';
import { hasWidgetTipBeenShown, markWidgetTipShown } from '@/lib/widgetData';
import {
  TaskInputModal,
  ProofSheet,
  ReflectionModal,
  ProofViewModal,
  TimePickerModal,
  type ProofOption,
  type MoodType,
} from '@/components/modals';
import { scheduleTaskTimeNotification, cancelTaskTimeNotification } from '@/lib/notifications';
import StorageWarningBanner from '@/components/StorageWarningBanner';

const logger = createLogger('HomeScreen');

function formatTime12hDisplay(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

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

const moodDisplay: Record<string, { icon: string; label: string }> = {
  energized: { icon: 'flame-outline', label: 'Energized' },
  calm: { icon: 'leaf-outline', label: 'Calm' },
  neutral: { icon: 'remove-circle-outline', label: 'Neutral' },
  tough: { icon: 'fitness-outline', label: 'Tough' },
};

const SAGE_GREEN = '#7DB07A';

function AnimatedCheckmark({ animate, delay: startDelay }: { animate: boolean; delay: number }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      pulseScale.value = withDelay(
        startDelay + 600,
        withSequence(
          withTiming(1.3, { duration: 200 }),
          withSpring(1, { damping: 10 })
        )
      );
    } else {
      pulseScale.value = 1;
    }
  }, [animate, pulseScale, startDelay]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.completedCheckWrap, containerStyle]}>
      <OrganicCheck
        size={32}
        color={SAGE_GREEN}
        animate={animate}
        animationDuration={600}
        animationDelay={animate ? startDelay : 0}
        showCircle={true}
      />
    </Animated.View>
  );
}

const CompletedTaskCard = memo(function CompletedTaskCard({
  task,
  animate,
  onProofTap,
}: {
  task: TaskItem;
  animate: boolean;
  onProofTap?: (uri: string) => void;
}) {
  const borderOpacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      borderOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    }
  }, [animate, borderOpacity]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const completedTime = task.completedAt
    ? new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View
      style={styles.completedCardOuter}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Completed task: ${task.text}${completedTime ? `. Done at ${completedTime}` : ''}`}
    >
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
            accessible={true}
            accessibilityLabel="View proof image"
            accessibilityRole="button"
          >
            <Image source={{ uri: task.proof.uri }} style={styles.proofThumbnail} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

const ActiveTaskCard = memo(function ActiveTaskCard({
  task,
  onComplete,
}: {
  task: TaskItem;
  onComplete: (id: string) => void;
}) {
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
    <Animated.View entering={FadeInDown.duration(400).springify()}>
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={handlePress}
          style={[styles.taskCard, task.isCompleted && styles.taskCardDoneInline]}
          accessible={true}
          accessibilityLabel={`Task: ${task.text}. ${task.isCompleted ? 'Completed' : 'Tap to mark as complete'}`}
          accessibilityRole="button"
          accessibilityState={{ checked: task.isCompleted }}
        >
          <View style={styles.taskLeft}>
            <View style={[styles.checkbox, task.isCompleted && styles.checkboxCompleted]}>
              {task.isCompleted && <Feather name="check" size={14} color="#FFF" />}
            </View>
            <View style={styles.taskTextWrap}>
              <Text style={[styles.taskText, task.isCompleted && styles.taskTextCompleted]}>
                {task.text}
              </Text>
              {task.scheduledTime && !task.isCompleted && (
                <View style={styles.scheduledTimeTag}>
                  <Feather name="clock" size={11} color={Colors.accent} />
                  <Text style={styles.scheduledTimeText}>
                    {formatTime12hDisplay(task.scheduledTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {task.proof && (
            <View
              style={styles.proofBadge}
              accessible={true}
              accessibilityLabel="Has proof attached"
            >
              <Feather name="image" size={12} color={Colors.success} />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

// Mindful encouragement component with gentle breathing animation
const MINDFUL_MESSAGES = [
  "Take your time. There's no rush.",
  "One small step at a time.",
  "You've got this, whenever you're ready.",
  "Breathe. You're doing great.",
  "Progress, not perfection.",
  "Trust the process.",
];

function MindfulEncouragement() {
  const breatheScale = useSharedValue(1);
  const breatheOpacity = useSharedValue(0.4);
  const [message] = useState(() =>
    MINDFUL_MESSAGES[Math.floor(Math.random() * MINDFUL_MESSAGES.length)]
  );

  useEffect(() => {
    // Gentle breathing animation - 4 seconds inhale, 4 seconds exhale
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite repeat
      false
    );
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [breatheScale, breatheOpacity]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
    opacity: breatheOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.mindfulContainer}>
      <View style={styles.mindfulContent}>
        <Animated.View style={[styles.breatheCircle, breatheStyle]}>
          <View style={styles.breatheInner} />
        </Animated.View>
        <Text style={styles.mindfulText}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function FloatingParticle({ delay, startX, emoji }: { delay: number; startX: number; emoji: string }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1200, withTiming(0, { duration: 600 }))
    ));
    translateY.value = withDelay(delay, withTiming(-180, { duration: 2100, easing: Easing.out(Easing.cubic) }));
    translateX.value = withDelay(delay, withTiming(startX + (Math.random() - 0.5) * 60, { duration: 2100 }));
    rotate.value = withDelay(delay, withTiming((Math.random() - 0.5) * 40, { duration: 2100 }));
  }, [delay, opacity, rotate, startX, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
    </Animated.View>
  );
}

const CELEBRATION_EMOJIS = ['🎉', '✨', '🌟', '💪', '🔥', '⭐'];

function CelebrationOverlay({ visible, streak, leveledUp, onDismiss }: {
  visible: boolean;
  streak: number;
  leveledUp: boolean;
  onDismiss: () => void;
}) {
  const celebScale = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    celebScale.value = withDelay(100, withSequence(
      withSpring(1.15, { damping: 6, stiffness: 120 }),
      withSpring(1, { damping: 12 })
    ));
  }, [celebScale, visible]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebScale.value }],
  }));

  if (!visible) return null;

  const streakMsg = getStreakMessage(streak);
  const particles = Array.from({ length: 8 }, (_, i) => ({
    delay: 200 + i * 120,
    startX: (i - 4) * 30,
    emoji: CELEBRATION_EMOJIS[i % CELEBRATION_EMOJIS.length],
  }));

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.celebrationOverlay} onPress={onDismiss}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.celebrationContent}>
          <View style={styles.particlesContainer}>
            {particles.map((p, i) => (
              <FloatingParticle key={i} delay={p.delay} startX={p.startX} emoji={p.emoji} />
            ))}
          </View>
          <Animated.View style={iconAnimStyle}>
            <View style={[styles.celebrationIcon, leveledUp && { backgroundColor: Colors.streakGlow + '30' }]}>
              <Text style={{ fontSize: 44 }}>{leveledUp ? '🏆' : '🎉'}</Text>
            </View>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.celebrationTitle}>
            {leveledUp ? 'Level Up!' : 'Nailed it!'}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(450)} style={styles.celebrationSubtitle}>
            {leveledUp
              ? "You've unlocked more tasks per day! 🚀"
              : streakMsg || 'One thing done. That\'s all it takes. ✨'
            }
          </Animated.Text>
          {streak > 0 && !leveledUp && (
            <Animated.View entering={FadeInDown.delay(550)} style={styles.celebrationStreakBadge}>
              <Text style={styles.celebrationStreakText}>🔥 {streak} day streak</Text>
            </Animated.View>
          )}
          <Animated.View entering={FadeInDown.delay(650)}>
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
    addTask,
    completeTask,
    addReflection,
    canAddMoreTasks,
    refreshData,
    yesterdayMissed,
    justLeveledUp,
    setJustLeveledUp,
    isLoading,
    storageStatus,
  } = useApp();

  // Track screen views
  useScreenAnalytics('Home');

  const [taskInput, setTaskInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showProofSheet, setShowProofSheet] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionNote, setReflectionNote] = useState('');
  const [showStorageWarning, setShowStorageWarning] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [proofViewUri, setProofViewUri] = useState<string | null>(null);
  const [playAnimation, setPlayAnimation] = useState(false);
  const [proofToast, setProofToast] = useState(false);
  const [showWidgetTip, setShowWidgetTip] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingTaskName, setPendingTaskName] = useState('');
  const justCompletedRef = useRef(false);
  const pendingCelebrationRef = useRef(false);

  const allDone = (todayEntry?.tasks?.length ?? 0) > 0 && (todayEntry?.tasks?.every(t => t.isCompleted) ?? false);
  const hasTasks = (todayEntry?.tasks?.length ?? 0) > 0;

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
  }, [
    allDone,
    todayEntry,
    profile?.currentLevelStreak,
    justLeveledUp,
    footerOpacity,
    messageOpacity,
    reflectionOpacity,
  ]);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isLoading, profile]);

  useEffect(() => {
    if (allDone && Platform.OS !== 'web') {
      hasWidgetTipBeenShown().then(shown => {
        if (!shown) setShowWidgetTip(true);
      });
    }
  }, [allDone]);

  const handleDismissWidgetTip = () => {
    setShowWidgetTip(false);
    markWidgetTipShown();
  };

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const trimmed = taskInput.trim();
      await addTask(trimmed);
      setPendingTaskName(trimmed);
      setTaskInput('');
      setShowInput(false);
      setShowTimePicker(true);
    } catch (e) {
      logger.error(e instanceof Error ? e : new Error(String(e)), 'addTask');
    }
  };

  const handleSetTaskTime = async (time: string) => {
    setShowTimePicker(false);
    if (!todayEntry) return;
    const lastTask = todayEntry.tasks[todayEntry.tasks.length - 1];
    if (!lastTask) return;

    const updatedTasks = todayEntry.tasks.map(t =>
      t.id === lastTask.id ? { ...t, scheduledTime: time } : t
    );
    const updated: DailyEntry = { ...todayEntry, tasks: updatedTasks };
    await saveEntry(updated);
    await refreshData();

    await scheduleTaskTimeNotification(lastTask.id, lastTask.text, time);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSkipTimePicker = () => {
    setShowTimePicker(false);
  };

  const handleCompleteTask = (taskId: string) => {
    setCompletingTaskId(taskId);
    setShowProofSheet(true);
  };

  const handleProofOption = async (type: ProofOption) => {
    if (!completingTaskId) return;

    let hadProof = false;

    if (type === 'skip') {
      try {
        trackProofSkipped();
        await completeTask(completingTaskId);
        setShowProofSheet(false);
        setCompletingTaskId(null);
        checkForCompletion(false);
      } catch (e) {
        logger.error(e instanceof Error ? e : new Error(String(e)), 'completeTask');
        setShowProofSheet(false);
        setCompletingTaskId(null);
      }
      return;
    }

    try {
      let result;

      if (type === 'camera') {
        // Request camera permissions first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          logger.warn('Camera permission denied');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      } else {
        // Upload from device library
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Validate image size before saving
        try {
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          if (fileInfo.exists && 'size' in fileInfo && fileInfo.size) {
            if (!isImageSizeValid(fileInfo.size)) {
              // Image too large - show error and complete without proof
              const maxSizeMB = (getMaxImageSize() / (1024 * 1024)).toFixed(1);
              logger.warn(`Image too large: ${(fileInfo.size / (1024 * 1024)).toFixed(1)}MB (max ${maxSizeMB}MB)`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              // Complete task without proof since image is too large
              trackProofSkipped();
              await completeTask(completingTaskId);
              setShowProofSheet(false);
              setCompletingTaskId(null);
              checkForCompletion(false);
              return;
            }
          }
        } catch {
          // If we can't check size, proceed anyway but log warning
          logger.warn('Could not verify image size, proceeding anyway');
        }

        trackProofUploaded('photo');
        await completeTask(completingTaskId, {
          type: 'photo',
          uri: imageUri,
        });
        hadProof = true;
        setShowProofSheet(false);
        setCompletingTaskId(null);
        checkForCompletion(hadProof);
      }
      // If cancelled, do nothing - keep proof sheet open so user can try again or skip
    } catch (e) {
      logger.error(e instanceof Error ? e : new Error(String(e)), 'pickImage');
      // On error, don't complete the task - let user try again or skip
    }
  };

  const checkForCompletion = (showToast: boolean) => {
    const willCelebrate = () => {
      if (justLeveledUp) return true;
      const updated = todayEntry?.tasks?.map(t =>
        t.id === completingTaskId ? { ...t, isCompleted: true } : t
      );
      return updated?.every(t => t.isCompleted) && updated && updated.length > 0;
    };

    if (showToast) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProofToast(true);
      pendingCelebrationRef.current = !!willCelebrate();
      setTimeout(() => {
        setProofToast(false);
        if (pendingCelebrationRef.current) {
          pendingCelebrationRef.current = false;
          setTimeout(() => setShowCelebration(true), 200);
        }
      }, 2200);
    } else {
      setTimeout(() => {
        if (willCelebrate()) {
          setShowCelebration(true);
        }
      }, 300);
    }
  };

  const handleCelebrationDismiss = () => {
    setShowCelebration(false);
    setJustLeveledUp(false);
    if (allDone && !todayEntry?.reflection) {
      setTimeout(() => setShowReflection(true), 300);
    }
  };

  const handleReflection = async (mood: MoodType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addReflection(mood, reflectionNote.trim() || undefined);
      setShowReflection(false);
      setReflectionNote('');
    } catch (e) {
      logger.error(e instanceof Error ? e : new Error(String(e)), 'saveReflection');
    }
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

        {showStorageWarning && storageStatus && (storageStatus.isWarning || storageStatus.isCritical) && (
          <StorageWarningBanner
            storageStatus={storageStatus}
            onDismiss={() => setShowStorageWarning(false)}
          />
        )}

        {yesterdayMissed && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.missedBanner}>
            <Text style={styles.missedText}>
              Yesterday didn&apos;t go as planned - that&apos;s completely okay. Every day is a fresh start.
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
                    &quot;{todayEntry.reflection.note}&quot;
                  </Text>
                ) : null}
              </Animated.View>
            )}

            {showWidgetTip && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.widgetTipBanner}>
                <View style={styles.widgetTipHeader}>
                  <Feather name="smartphone" size={18} color={Colors.accent} />
                  <Text style={styles.widgetTipTitle}>Stay on track</Text>
                  <Pressable
                    onPress={handleDismissWidgetTip}
                    hitSlop={12}
                    style={styles.widgetTipClose}
                  >
                    <Feather name="x" size={16} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                <Text style={styles.widgetTipText}>
                  Add the One Thing widget to your home screen to keep your daily task visible at a glance.
                </Text>
                <Text style={styles.widgetTipHow}>
                  Long-press your home screen → Widgets → One Thing
                </Text>
              </Animated.View>
            )}

            <Animated.View style={[styles.footerWrap, footerAnimStyle]}>
              <Text style={styles.footerEmoji}>🌙</Text>
              <Text style={styles.footerText}>See you tomorrow</Text>
              <Text style={styles.footerSubtext}>Rest up, you earned it ✨</Text>
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

            {!allDone && <MindfulEncouragement />}

            {canAddMoreTasks && !allDone && (
              <Pressable
                style={styles.addMoreButton}
                onPress={() => setShowInput(true)}
                accessible={true}
                accessibilityLabel={`Add another task. Current tasks: ${todayEntry?.tasks.length || 0} of ${profile.currentLevel}`}
                accessibilityRole="button"
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
            <View style={styles.watermarkWrap}>
              <OrganicCheck
                size={200}
                color={Colors.accent}
                opacity={0.06}
                showCircle={true}
              />
            </View>
            <View style={styles.emptyIconWrap}>
              <OrganicCheck size={56} color={Colors.accent} showCircle={true} />
            </View>
            <Text style={styles.emptyTitle}>What&apos;s your one thing today?</Text>
            <Text style={styles.emptySubtitle}>
              Focus on just one task. That&apos;s all it takes.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => setShowInput(true)}
              accessible={true}
              accessibilityLabel="Add your task"
              accessibilityRole="button"
              accessibilityHint="Opens a dialog to enter your task for today"
            >
              <Feather name="plus" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add your task</Text>
            </Pressable>
          </Animated.View>
        )}

      </ScrollView>

      <TaskInputModal
        visible={showInput}
        value={taskInput}
        onChangeText={setTaskInput}
        onSubmit={handleAddTask}
        onClose={() => setShowInput(false)}
      />

      <TimePickerModal
        visible={showTimePicker}
        taskName={pendingTaskName}
        onSetTime={handleSetTaskTime}
        onSkip={handleSkipTimePicker}
      />

      <ProofSheet
        visible={showProofSheet}
        onSelect={handleProofOption}
        onClose={() => setShowProofSheet(false)}
      />

      <ReflectionModal
        visible={showReflection}
        note={reflectionNote}
        onNoteChange={setReflectionNote}
        onSelectMood={handleReflection}
      />

      <ProofViewModal
        uri={proofViewUri}
        onClose={() => setProofViewUri(null)}
      />

      {proofToast && (
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={[styles.proofToast, { bottom: insets.bottom + 80 }]}
        >
          <View style={styles.proofToastIcon}>
            <Feather name="check-circle" size={22} color={Colors.success} />
          </View>
          <View style={styles.proofToastTextWrap}>
            <Text style={styles.proofToastTitle}>Proof submitted</Text>
            <Text style={styles.proofToastMsg}>Really proud of you for showing up today</Text>
          </View>
        </Animated.View>
      )}

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
  mindfulContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  mindfulContent: {
    alignItems: 'center',
    gap: 20,
  },
  breatheCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breatheInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    opacity: 0.3,
  },
  mindfulText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 40,
    lineHeight: 22,
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
  taskTextWrap: {
    flex: 1,
    gap: 4,
  },
  taskText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  taskTextCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  scheduledTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduledTimeText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.accent,
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
  completedCheckWrap: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
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
    gap: 6,
  },
  footerEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  footerText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  footerSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.neutral,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  watermarkWrap: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
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
  inputModalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inputModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  inputSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  inputSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 16,
  },
  inputSheetTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  taskInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
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

  proofToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    zIndex: 999,
  },
  proofToastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofToastTextWrap: {
    flex: 1,
    gap: 2,
  },
  proofToastTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  proofToastMsg: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(250, 247, 242, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  celebrationContent: {
    alignItems: 'center',
    gap: 16,
  },
  particlesContainer: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  celebrationIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  celebrationTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
  },
  celebrationSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 280,
  },
  celebrationStreakBadge: {
    backgroundColor: Colors.streakGlow + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  celebrationStreakText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  celebrationButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 8,
  },
  celebrationButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  widgetTipBanner: {
    backgroundColor: Colors.accentLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.accent + '20',
  },
  widgetTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  widgetTipTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  widgetTipClose: {
    padding: 4,
  },
  widgetTipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
  },
  widgetTipHow: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
