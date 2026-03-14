# Job-Dox Field — iOS App Setup (Capacitor + LiDAR)

This guide covers building the native iOS wrapper that adds LiDAR room scanning
to the existing DryDox web app via Apple's RoomPlan API.

## Prerequisites

- macOS with Xcode 15+ installed
- iPhone 12 Pro or newer (LiDAR hardware) for testing
- Apple Developer account (for device deployment)
- Node.js 18+

## 1. Install Dependencies

```bash
cd app
npm install
```

Capacitor packages are already in `package.json`:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/ios`

## 2. Build the Web App

```bash
npm run build
```

This creates the `dist/` folder that Capacitor will bundle into the iOS app.

## 3. Initialize the iOS Project

```bash
npx cap add ios
npx cap sync ios
```

This creates the `ios/` directory with an Xcode project.

## 4. Add the LiDAR Plugin to the Xcode Project

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. In Xcode, right-click the **App** project in the navigator → **Add Files to "App"...**

3. Navigate to `ios-plugins/JobDoxLiDAR/Sources/` and add both files:
   - `JobDoxLiDARPlugin.swift`
   - `JobDoxLiDARPlugin.m`

4. Make sure they are added to the **App** target.

## 5. Add Required Frameworks

In Xcode → select the **App** target → **General** tab → **Frameworks, Libraries**:

- Add `ARKit.framework`
- Add `RoomPlan.framework`

## 6. Info.plist Entries

Add these keys to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Job-Dox uses your camera for LiDAR room scanning to measure room dimensions automatically.</string>

<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arkit</string>
</array>
```

> Note: The `arkit` device capability will restrict the app to ARKit-capable
> devices on the App Store. If you want to allow non-LiDAR devices to install
> the app (they'll just use manual room entry), remove the
> `UIRequiredDeviceCapabilities` entry.

## 7. Deployment Target

Set the iOS Deployment Target to **16.0** or higher:

- Xcode → App target → General → Minimum Deployments → iOS 16.0

## 8. Build & Run

1. Connect your iPhone 12 Pro (or newer) via USB
2. Select your device in the Xcode toolbar
3. Press **Cmd+R** to build and run

## How It Works

```
┌─────────────────────────────────────────────────┐
│  DryDoxFloorPlan.jsx                            │
│    useLiDAR() hook                              │
│      ↓                                          │
│  src/plugins/jobdox-lidar.js                    │
│    JobDoxLiDAR.checkSupport()                   │
│    JobDoxLiDAR.scanRoom()                       │
│      ↓                                          │
│  Capacitor Bridge                               │
│      ↓                                          │
│  JobDoxLiDARPlugin.swift                        │
│    → RoomPlan API (Apple's built-in scanner UI) │
│    → Returns room dimensions as JSON            │
│      ↓                                          │
│  Back to JS → rooms added to floor plan         │
└─────────────────────────────────────────────────┘
```

On web (non-Capacitor), `checkSupport()` returns `{ supported: false }` and
the UI shows "Add Rooms Manually" — the existing manual workflow.

## Development Workflow

For live-reload during development:

1. Start the Vite dev server: `npm run dev`
2. Find your machine's local IP (e.g., `192.168.1.100`)
3. In `capacitor.config.ts`, uncomment the `server.url` line and set it:
   ```ts
   server: {
     url: "http://192.168.1.100:5173",
   }
   ```
4. Run `npx cap sync ios` then build in Xcode
5. The app will load from your dev server with hot reload

## Updating After Web Changes

After modifying the web code:

```bash
npm run build
npx cap sync ios
```

Then rebuild in Xcode.
