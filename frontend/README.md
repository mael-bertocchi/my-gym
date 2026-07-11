# My Gym - Frontend

The frontend is the iOS app built with SwiftUI. It handles sign-in, shows the main workout tabs, and syncs workout data with the backend.

## How it works

- Starts with authentication and local bootstrap, then opens the main app shell.
- Covers home, history, stats, and coach flows.
- Supports active workouts and a resume flow.

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
