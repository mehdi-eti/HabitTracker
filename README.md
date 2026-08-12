<!-- @format -->

# Reboot Reset (Habit & Fitness Tracker)

A modern, offline-first web application built with React to track habits, workouts, and nutrition. Engineered for a seamless, local-first experience with robust data privacy.

## Features

- **Comprehensive Habit Tracking**: Create, edit, and track habits (consecutive or selected days). Monitor streaks, history, and analytics.
- **Workout & Nutrition Programs**: Complete management of fitness plans. Import complex JSON workout schedules, track sets, reps, weights, and daily nutrition targets with a dynamic weekly/monthly cycle system.
- **Local-First Architecture**: All data lives on the device using IndexedDB, guaranteeing privacy, offline availability, and instantaneous load times.
- **Internationalization (i18n)**: Full multi-language support (English, Persian, Turkish).
- **Advanced Theming**: Multiple aesthetic themes including Light, Dark, Midnight Blue, Warm Beige, Monochrome, Emerald Forest, Nordic Frost, and Rose Gold.
- **Data Portability**: Unified, atomic backup and restore system. Export your entire database to a JSON file and restore it on any device.

## Architecture & Tech Stack

- **Core**: React 19, Vite, TypeScript
- **Styling & UI**: Tailwind CSS, Lucide React (Icons), Recharts (Data Visualization)
- **Local Database**: [Dexie.js](https://dexie.org/) (Reactive wrapper around IndexedDB)
- **State Management**: React Context (`ThemeContext`, `I18nContext`, `AuthContext`) and `dexie-react-hooks` for reactive database subscriptions.
- **Routing**: React Router DOM

## Database Schema (Dexie)

The application maintains a robust relational schema entirely in the browser:

- `habits`, `dayRecords` (Habit tracking)
- `workoutPlans`, `workoutPlanVersions` (Versioning and configuration of fitness plans)
- `workoutDailyRecords`, `workoutSetRecords` (Daily progress, reps, weights)
- `nutritionDailyRecords`, `nutritionFoodRecords`, `extraFoodRecords` (Dietary tracking)
- `weeklyProgressRecords`, `workoutNutritionNotes` (Analytics and notes)
- `settings` (User preferences)

## Project Structure

```text
/src
├── components/         # Shared UI components (Layout, Modals, Forms)
├── contexts/           # React Context providers (Auth, I18n, Theme)
├── hooks/              # Custom React hooks
├── lib/                # Core utilities (db.ts, backup.ts, utils.ts)
├── pages/              # Main route views (Dashboard, Settings, WorkoutNutrition)
├── types/              # TypeScript interfaces (workout.ts, index.ts)
└── utils/              # Helper functions (planData.ts, planImport.ts)
```

## Security & Authentication

- The app utilizes a lightweight local authentication layer (default: `admin`/`admin`) to protect the dashboard.
- No data is sent to external servers.

## Development

### Setup

```bash
npm install
npm run dev
```

### Build

Produces an optimized production build in the `dist` directory.

```bash
npm run build
```

## Data Management & JSON Schemas

Workout and Nutrition plans can be imported dynamically via strict JSON interfaces (`PlanJsonExport`, `PlanJsonData`, `PlanJsonExercise`, etc.). Check `src/types/workout.ts` for the exact schema required to load custom fitness plans into the application.
