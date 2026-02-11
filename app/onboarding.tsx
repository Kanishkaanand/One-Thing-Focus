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
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';

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

function SlideItem({ item, index }: { item: typeof slides[0]; index: number }) {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconContainer}>
        <View style={[styles.iconCircle, index === 1 && styles.iconCircleAccent]}>
          <Feather
            name={item.icon}
            size={40}
            color={index === 1 ? Colors.accent : Colors.textSecondary}
          />
        </View>
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
  const [name, setName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowNameInput(true);
    }
  };

  const handleFinish = async () => {
    await updateProfile({
      name: name.trim(),
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    });
    router.replace('/(tabs)');
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  if (showNameInput) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}>
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
            onSubmitEditing={handleFinish}
          />
          <Pressable
            style={({ pressed }) => [styles.beginButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            onPress={handleFinish}
          >
            <Text style={styles.beginButtonText}>Let's Begin</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </Pressable>
          <Pressable onPress={handleFinish} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </View>
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
        scrollEnabled={false}
        renderItem={({ item, index }) => <SlideItem item={item} index={index} />}
        keyExtractor={item => item.key}
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
});
