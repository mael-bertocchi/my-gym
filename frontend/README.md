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

3. Remove the application

```bash
xcrun simctl uninstall fr.mael-bertocchi.my-gym
```

> Note: To run the simulator, go to Xcode and press the run button.
