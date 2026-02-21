import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

type TimePillOption = 'morning' | 'afternoon' | 'evening' | 'custom' | null;

interface TaskInputModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (scheduledTime?: string) => void;
  onClose: () => void;
}

const TIME_PRESETS: { key: TimePillOption; label: string; icon: string; time: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunrise', time: '09:00' },
  { key: 'afternoon', label: 'Afternoon', icon: 'sun', time: '13:00' },
  { key: 'evening', label: 'Evening', icon: 'sunset', time: '17:00' },
];

function getCustomHours(): number[] {
  return Array.from({ length: 15 }, (_, i) => i + 7);
}

function formatTime12h(hour: number, minute: number): string {
  let h = hour;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function formatPresetLabel(key: TimePillOption): string {
  switch (key) {
    case 'morning': return '9:00 AM';
    case 'afternoon': return '1:00 PM';
    case 'evening': return '5:00 PM';
    default: return '';
  }
}

function TaskInputModal({
  visible,
  value,
  onChangeText,
  onSubmit,
  onClose,
}: TaskInputModalProps) {
  const insets = useSafeAreaInsets();
  const isSubmitDisabled = !value.trim();

  const [selectedPill, setSelectedPill] = useState<TimePillOption>(null);
  const [customHour, setCustomHour] = useState(10);
  const [customMinute, setCustomMinute] = useState(0);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const resetState = useCallback(() => {
    setSelectedPill(null);
    setCustomHour(10);
    setCustomMinute(0);
    setShowCustomPicker(false);
  }, []);

  const handleClose = () => {
    onClose();
    onChangeText('');
    resetState();
  };

  const getScheduledTime = (): string | undefined => {
    if (!selectedPill) return undefined;

    const preset = TIME_PRESETS.find(p => p.key === selectedPill);
    if (preset) return preset.time;

    if (selectedPill === 'custom') {
      return `${customHour.toString().padStart(2, '0')}:${customMinute.toString().padStart(2, '0')}`;
    }

    return undefined;
  };

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const scheduledTime = getScheduledTime();
    onSubmit(scheduledTime);
    resetState();
  };

  const handlePillPress = (key: TimePillOption) => {
    if (key === selectedPill) {
      setSelectedPill(null);
      setShowCustomPicker(false);
      return;
    }
    setSelectedPill(key);
    if (key === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const confirmationTimeLabel = selectedPill
    ? selectedPill === 'custom'
      ? formatTime12h(customHour, customMinute)
      : formatPresetLabel(selectedPill)
    : null;

  const minutes = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalWrap}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessible={true}
          accessibilityLabel="Close task input"
          accessibilityRole="button"
        />
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>What will you focus on?</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="task-input"
              style={styles.input}
              placeholder="Type your task here..."
              placeholderTextColor={Colors.neutral}
              value={value}
              onChangeText={onChangeText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              multiline={false}
              accessible={true}
              accessibilityLabel="Task input field"
              accessibilityHint="Enter the task you want to focus on today"
            />
            <Pressable
              onPress={handleSubmit}
              style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
              disabled={isSubmitDisabled}
              accessible={true}
              accessibilityLabel="Add task"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitDisabled }}
            >
              <Feather name="arrow-up" size={20} color="#FFF" />
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(200)} style={styles.nudgeSection}>
              <View style={styles.nudgeHeader}>
                <Feather name="clock" size={14} color={Colors.textSecondary} />
                <Text style={styles.nudgeLabel}>Focus nudge</Text>
              </View>

              <View style={styles.pillRow}>
                {TIME_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.key}
                    style={[
                      styles.pill,
                      selectedPill === preset.key && styles.pillSelected,
                    ]}
                    onPress={() => handlePillPress(preset.key)}
                  >
                    <Feather
                      name={preset.icon as any}
                      size={14}
                      color={selectedPill === preset.key ? Colors.accent : Colors.textSecondary}
                    />
                    <Text style={[
                      styles.pillText,
                      selectedPill === preset.key && styles.pillTextSelected,
                    ]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
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

              {showCustomPicker && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.customPickerWrap}>
                  <View style={styles.customPickerRow}>
                    <View style={styles.customPickerColumn}>
                      <Text style={styles.customPickerLabel}>Hour</Text>
                      <ScrollView
                        style={styles.customScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.customScrollContent}
                      >
                        {getCustomHours().map((h) => {
                          let displayH = h;
                          const ampm = h >= 12 ? 'p' : 'a';
                          if (h === 0) displayH = 12;
                          else if (h > 12) displayH = h - 12;
                          return (
                            <Pressable
                              key={h}
                              style={[
                                styles.customOption,
                                customHour === h && styles.customOptionSelected,
                              ]}
                              onPress={() => setCustomHour(h)}
                            >
                              <Text style={[
                                styles.customOptionText,
                                customHour === h && styles.customOptionTextSelected,
                              ]}>
                                {displayH}{ampm}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <View style={styles.customPickerColumn}>
                      <Text style={styles.customPickerLabel}>Min</Text>
                      <ScrollView
                        style={styles.customScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.customScrollContent}
                      >
                        {minutes.map((m) => (
                          <Pressable
                            key={m}
                            style={[
                              styles.customOption,
                              customMinute === m && styles.customOptionSelected,
                            ]}
                            onPress={() => setCustomMinute(m)}
                          >
                            <Text style={[
                              styles.customOptionText,
                              customMinute === m && styles.customOptionTextSelected,
                            ]}>
                              :{m.toString().padStart(2, '0')}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Animated.View>
              )}

              {selectedPill && confirmationTimeLabel && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.confirmLine}>
                  <Feather name="bell" size={13} color={Colors.accent} />
                  <Text style={styles.confirmText}>
                    Nudge at {confirmationTimeLabel}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
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
  input: {
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
  submitBtnDisabled: {
    opacity: 0.4,
  },
  nudgeSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nudgeLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
  },
  pillSelected: {
    backgroundColor: Colors.accentLight,
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
  customPickerWrap: {
    marginTop: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 12,
  },
  customPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customPickerColumn: {
    flex: 1,
  },
  customPickerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  customScroll: {
    height: 120,
  },
  customScrollContent: {
    paddingVertical: 4,
  },
  customOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  customOptionSelected: {
    backgroundColor: Colors.accentLight,
  },
  customOptionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customOptionTextSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  confirmLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  confirmText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
});

export default memo(TaskInputModal);
