# One Thing App

## Overview
A minimalist daily task commitment app that fights overwhelm by letting users focus on just one task per day. Uses progressive unlocking (earn the right to add more tasks) and gentle encouragement.

## Tech Stack
- React Native with Expo (SDK 54)
- TypeScript
- Expo Router for file-based navigation
- AsyncStorage for local persistence (no backend needed)
- Custom Google Fonts: Nunito (headings) + DM Sans (body)

## Architecture
- **Local-first**: All data in AsyncStorage, no server API calls needed
- **State management**: React Context (AppProvider in lib/AppContext.tsx)
- **Data models**: UserProfile, DailyEntry, TaskItem (defined in lib/storage.ts)

## Project Structure
```
app/
  _layout.tsx         - Root layout with providers, font loading
  onboarding.tsx      - 3-step onboarding + name input
  day-detail.tsx      - Sheet for viewing past day details
  (tabs)/
    _layout.tsx       - Tab bar (Today, Calendar, Profile)
    index.tsx         - Home screen (daily task view)
    calendar.tsx      - Monthly calendar view
    profile.tsx       - Profile & stats
lib/
  AppContext.tsx       - App-wide state context
  storage.ts          - AsyncStorage helpers, data models, utilities
  query-client.ts     - React Query setup (unused for local-only)
constants/
  colors.ts           - Warm minimalist color palette
```

## Key Features
- Progressive level system (1→2→3 tasks per day)
- Level up after 7 consecutive completed days
- Gentle downgrade for missed days (never punishes beginners)
- Proof upload for task completion
- Mood reflection after completing all tasks
- Completed state (State C): calm completion screen with sage green card accent, animated checkmark, contextual messages (generic/streak/level-up), journal-style reflection, intentional empty space, "See you tomorrow" footer
- Calendar view with day detail sheets
- Streak tracking with encouraging messages
- Dual-reminder notification system (pick task + complete task)

## Design
- Warm minimalist aesthetic (cream background, golden amber accent)
- Nunito for headings, DM Sans for body text
- Soft animations with react-native-reanimated
- No harsh failure states, always gentle messaging

## Recent Changes
- Initial build: Full app implementation with onboarding, home, calendar, profile screens
- Added dual-reminder notification system with state-aware scheduling
- Added completed state (State C) for home screen with animated checkmark, contextual completion messages, journal-style reflection, and "See you tomorrow" footer
