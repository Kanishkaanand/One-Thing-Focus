import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export type MoodType = 'energized' | 'calm' | 'neutral' | 'tough';

interface MoodOption {
  key: MoodType;
  icon: string;
  label: string;
}

const moodOptions: MoodOption[] = [
  { key: 'energized', icon: 'flame-outline', label: 'Energized' },
  { key: 'calm', icon: 'leaf-outline', label: 'Calm' },
  { key: 'neutral', icon: 'remove-circle-outline', label: 'Neutral' },
  { key: 'tough', icon: 'fitness-outline', label: 'Tough' },
];

interface ReflectionModalProps {
  visible: boolean;
  note: string;
  onNoteChange: (text: string) => void;
  onSelectMood: (mood: MoodType) => void;
}

function ReflectionModal({
  visible,
  note,
  onNoteChange,
  onSelectMood,
}: ReflectionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.sheet}
          accessible={true}
          accessibilityRole="dialog"
          accessibilityLabel="Reflection dialog"
        >
          <Text style={styles.title}>How did today feel?</Text>

          <View style={styles.moodGrid}>
            {moodOptions.map((mood) => (
              <Pressable
                key={mood.key}
                style={({ pressed }) => [
                  styles.moodOption,
                  pressed && styles.moodOptionPressed,
                ]}
                onPress={() => onSelectMood(mood.key)}
                accessible={true}
                accessibilityLabel={`${mood.label} mood`}
                accessibilityRole="button"
                accessibilityHint={`Select ${mood.label.toLowerCase()} as your mood for today`}
              >
                <View style={styles.moodIconWrap}>
                  <Ionicons
                    name={mood.icon as any}
                    size={28}
                    color={Colors.accent}
                  />
                </View>
                <Text style={styles.moodLabel}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.noteInput}
            placeholder="Anything to remember?"
            placeholderTextColor={Colors.neutral}
            value={note}
            onChangeText={onNoteChange}
            accessible={true}
            accessibilityLabel="Reflection note"
            accessibilityHint="Optional note about your day"
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
  },
  title: {
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
  moodOptionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
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
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
  },
});

export default memo(ReflectionModal);
