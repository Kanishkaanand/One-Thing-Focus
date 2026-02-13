import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import OrganicCheck from '@/components/OrganicCheck';
import { useApp } from '@/lib/AppContext';
import { formatTime12h } from '@/lib/storage';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useScreenAnalytics } from '@/lib/useAnalytics';
import { trackOnboardingCompleted } from '@/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    icon: 'layers' as const,
    title: 'Feeling overwhelmed?',
    subtitle: 'Too many tasks. Too many lists.\nToo much noise.',
  },
  {
    key: '2',
    icon: 'sun' as const,
    title: 'What if you just did\none thing today?',
    subtitle: 'One task. One focus.\nThat\'s all it takes.',
  },
  {
    key: '3',
    icon: 'heart' as const,
    title: 'Start small.\nBuild momentum.',
    subtitle: 'One thing at a time.\nEvery day is a fresh start.',
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function TimePickerInline({
  value,
  onChange,
}: {
  value: string;
  onChange: (time: string) => void;
}) {
  const [h, m] = value.split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState(h);
  const [selectedMinute, setSelectedMinute] = useState(m);
  const [showPicker, setShowPicker] = useState(false);

  const applyTime = (hour: number, minute: number) => {
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onChange(timeStr);
  };

  if (!showPicker) {
    return (
      <Pressable
        onPress={() => setShowPicker(true)}
        style={styles.timeChip}
      >
        <Feather name="clock" size={14} color={Colors.accent} />
        <Text style={styles.timeChipText}>{formatTime12h(value)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.timePickerContainer}>
      <View style={styles.timePickerRow}>
        <ScrollView
          style={styles.timePickerColumn}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timePickerColumnContent}
        >
          {HOURS.map(hour => (
            <Pressable
              key={hour}
              onPress={() => {
                setSelectedHour(hour);
                applyTime(hour, selectedMinute);
              }}
              style={[styles.timeOption, selectedHour === hour && styles.timeOptionSelected]}
            >
              <Text style={[styles.timeOptionText, selectedHour === hour && styles.timeOptionTextSelected]}>
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          style={styles.timePickerColumn}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timePickerColumnContent}
        >
          {MINUTES.map(minute => (
            <Pressable
              key={minute}
              onPress={() => {
                setSelectedMinute(minute);
                applyTime(selectedHour, minute);
              }}
              style={[styles.timeOption, selectedMinute === minute && styles.timeOptionSelected]}
            >
              <Text style={[styles.timeOptionText, selectedMinute === minute && styles.timeOptionTextSelected]}>
                :{String(minute).padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Pressable
        onPress={() => setShowPicker(false)}
        style={styles.timePickerDone}
      >
        <Feather name="check" size={18} color={Colors.accent} />
      </Pressable>
    </View>
  );
}

function SlideItem({ item, index }: { item: typeof slides[0]; index: number }) {
  const isLastSlide = index === 2;
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconContainer}>
        {isLastSlide ? (
          <View style={[styles.iconCircle, styles.iconCircleAccent]}>
            <OrganicCheck size={80} color={Colors.accent} />
          </View>
        ) : (
          <View style={[styles.iconCircle, index === 1 && styles.iconCircleAccent]}>
            <Feather
              name={item.icon}
              size={40}
              color={index === 1 ? Colors.accent : Colors.textSecondary}
            />
          </View>
        )}
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.delay(300).duration(500)}
        style={styles.slideTitle}
      >
        {item.title}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(450).duration(500)}
        style={styles.slideSubtitle}
      >
        {item.subtitle}
      </Animated.Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [name, setName] = useState('');
  const [pickTime, setPickTime] = useState('08:00');
  const [completeTime, setCompleteTime] = useState('18:00');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Track screen views
  useScreenAnalytics('Onboarding');

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowNameInput(true);
    }
  };

  const handleNameDone = () => {
    setShowNameInput(false);
    setShowReminderSetup(true);
  };

  const handleEnableReminders = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const granted = await requestNotificationPermissions();
    if (granted) {
      await updateProfile({
        name: name.trim(),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        reminderPickTask: { enabled: true, time: pickTime },
        reminderCompleteTask: { enabled: true, time: completeTime },
      });
      trackOnboardingCompleted(!!name.trim(), true);
      router.replace('/(tabs)');
    } else {
      setPermissionDenied(true);
      await updateProfile({
        name: name.trim(),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        reminderPickTask: { enabled: false, time: pickTime },
        reminderCompleteTask: { enabled: false, time: completeTime },
      });
      trackOnboardingCompleted(!!name.trim(), false);
      setTimeout(() => router.replace('/(tabs)'), 1500);
    }
  };

  const handleSkipReminders = async () => {
    await updateProfile({
      name: name.trim(),
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
      reminderPickTask: { enabled: false, time: pickTime },
      reminderCompleteTask: { enabled: false, time: completeTime },
    });
    trackOnboardingCompleted(!!name.trim(), false);
    router.replace('/(tabs)');
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  if (showReminderSetup) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.reminderContainer}>
          <View style={styles.reminderIconWrap}>
            <Feather name="bell" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.reminderTitle}>Stay on track, gently.</Text>
          <Text style={styles.reminderSubtitle}>
            We&apos;ll send you two quiet nudges each day - one to pick your task, one to finish it.
          </Text>

          <View style={styles.reminderOptions}>
            <View style={styles.reminderRow}>
              <View style={styles.reminderLabel}>
                <Feather name="sunrise" size={16} color={Colors.textSecondary} />
                <Text style={styles.reminderLabelText}>Pick your task</Text>
              </View>
              <TimePickerInline value={pickTime} onChange={setPickTime} />
            </View>

            <View style={styles.reminderRow}>
              <View style={styles.reminderLabel}>
                <Feather name="sunset" size={16} color={Colors.textSecondary} />
                <Text style={styles.reminderLabelText}>Finish your task</Text>
              </View>
              <TimePickerInline value={completeTime} onChange={setCompleteTime} />
            </View>
          </View>

          {permissionDenied && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.permissionNote}>
              <Text style={styles.permissionNoteText}>
                You can turn reminders on anytime in your profile
              </Text>
            </Animated.View>
          )}

          <Pressable
            style={({ pressed }) => [styles.enableButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleEnableReminders}
          >
            <Feather name="bell" size={18} color="#FFF" />
            <Text style={styles.enableButtonText}>Enable Reminders</Text>
          </Pressable>

          <Pressable onPress={handleSkipReminders} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (showNameInput) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.nameContainer}>
          <View style={styles.nameIconWrap}>
            <Feather name="user" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.nameTitle}>What should we call you?</Text>
          <Text style={styles.nameSubtitle}>This is optional — you can skip this</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor={Colors.neutral}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNameDone}
          />
          <Pressable
            style={({ pressed }) => [styles.beginButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleNameDone}
          >
            <Text style={styles.beginButtonText}>Continue</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </Pressable>
          <Pressable onPress={handleNameDone} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => <SlideItem item={item} index={index} />}
        keyExtractor={item => item.key}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Continue' : 'Next'}
          </Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleAccent: {
    backgroundColor: Colors.accentLight,
  },
  slideTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
  },
  slideSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomArea: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  nextButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  nameIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  nameTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  nameSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  nameInput: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    textAlign: 'center',
    marginBottom: 24,
  },
  beginButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  beginButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reminderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  reminderIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  reminderTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  reminderSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  reminderOptions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderLabelText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeChipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: Colors.accent,
  },
  timePickerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 4,
  },
  timePickerColumn: {
    maxHeight: 120,
    width: 72,
  },
  timePickerColumnContent: {
    paddingVertical: 4,
  },
  timeOption: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: Colors.accentLight,
  },
  timeOptionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timeOptionTextSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  timePickerDone: {
    padding: 4,
  },
  enableButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  enableButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  permissionNote: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    width: '100%',
  },
  permissionNoteText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
