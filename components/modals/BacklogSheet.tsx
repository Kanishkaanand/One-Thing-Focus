import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BacklogItem } from '@/lib/storage';

interface BacklogSheetProps {
  visible: boolean;
  backlogItems: BacklogItem[];
  onAddItem: (text: string) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onPickForToday: (itemId: string) => void;
  canPickForToday: boolean;
  pickedBacklogIds: string[];
  onClose: () => void;
}

function BacklogSheet({ visible, backlogItems, onAddItem, onRemoveItem, onPickForToday, canPickForToday, pickedBacklogIds, onClose }: BacklogSheetProps) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isFull = backlogItems.length >= 7;

  const handleAdd = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isFull || isAdding) return;

    setIsAdding(true);
    try {
      await onAddItem(trimmed);
      setInputText('');
    } catch {
      // Error handled by parent
    } finally {
      setIsAdding(false);
    }
  }, [inputText, isFull, isAdding, onAddItem]);

  const handleClose = useCallback(() => {
    setInputText('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Dismiss area — sibling, not parent, so it won't swallow scroll gestures */}
        <Pressable style={styles.dismissArea} onPress={handleClose} />

        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Up Next</Text>
              <Text style={styles.subtitle}>Tasks you want to get to</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{backlogItems.length}/7</Text>
            </View>
          </View>

          <ScrollView
            style={styles.listArea}
            contentContainerStyle={backlogItems.length === 0 ? styles.listContentEmpty : styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {backlogItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={32} color={Colors.neutral} />
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.emptySubtitle}>Add tasks you want to focus on this week</Text>
              </View>
            ) : (
              backlogItems.map((item) => {
                const isPicked = pickedBacklogIds.includes(item.id);
                return (
                  <View key={item.id} style={[styles.itemRow, isPicked && styles.itemRowPicked]}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText} numberOfLines={2}>{item.text}</Text>
                    {isPicked ? (
                      <Text style={styles.pickedLabel}>Added today</Text>
                    ) : canPickForToday ? (
                      <Pressable
                        onPress={() => onPickForToday(item.id)}
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                        hitSlop={8}
                      >
                        <Feather name="arrow-right" size={16} color={Colors.accent} />
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => onRemoveItem(item.id)}
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                      hitSlop={8}
                    >
                      <Feather name="x" size={16} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, isFull && styles.inputDisabled]}
              placeholder={isFull ? 'Up Next is full (7/7)' : 'Add a task for later...'}
              placeholderTextColor={Colors.neutral}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              editable={!isFull}
              maxLength={500}
            />
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.addBtn,
                (!inputText.trim() || isFull) && styles.addBtnDisabled,
                pressed && styles.addBtnPressed,
              ]}
              disabled={!inputText.trim() || isFull}
            >
              <Feather name="plus" size={20} color={!inputText.trim() || isFull ? Colors.neutral : Colors.surface} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.accent,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listArea: {
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 4,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  itemRowPicked: {
    opacity: 0.5,
  },
  pickedLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.accent,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  itemText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  actionBtn: {
    padding: 4,
  },
  actionBtnPressed: {
    opacity: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.inputBg,
  },
  addBtnPressed: {
    opacity: 0.7,
  },
});

export default memo(BacklogSheet);
