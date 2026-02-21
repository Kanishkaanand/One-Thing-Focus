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
widgets/
  ios/
    Module.swift        - Widget bundle entry point
    OneThingWidget.swift - iOS widget (small + medium sizes)
    Assets.xcassets/    - Widget assets
  android/
    main/java/com/onething/
      OneThingWidgetProvider.kt - Android widget provider
    main/res/layout/
      widget_layout.xml   - Android widget layout
    main/res/xml/
      one_thing_widget_info.xml - Widget metadata
    main/res/drawable/
      widget_background.xml - Widget background shape
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
- Home screen widget (iOS + Android) showing today's task, streak, and encouraging messages
  - Requires EAS/dev build (not available in Expo Go)
  - Uses @bittingz/expo-widgets config plugin
  - Data shared via react-native-shared-group-preferences (App Groups on iOS, SharedPreferences on Android)
  - Widget data synced from AppContext on every task/profile change
  - In-app tip banner shown once after first task completion (non-web only)

## Design
- Warm minimalist aesthetic (cream background, golden amber accent)
- Nunito for headings, DM Sans for body text
- Soft animations with react-native-reanimated
- No harsh failure states, always gentle messaging

## Recent Changes
- Initial build: Full app implementation with onboarding, home, calendar, profile screens
- Redesigned 3-reminder notification system: Pick Task (morning), Focus Nudge (auto 2hrs after task creation), Wrap Up (evening) with anti-spam logic
- TaskInputModal has inline time picker pills (Morning/Afternoon/Evening/Custom) for scheduling focus nudges
- Profile shows 3 reminder toggles; Focus Nudge shows "Auto" timing indicator
- Data model: reminderFocusNudge: { enabled }, reminderWrapUp: { enabled, time } (replaced old reminderCompleteTask)
- Added completed state (State C) for home screen with animated checkmark, contextual completion messages, journal-style reflection, and "See you tomorrow" footer
- Enhanced celebration overlay: floating emoji particles, bounce animation, streak badge, bigger icon with emoji
- Added emojis to footer: moon emoji, "Rest up, you earned it" sparkle subtext
- Added reset app data feature in profile settings with confirmation modal
- Fixed streak persistence bug in processEndOfDay (no longer resets for new users or inactive days)
- Made onboarding slides swipeable (right-to-left) on mobile
- Calendar view: disabled forward navigation beyond current month
- Fixed day-detail bottom sheet: changed from formSheet to modal presentation for cross-platform compatibility
- Added level upgrade/downgrade context info card in profile screen
- Added proof submission toast with encouraging message before celebration
- Added animated launch screen with sunrise logo and rotating taglines (tappable to skip)
- Replaced app logo with "Organic Check" — hand-drawn checkmark SVG used across app icon, launch screen (draw animation), onboarding, empty state watermark, and task completion cards
- OrganicCheck component (components/OrganicCheck.tsx) supports animated stroke-dashoffset draw, configurable size/color/opacity
- Added home screen widget (iOS Swift + Android Kotlin) with task display, streak counter, and state-based encouraging messages
- Added widget data sync utility (lib/widgetData.ts) integrated into AppContext
- Added in-app widget tip banner in completed state (shows once, dismissible)
- Removed Expo splash screen image (plain cream background before custom launch screen)
