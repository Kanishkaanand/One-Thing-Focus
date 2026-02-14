import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export type ProofOption = 'upload' | 'camera' | 'skip';

interface ProofSheetProps {
  visible: boolean;
  onSelect: (option: ProofOption) => void;
  onClose: () => void;
}

function ProofSheet({ visible, onSelect, onClose }: ProofSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessible={true}
        accessibilityLabel="Close proof options"
        accessibilityRole="button"
      >
        <Pressable
          style={styles.content}
          onPress={(e) => e.stopPropagation()}
          accessible={false}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Add proof</Text>
          <Text style={styles.subtitle}>Optional — capture your progress</Text>

          <View style={styles.options}>
            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => onSelect('upload')}
              accessible={true}
              accessibilityLabel="Upload from device"
              accessibilityRole="button"
            >
              <View style={styles.iconWrap}>
                <Feather name="upload" size={22} color={Colors.accent} />
              </View>
              <Text style={styles.optionText}>Upload from Device</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => onSelect('camera')}
              accessible={true}
              accessibilityLabel="Take a picture"
              accessibilityRole="button"
            >
              <View style={styles.iconWrap}>
                <Feather name="camera" size={22} color={Colors.accent} />
              </View>
              <Text style={styles.optionText}>Take a Picture</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.optionPressed]}
            onPress={() => onSelect('skip')}
            accessible={true}
            accessibilityLabel="Skip proof and mark task as done"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip — just mark as done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  options: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
  },
  optionPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default memo(ProofSheet);
