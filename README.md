<!-- @format -->

# Habit Tracker App

A modern, client-side habit tracking web application built with React. The app helps users track habits with streaks, calendars, analytics, notes, reminders, import/export, and multilingual theme support.

## Features

- Login with fixed credentials (`admin` / `admin`).
- Dashboard with overview cards and habit progress.
- Habit management: create, edit, delete, archive, restore, and re-start completed habits.
- 21-day tracking with support for selected-days mode.
- Streak tracking and completion statistics.
- Daily calendar and history views.
- Monthly calendar page with habit events and detail modal.
- Rich text habit notes.
- Reminder settings with global and per-habit times.
- Theme support, including dark mode and multiple themes.
- Language switching between English and Persian.
- JSON import and export.
- Client-side persistence using IndexedDB.

## Tech Stack

- React
- IndexedDB
- Context API / React Hooks
- CSS Modules or Tailwind CSS
- Notification API
- Vite or Create React App

## Pages

### Login

Users log in with the fixed credentials:

- Username: `admin`
- Password: `admin`

### Dashboard

Shows:

- Active habits
- Today’s todos
- Progress cards
- Calendar preview
- Analytics widgets
- Quick actions

### Habits

A dedicated habit management page with tabs for:

- Active Habits
- Completed Habits
- Archived Habits
- Deleted Habits

### History & Stats

Shows:

- Completion trends
- Streak statistics
- Habit history
- Summary analytics

### Calendar

A Google Calendar-like page that displays habits on a monthly calendar with:

- Colored habit bars
- Day highlighting
- Filters by status and habit type
- Detail modal on click
- Weekly and monthly completion stats

### Settings

Includes:

- Theme switching
- Language switching
- Reminder configuration
- Import / export options

## Habit Modes

### Consecutive

Tracks a habit as a daily consecutive streak.

### Selected Days

Tracks a habit only on selected weekdays. Non-selected days are ignored in streak calculations and reminders.

## Data Storage

All user data is stored locally in the browser using IndexedDB, including:

- Habits
- Daily records
- Settings
- Theme and language preferences
- Reminder settings

## Import and Export

The app supports JSON export and import to allow:

- Backup and restore
- Transfer between devices
- Test data loading

## Reminder Behavior

- Global reminder time can be set for all habits.
- Each habit can override the global reminder time.
- Selected-days habits only trigger reminders on selected days.
- Reminders should only be sent for the current day after refresh or reopening the app.

## Development Notes

This app is designed to run fully on the client side and does not require a backend.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## License

This project is for personal or internal use unless a license is added.
