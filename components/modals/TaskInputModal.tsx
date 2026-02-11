import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface TaskInputModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
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

  const handleClose = () => {
    onClose();
    onChangeText('');
  };

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
              onSubmitEditing={onSubmit}
              multiline={false}
              accessible={true}
              accessibilityLabel="Task input field"
              accessibilityHint="Enter the task you want to focus on today"
            />
            <Pressable
              onPress={onSubmit}
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
});

export default memo(TaskInputModal);
