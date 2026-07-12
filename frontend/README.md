# 🏋️ My Gym — iOS App

The native **iOS + Apple Watch** app, built entirely in SwiftUI. Log workouts, track your progress, and chat with your coach — online or off.

## Highlights

- **Fast logging** — sets, warmups, drop & failure sets, supersets, and a built-in rest timer.
- **Smart exercises** — per-machine settings that remember themselves, single-arm (iso-lateral) supersets, and bodyweight-only movements.
- **Live Activity** — follow your workout from the lock screen and Dynamic Island.
- **Apple Watch** — start, log, rest, and celebrate PRs straight from your wrist.
- **Stats that land** — calendar heatmap, streaks, volume, muscle balance, personal records & estimated 1RM.
- **AI coach** — a chat plus proactive insights, grounded in your own training data.
- **Apple Health** — average heart rate captured on every session.
- **Offline-first** — everything works with no connection and syncs when you're back.

## Screens

**Home · History · Stats · Coach** — plus a **Catalog** (exercises, gyms, brands) and a **Profile** with data export.

## Tech

Swift · SwiftUI · WidgetKit · WatchKit · HealthKit — three targets (`MyGym`, `Watch`, `Widgets`) with common code in `Shared/`.

## Local Development

1. Open the project in Xcode

```bash
open MyGym.xcodeproj
```

2. Build the application

```bash
xcodebuild -project MyGym.xcodeproj -scheme MyGym -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' build
```

> Note: To run the simulator, go to Xcode and press the run button.

## Running Demonstration

Demo mode seeds sample data and skips sign-in. It only exists in Debug builds.

1. In Xcode, go to **Product ▸ Scheme ▸ Edit Scheme… ▸ Run ▸ Arguments**.
2. Under "Arguments Passed On Launch", add `-demo`.
3. Run the app (⌘R) with the Debug configuration.

A few flags to combine with `-demo`:

| Flag | Effect |
| --- | --- |
| `-demo-empty` | Seeds an empty account instead (use alone, not with `-demo`) |
| `-demo-active` | Also starts an in-progress workout |
| `-demo-paused` | Pauses that workout (needs `-demo-active`) |
| `-demo-single-arm` | Makes that workout an iso-lateral superset (needs `-demo-active`) |
| `-demo-bodyweight` | Adds a bodyweight-only exercise to that workout (needs `-demo-active`) |
| `-tab home\|history\|stats\|coach` | Opens directly on a given tab |

Example: `-demo -demo-active -demo-paused` launches straight into a paused workout.
