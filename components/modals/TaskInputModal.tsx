import React, { memo, useState, useCallback, useEffect } from 'react';
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
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BacklogItem } from '@/lib/storage';

type TimePillOption = 'morning' | 'afternoon' | 'evening' | 'custom' | null;
type InputMode = 'backlog' | 'fresh';

interface TaskInputModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (scheduledTime?: string) => void;
  onClose: () => void;
  backlogItems?: BacklogItem[];
  onSelectBacklogItem?: (backlogItemId: string, scheduledTime?: string) => void;
  todayTaskTexts?: string[];
}

const TIME_PRESETS: { key: TimePillOption; label: string; icon: string; time: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunrise', time: '09:00' },
  { key: 'afternoon', label: 'Afternoon', icon: 'sun', time: '13:00' },
  { key: 'evening', label: 'Evening', icon: 'sunset', time: '17:00' },
];

function isTimePast(time: string): boolean {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

function isCustomTimePast(hour: number, minute: number): boolean {
  const now = new Date();
  return hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes());
}

function getCustomHours(): number[] {
  const now = new Date();
  const currentHour = now.getHours();
  const earliest = now.getMinutes() >= 45 ? currentHour + 1 : currentHour;
  const start = Math.max(earliest, 7);
  const end = 23;
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
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
  backlogItems = [],
  onSelectBacklogItem,
  todayTaskTexts = [],
}: TaskInputModalProps) {
  const insets = useSafeAreaInsets();
  const isSubmitDisabled = !value.trim();

  // Filter out backlog items already added today
  const availableBacklog = backlogItems.filter(
    item => !todayTaskTexts.includes(item.text)
  );

  const hasBacklog = availableBacklog.length > 0;
  const [mode, setMode] = useState<InputMode>(hasBacklog ? 'backlog' : 'fresh');
  const [selectedBacklogId, setSelectedBacklogId] = useState<string | null>(null);

  const [selectedPill, setSelectedPill] = useState<TimePillOption>(null);
  const [customHour, setCustomHour] = useState(() => {
    const hours = getCustomHours();
    return hours.length > 0 ? hours[0] : 21;
  });
  const [customMinute, setCustomMinute] = useState(0);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reset mode when modal opens
  useEffect(() => {
    if (visible) {
      const available = backlogItems.filter(item => !todayTaskTexts.includes(item.text));
      setMode(available.length > 0 ? 'backlog' : 'fresh');
      setSelectedBacklogId(null);
    }
  }, [visible, backlogItems, todayTaskTexts]);

  useEffect(() => {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    if (customHour === currentHour && customMinute <= currentMinute) {
      const nextValid = [0, 15, 30, 45].find((m) => m > currentMinute);
      setCustomMinute(nextValid ?? 0);
    }
  }, [customHour]);

  const resetState = useCallback(() => {
    setSelectedPill(null);
    const hours = getCustomHours();
    setCustomHour(hours.length > 0 ? hours[0] : 21);
    setCustomMinute(0);
    setShowCustomPicker(false);
    setShowTimePicker(false);
    setSelectedBacklogId(null);
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
    if (mode === 'backlog') {
      if (!selectedBacklogId || !onSelectBacklogItem) return;
      const scheduledTime = getScheduledTime();
      onSelectBacklogItem(selectedBacklogId, scheduledTime);
      resetState();
      return;
    }
    if (isSubmitDisabled) return;
    if (selectedPill && isSelectedTimePast) return;
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

  const handleClearTime = () => {
    setSelectedPill(null);
    setShowCustomPicker(false);
    setShowTimePicker(false);
  };

  const confirmationTimeLabel = selectedPill
    ? selectedPill === 'custom'
      ? formatTime12h(customHour, customMinute)
      : formatPresetLabel(selectedPill)
    : null;

  const isSelectedTimePast = selectedPill
    ? selectedPill === 'custom'
      ? isCustomTimePast(customHour, customMinute)
      : isTimePast(TIME_PRESETS.find(p => p.key === selectedPill)?.time || '00:00')
    : false;

  const allMinutes = [0, 15, 30, 45];
  const now = new Date();
  const minutes = customHour === now.getHours()
    ? allMinutes.filter((m) => m > now.getMinutes())
    : allMinutes;

  const canSubmitBacklog = mode === 'backlog' && selectedBacklogId;

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

          {/* Mode tabs — only show if backlog items exist */}
          {hasBacklog && (
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, mode === 'backlog' && styles.tabActive]}
                onPress={() => setMode('backlog')}
              >
                <Feather name="list" size={14} color={mode === 'backlog' ? Colors.accent : Colors.textSecondary} />
                <Text style={[styles.tabText, mode === 'backlog' && styles.tabTextActive]}>
                  Up Next
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, mode === 'fresh' && styles.tabActive]}
                onPress={() => setMode('fresh')}
              >
                <Feather name="edit-3" size={14} color={mode === 'fresh' ? Colors.accent : Colors.textSecondary} />
                <Text style={[styles.tabText, mode === 'fresh' && styles.tabTextActive]}>
                  New Task
                </Text>
              </Pressable>
            </View>
          )}

          {mode === 'backlog' ? (
            /* Backlog selection mode */
            <View>
              <ScrollView
                style={styles.backlogList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {availableBacklog.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.backlogItem,
                      selectedBacklogId === item.id && styles.backlogItemSelected,
                    ]}
                    onPress={() => setSelectedBacklogId(
                      selectedBacklogId === item.id ? null : item.id
                    )}
                  >
                    <View style={[
                      styles.backlogRadio,
                      selectedBacklogId === item.id && styles.backlogRadioSelected,
                    ]}>
                      {selectedBacklogId === item.id && (
                        <Feather name="check" size={12} color={Colors.surface} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.backlogItemText,
                        selectedBacklogId === item.id && styles.backlogItemTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                onPress={handleSubmit}
                style={[styles.backlogSubmitBtn, !canSubmitBacklog && styles.backlogSubmitBtnDisabled]}
                disabled={!canSubmitBacklog}
              >
                <Text style={[styles.backlogSubmitText, !canSubmitBacklog && styles.backlogSubmitTextDisabled]}>
                  Add to today
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Fresh task input mode */
            <>
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

              {/* Time picker section */}
              {selectedPill && confirmationTimeLabel && !showCustomPicker ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <View style={styles.timeConfirmRow}>
                    <View style={styles.timeConfirmLeft}>
                      <Feather name="bell" size={13} color={isSelectedTimePast ? '#D97706' : Colors.accent} />
                      <Text style={[styles.timeConfirmText, isSelectedTimePast && styles.timeWarningText]}>
                        {isSelectedTimePast ? 'Time has already passed' : `Nudge at ${confirmationTimeLabel}`}
                      </Text>
                    </View>
                    <Pressable onPress={handleClearTime} style={styles.timeChangeBtn}>
                      <Text style={styles.timeChangeBtnText}>Change</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ) : !showTimePicker ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.timePromptRow}>
                  <Text style={styles.timePromptText}>When do you want to do this?</Text>
                  <View style={styles.timePromptActions}>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={styles.pickTimeBtn}
                    >
                      <Feather name="clock" size={13} color={Colors.accent} />
                      <Text style={styles.pickTimeBtnText}>Pick a time</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.nudgeSection}>
                  <View style={styles.nudgeHeader}>
                    <Feather name="clock" size={14} color={Colors.textSecondary} />
                    <Text style={styles.nudgeLabel}>Pick a time</Text>
                    <Pressable onPress={() => { setShowTimePicker(false); setSelectedPill(null); setShowCustomPicker(false); }} style={styles.skipBtn}>
                      <Text style={styles.skipBtnText}>Skip</Text>
                    </Pressable>
                  </View>

                  <View style={styles.pillRow}>
                    {TIME_PRESETS.map((preset) => {
                      const past = isTimePast(preset.time);
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
                            {preset.label}{past ? ' (past)' : ''}
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
                </Animated.View>
              )}
            </>
          )}
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
    marginBottom: 12,
  },
  // Mode tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
  },
  tabActive: {
    backgroundColor: Colors.accentLight,
  },
  tabText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  // Backlog list
  backlogList: {
    maxHeight: 240,
    marginBottom: 12,
  },
  backlogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  backlogItemSelected: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  backlogRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backlogRadioSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  backlogItemText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  backlogItemTextSelected: {
    fontFamily: 'DMSans_500Medium',
  },
  backlogSubmitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  backlogSubmitBtnDisabled: {
    backgroundColor: Colors.inputBg,
  },
  backlogSubmitText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: Colors.surface,
  },
  backlogSubmitTextDisabled: {
    color: Colors.neutral,
  },
  // Fresh input
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
  // Time picker
  timePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  timePromptText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timePromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.accentLight,
  },
  pickTimeBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
  timeConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  timeConfirmLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeConfirmText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
  },
  timeChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
  },
  timeChangeBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
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
    flex: 1,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
  },
  skipBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
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
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  customOptionTextSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.accent,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  pillTextDisabled: {
    color: Colors.neutral,
  },
  timeWarningText: {
    color: '#D97706',
  },
});

export default memo(TaskInputModal);
