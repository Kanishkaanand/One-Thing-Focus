/**
 * Storage Warning Banner Component
 *
 * Shows a warning when storage is approaching capacity limits.
 * Helps users understand they may need to clear old data.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { StorageStatus } from '@/lib/storage';

interface StorageWarningBannerProps {
  storageStatus: StorageStatus;
  onDismiss?: () => void;
}

export default function StorageWarningBanner({
  storageStatus,
  onDismiss,
}: StorageWarningBannerProps) {
  if (!storageStatus.isWarning && !storageStatus.isCritical) {
    return null;
  }

  const isCritical = storageStatus.isCritical;
  const backgroundColor = isCritical ? '#FFEBEE' : '#FFF3CD';
  const borderColor = isCritical ? '#EF5350' : '#FFC107';
  const iconColor = isCritical ? '#C62828' : '#856404';
  const textColor = isCritical ? '#C62828' : '#856404';

  const message = isCritical
    ? `Storage is almost full (${storageStatus.percentUsed}% used). Some features may stop working.`
    : `Storage is filling up (${storageStatus.percentUsed}% used). Consider clearing old data.`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, borderLeftColor: borderColor },
      ]}
    >
      <View style={styles.content}>
        <Feather
          name="hard-drive"
          size={20}
          color={iconColor}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            {isCritical ? 'Storage Critical' : 'Storage Warning'}
          </Text>
          <Text style={[styles.message, { color: textColor }]}>
            {message}
          </Text>
        </View>
      </View>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss warning"
          accessibilityRole="button"
        >
          <Feather name="x" size={18} color={iconColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});
