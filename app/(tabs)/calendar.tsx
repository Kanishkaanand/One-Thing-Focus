import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/AppContext';
import { getTodayDate } from '@/lib/storage';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { entries, profile } = useApp();
  const today = getTodayDate();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  const completedThisMonth = useMemo(() => {
    let count = 0;
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries[dateStr];
      if (entry && entry.tasks.length > 0) {
        total++;
        if (entry.completed) count++;
      }
    }
    return { count, total };
  }, [entries, viewYear, viewMonth, daysInMonth]);

  const prevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entries[dateStr];
    if (entry && entry.tasks.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/day-detail', params: { date: dateStr } });
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 20, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>Look Back</Text>
        </Animated.View>

        {profile && profile.currentLevelStreak > 0 && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.streakCard}>
            <Feather name="zap" size={20} color={Colors.streakGlow} />
            <Text style={styles.streakNumber}>{profile.currentLevelStreak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200)} style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Feather name="chevron-left" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Feather name="chevron-right" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }

              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today;
              const entry = entries[dateStr];
              const hasEntry = entry && entry.tasks.length > 0;
              const isCompleted = entry?.completed;
              const isFuture = dateStr > today;

              return (
                <Pressable
                  key={dateStr}
                  style={styles.dayCell}
                  onPress={() => handleDayPress(day)}
                  disabled={!hasEntry}
                >
                  <View style={[
                    styles.dayCircle,
                    isToday && styles.dayCircleToday,
                    isCompleted && styles.dayCircleCompleted,
                    hasEntry && !isCompleted && styles.dayCircleMissed,
                    isFuture && styles.dayCircleFuture,
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      isCompleted && styles.dayNumberCompleted,
                      isFuture && styles.dayNumberFuture,
                    ]}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {completedThisMonth.total > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.insightCard}>
            <Feather name="bar-chart-2" size={16} color={Colors.accent} />
            <Text style={styles.insightText}>
              This month: {completedThisMonth.count}/{completedThisMonth.total} days completed
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  streakNumber: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 24,
    color: Colors.streakGlow,
  },
  streakLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 17,
    color: Colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  dayCircleCompleted: {
    backgroundColor: Colors.success,
  },
  dayCircleMissed: {
    backgroundColor: Colors.neutral + '60',
  },
  dayCircleFuture: {
    opacity: 0.3,
  },
  dayNumber: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dayNumberToday: {
    color: Colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  dayNumberCompleted: {
    color: '#FFF',
  },
  dayNumberFuture: {
    color: Colors.neutral,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  insightText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
