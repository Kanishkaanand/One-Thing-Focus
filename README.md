# One-Thing-Focus

A minimalist daily task commitment app that helps you focus on completing **one meaningful task per day**. Built with React Native and Expo.

![App Preview](assets/images/icon.png)

## Philosophy

In a world of endless to-do lists and constant overwhelm, One-Thing-Focus takes a different approach: **do less, but do it fully**. By committing to just one task each day, you build consistency, reduce decision fatigue, and make meaningful progress without burnout.

## Features

### Core Functionality
- **Single Task Focus** - Set one meaningful task for the day and complete it with full attention
- **Progressive Level System** - Start with 1 task/day, earn up to 3 as you build consistency
- **Streak Tracking** - Track current streak, longest streak, and total completed tasks
- **Proof Uploads** - Optionally attach photos, screenshots, or documents when completing tasks
- **Mood Reflection** - Log how you feel after completing tasks (energized, calm, neutral, tough)

### Level System
| Level | Tasks/Day | Unlock Requirement |
|-------|-----------|-------------------|
| 1 | 1 task | Starting level |
| 2 | 2 tasks | 7 consecutive completed days |
| 3 | 3 tasks | 7 consecutive completed days at Level 2 |

### Smart Reminders
- **Morning Reminder** - "Pick your task" notification (customizable time)
- **Evening Reminder** - "Complete your task" notification (customizable time)
- Personalized messages using your name

### Design
- Warm minimalist aesthetic with cream backgrounds and golden amber accents
- Gentle UX - never punishes, only encourages
- Custom hand-drawn animated checkmark
- Smooth animations throughout

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 54) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| State Management | React Context + [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) |
| Animations | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| Notifications | [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Backend (optional) | Express.js + PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) |

## Project Structure

```
/app                    # Expo Router pages
  ├── (tabs)/           # Tab navigation (Today, Calendar, Profile)
  ├── onboarding.tsx    # Onboarding flow
  └── day-detail.tsx    # Past day detail modal

/components             # Reusable UI components
  ├── LaunchScreen.tsx  # Animated launch screen
  └── OrganicCheck.tsx  # Hand-drawn checkmark animation

/lib                    # Business logic
  ├── AppContext.tsx    # Global state management
  ├── storage.ts        # AsyncStorage utilities
  └── notifications.ts  # Notification scheduling

/server                 # Optional Express backend
/shared                 # Shared schema definitions
/constants              # App constants (colors, etc.)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (Mac) or Android Emulator, or [Expo Go](https://expo.dev/client) app on your device

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kanishkaanand/One-Thing-Focus.git
   cd One-Thing-Focus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Run on your device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan the QR code with Expo Go app on your physical device

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Expo development server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in web browser |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |

### Backend Setup (Optional)

The app works entirely offline with local storage. If you want to use the optional backend:

1. Set up a PostgreSQL database
2. Configure your database URL in environment variables
3. Run migrations:
   ```bash
   npm run db:push
   ```
4. Start the server:
   ```bash
   npm run server
   ```

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Cream | `#FAF7F2` | Background |
| Golden Amber | `#E8913A` | Primary accent |
| Sage Green | `#7DB47D` | Success states |
| Warm Gray | `#6B6B6B` | Secondary text |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- Originally developed on [Replit](https://replit.com/@kanishkaanand89/One-Thing-Focus)
- Inspired by the "one thing" productivity philosophy

---

<p align="center">
  <i>Focus on one thing. Complete it. Repeat.</i>
</p>
