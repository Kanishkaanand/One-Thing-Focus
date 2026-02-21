import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface TimePickerModalProps {
  visible: boolean;
  taskName: string;
  onSetTime: (time: string) => void;
  onSkip: () => void;
}

function getDefaultHour(): number {
  const now = new Date();
  const h = now.getHours();
  if (h < 9) return 9;
  if (h < 22) return Math.min(h + 2, 22);
  return 22;
}

function TimePickerModal({
  visible,
  taskName,
  onSetTime,
  onSkip,
}: TimePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedHour, setSelectedHour] = useState(getDefaultHour);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const formatDisplayTime = () => {
    let h = selectedHour;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    const m = selectedMinute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const handleSetTime = () => {
    const time = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSetTime(time);
  };

  const now = new Date();
  const isPast =
    selectedHour < now.getHours() ||
    (selectedHour === now.getHours() && selectedMinute <= now.getMinutes());

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalWrap}>
        <Pressable style={styles.backdrop} onPress={onSkip} />
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Feather name="clock" size={20} color={Colors.accent} />
            <Text style={styles.title}>When will you do this?</Text>
          </View>
          <Text style={styles.taskPreview} numberOfLines={1}>
            {taskName}
          </Text>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerScrollContent}
              >
                {hours.map((h) => {
                  let displayH = h;
                  const ampm = h >= 12 ? 'p' : 'a';
                  if (h === 0) displayH = 12;
                  else if (h > 12) displayH = h - 12;
                  return (
                    <Pressable
                      key={h}
                      style={[
                        styles.pickerItem,
                        selectedHour === h && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedHour === h && styles.pickerItemTextSelected,
                        ]}
                      >
                        {displayH}{ampm}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Min</Text>
              <ScrollView
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerScrollContent}
              >
                {minutes.map((m) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.pickerItem,
                      selectedMinute === m && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMinute === m && styles.pickerItemTextSelected,
                      ]}
                    >
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.selectedDisplay}>{formatDisplayTime()}</Text>

          {isPast && (
            <Text style={styles.pastWarning}>
              That time has already passed today
            </Text>
          )}

          <Pressable
            style={[styles.setButton, isPast && styles.setButtonDisabled]}
            onPress={handleSetTime}
            disabled={isPast}
          >
            <Feather name="bell" size={18} color="#FFF" />
            <Text style={styles.setButtonText}>Remind me at {formatDisplayTime()}</Text>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </Animated.View>
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  taskPreview: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  pickerScroll: {
    height: 160,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
  },
  pickerScrollContent: {
    paddingVertical: 6,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    marginVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: Colors.accent,
  },
  pickerItemText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  pickerItemTextSelected: {
    color: '#FFF',
    fontFamily: 'Nunito_700Bold',
  },
  selectedDisplay: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  pastWarning: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 8,
  },
  setButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  setButtonDisabled: {
    opacity: 0.4,
  },
  setButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  skipButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
});

export default memo(TimePickerModal);
