import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { formatDate } from '@/lib/storage';

const moodIcons: Record<string, { icon: string; label: string }> = {
  energized: { icon: 'flame-outline', label: 'Energized' },
  calm: { icon: 'leaf-outline', label: 'Calm' },
  neutral: { icon: 'remove-circle-outline', label: 'Neutral' },
  tough: { icon: 'fitness-outline', label: 'Tough' },
};

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { entries } = useApp();

  if (!date) return null;
  const entry = entries[date];
  if (!entry) return null;

  const moodInfo = entry.reflection ? moodIcons[entry.reflection.mood] : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Feather name="x" size={22} color={Colors.textSecondary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.dateTitle}>{formatDate(date)}</Text>
          <Text style={styles.levelTag}>Level {entry.levelAtTime}</Text>
        </Animated.View>

        <View style={styles.tasksSection}>
          {entry.tasks.map((task, i) => (
            <Animated.View key={task.id} entering={FadeInDown.delay(100 + i * 80)} style={styles.taskItem}>
              <View style={styles.taskHeader}>
                <View style={[styles.taskCheck, task.isCompleted && styles.taskCheckDone]}>
                  {task.isCompleted && <Feather name="check" size={12} color="#FFF" />}
                </View>
                <Text style={[styles.taskText, task.isCompleted && styles.taskTextDone]}>
                  {task.text}
                </Text>
              </View>
              {task.proof && (
                <View style={styles.proofContainer}>
                  <Image
                    source={{ uri: task.proof.uri }}
                    style={styles.proofImage}
                    contentFit="cover"
                  />
                </View>
              )}
              {task.completedAt && (
                <Text style={styles.taskTime}>
                  Completed at {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </Animated.View>
          ))}
        </View>

        {entry.reflection && moodInfo && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.reflectionSection}>
            <Text style={styles.reflectionLabel}>Reflection</Text>
            <View style={styles.moodRow}>
              <View style={styles.moodBubble}>
                <Ionicons name={moodInfo.icon as any} size={22} color={Colors.accent} />
              </View>
              <Text style={styles.moodText}>{moodInfo.label}</Text>
            </View>
            {entry.reflection.note && (
              <Text style={styles.noteText}>"{entry.reflection.note}"</Text>
            )}
          </Animated.View>
        )}

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, entry.completed ? styles.statusDotDone : styles.statusDotMissed]} />
          <Text style={styles.statusText}>
            {entry.completed ? 'All tasks completed' : 'Rest day'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  dateTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  levelTag: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.accent,
    marginBottom: 24,
  },
  tasksSection: {
    gap: 14,
    marginBottom: 24,
  },
  taskItem: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.neutral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  taskText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  proofContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  taskTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  reflectionSection: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    gap: 10,
  },
  reflectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moodBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  noteText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotDone: {
    backgroundColor: Colors.success,
  },
  statusDotMissed: {
    backgroundColor: Colors.neutral,
  },
  statusText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
