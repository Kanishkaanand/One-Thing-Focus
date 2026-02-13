import React, { memo } from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProofViewModalProps {
  uri: string | null;
  onClose: () => void;
}

function ProofViewModal({ uri, onClose }: ProofViewModalProps) {
  return (
    <Modal visible={!!uri} transparent animationType="fade">
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessible={true}
        accessibilityLabel="Close proof image"
        accessibilityRole="button"
      >
        {uri && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel="Proof image"
            accessibilityRole="image"
          />
        )}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessible={true}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Feather name="x" size={24} color="#FFF" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH - 48,
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(ProofViewModal);
