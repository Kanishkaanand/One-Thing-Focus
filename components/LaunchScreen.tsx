import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

const taglines = [
  "You don't need to do everything. Just one thing.",
  "One thing. One day. That's enough.",
  "Start with one. The rest can wait.",
  "Less to do. More to feel proud of.",
  "A single step is still a journey.",
  "Do less. Feel better.",
];

const LAST_TAGLINE_KEY = '@one_thing_last_tagline';

async function pickRandomTagline(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(LAST_TAGLINE_KEY);
    const lastIndex = stored !== null ? parseInt(stored, 10) : -1;
    const available = taglines
      .map((t, i) => ({ t, i }))
      .filter(({ i }) => i !== lastIndex);
    const pick = available[Math.floor(Math.random() * available.length)];
    await AsyncStorage.setItem(LAST_TAGLINE_KEY, pick.i.toString());
    return pick.t;
  } catch {
    return taglines[0];
  }
}

interface LaunchScreenProps {
  onComplete: () => void;
}

export default function LaunchScreen({ onComplete }: LaunchScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const [tagline, setTagline] = useState('');
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    animRef.current?.stop();
    onComplete();
  };

  useEffect(() => {
    pickRandomTagline().then(setTagline);

    const anim = Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(100),
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) finish();
    });
  }, []);

  return (
    <Pressable onPress={finish} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoWrap,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image
              source={require('@/assets/images/sunrise-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.Text style={[styles.appName, { opacity: nameOpacity }]}>
            One Thing
          </Animated.Text>

          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineOpacity,
                transform: [{ translateY: taglineTranslateY }],
              },
            ]}
          >
            {tagline ? `"${tagline}"` : ''}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoWrap: {
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
