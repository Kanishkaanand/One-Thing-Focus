/**
 * Error Recovery Banner Component
 *
 * Shows a non-intrusive banner when errors occur, allowing users to:
 * - See that something went wrong
 * - Dismiss the error
 * - Report the error (future feature)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export type ErrorSeverity = 'warning' | 'error';

interface ErrorRecoveryBannerProps {
  message: string;
  severity?: ErrorSeverity;
  onDismiss?: () => void;
  onRetry?: () => void;
  autoDismissMs?: number;
}

export default function ErrorRecoveryBanner({
  message,
  severity = 'error',
  onDismiss,
  onRetry,
  autoDismissMs,
}: ErrorRecoveryBannerProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss if specified
    if (autoDismissMs) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  if (!visible) return null;

  const isWarning = severity === 'warning';
  const backgroundColor = isWarning ? '#FFF3CD' : '#FFEBEE';
  const borderColor = isWarning ? '#FFC107' : '#EF5350';
  const iconColor = isWarning ? '#856404' : '#C62828';
  const textColor = isWarning ? '#856404' : '#C62828';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor, borderLeftColor: borderColor },
      ]}
    >
      <View style={styles.content}>
        <Feather
          name={isWarning ? 'alert-triangle' : 'alert-circle'}
          size={20}
          color={iconColor}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={styles.actions}>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={styles.actionButton}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={16} color={iconColor} />
          </Pressable>
        )}
        <Pressable
          onPress={handleDismiss}
          style={styles.actionButton}
          accessibilityLabel="Dismiss error"
          accessibilityRole="button"
        >
          <Feather name="x" size={18} color={iconColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
});
