import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import Logo from '@/components/Logo';
import { useApp } from '@/lib/AppContext';
import { useScreenAnalytics } from '@/lib/useAnalytics';
import { trackOnboardingCompleted } from '@/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FLOATING_ICONS: { name: string; x: number; y: number; delay: number; size: number }[] = [
  { name: 'check-square', x: -90, y: -120, delay: 0, size: 22 },
  { name: 'list', x: 80, y: -100, delay: 300, size: 20 },
  { name: 'clipboard', x: -70, y: 60, delay: 600, size: 18 },
  { name: 'inbox', x: 100, y: 80, delay: 150, size: 24 },
  { name: 'bell', x: -110, y: -20, delay: 450, size: 16 },
  { name: 'calendar', x: 60, y: -160, delay: 750, size: 20 },
  { name: 'edit-3', x: -40, y: 140, delay: 200, size: 18 },
  { name: 'flag', x: 120, y: -30, delay: 500, size: 16 },
];

function FloatingIcon({ name, x, y, delay, size }: typeof FLOATING_ICONS[0]) {
  const floatY = useSharedValue(0);
  const floatX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.25, { duration: 800 }));

    floatY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 2200 + Math.random() * 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(12, { duration: 2200 + Math.random() * 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    floatX.value = withDelay(
      delay + 200,
      withRepeat(
        withSequence(
          withTiming(8, { duration: 2800 + Math.random() * 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(-8, { duration: 2800 + Math.random() * 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + floatX.value },
      { translateY: y + floatY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingIcon, animStyle]}>
      <Feather name={name as any} size={size} color={Colors.textSecondary} />
    </Animated.View>
  );
}

function BreathingGlow() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    scale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0.25, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.glowCircle, animStyle]} />
  );
}

function PulsingDot({ active, index }: { active: boolean; index: number }) {
  const scale = useSharedValue(1);
  const widthVal = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    widthVal.value = withTiming(active ? 24 : 8, { duration: 300, easing: Easing.out(Easing.cubic) });
    if (active) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1, { duration: 200 }),
      );
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    width: widthVal.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        active && styles.dotActive,
        animStyle,
      ]}
    />
  );
}

function BreathingButton({ label, onPress }: { label: string; onPress: () => void }) {
  const breathe = useSharedValue(1);

  useEffect(() => {
    breathe.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={({ pressed }) => [styles.nextButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
        onPress={onPress}
      >
        <Text style={styles.nextButtonText}>{label}</Text>
        <Feather name="arrow-right" size={18} color="#FFF" />
      </Pressable>
    </Animated.View>
  );
}

const slides = [
  { key: '1' },
  { key: '2' },
];

function Slide1() {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.chaosContainer}>
        {FLOATING_ICONS.map((icon, i) => (
          <FloatingIcon key={i} {...icon} />
        ))}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.chaosCenter}>
          <Feather name="layers" size={36} color={Colors.textSecondary} />
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeInDown.delay(300).duration(500)}
        style={styles.slideTitle}
      >
        Too many things.
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(500).duration(500)}
        style={styles.slideSubtitle}
      >
        Let go of the noise.
      </Animated.Text>
    </View>
  );
}

function Slide2() {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.calmContainer}>
        <BreathingGlow />
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.checkWrap}>
          <Logo size={100} />
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeInDown.delay(800).duration(500)}
        style={styles.slideTitle}
      >
        Just one thing.
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(1000).duration(500)}
        style={styles.slideSubtitle}
      >
        One task. Every day. That's it.
      </Animated.Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useScreenAnalytics('Onboarding');

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowNameInput(true);
    }
  }, [currentIndex]);

  const handleNameDone = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await updateProfile({
      name: name.trim(),
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
      reminderPickTask: { enabled: false, time: '08:00' },
    });
    trackOnboardingCompleted(!!name.trim(), false);
    router.replace('/(tabs)');
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  if (showNameInput) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.nameContainer}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.nameIconWrap}>
            <Feather name="smile" size={32} color={Colors.accent} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.nameTitle}>
            What should we call you?
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={styles.nameSubtitle}>
            No pressure — you can skip this
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.nameInputWrap}>
            <TextInput
              style={styles.nameInput}
              placeholder="Your name"
              placeholderTextColor={Colors.neutral}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameDone}
              testID="name-input"
            />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(500).duration(400)} style={{ width: '100%' }}>
            <Pressable
              style={({ pressed }) => [styles.beginButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={handleNameDone}
              testID="begin-button"
            >
              <Text style={styles.beginButtonText}>Let's go</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </Pressable>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(700).duration(400)}>
            <Pressable onPress={handleNameDone} style={styles.skipButton} testID="skip-name-button">
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    if (index === 0) return <Slide1 />;
    return <Slide2 />;
  };

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
        renderItem={renderSlide}
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
            <PulsingDot key={i} active={i === currentIndex} index={i} />
          ))}
        </View>

        <BreathingButton
          label={currentIndex === slides.length - 1 ? "Let's begin" : 'Next'}
          onPress={handleNext}
        />
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
  chaosContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  floatingIcon: {
    position: 'absolute',
  },
  chaosCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calmContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accent,
  },
  checkWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 30,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
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
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
  nextButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: SCREEN_WIDTH - 64,
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
  nameInputWrap: {
    width: '100%',
    marginBottom: 24,
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
});
