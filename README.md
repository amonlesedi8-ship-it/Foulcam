# FoulCam

FoulCam is an Expo / React Native football match recorder with timestamped event markers and instant replay.

## Included
- Back-camera video recording with a match timer
- Foul, goal, yellow card, red card and offside event markers
- Event timestamps recorded against the match timer
- Replay player with 0.25x, 0.5x, 0.75x and 1x playback
- Tap an event after recording to seek to its timestamp
- New-match flow

## Run on Android

1. Install **Node.js 22.13 or newer** on a computer.
2. Unzip this folder.
3. In a terminal, open the `FoulCam` folder and run:

   ```bash
   npm install
   npx expo install --fix
   npx expo start
   ```

4. Open the project on a physical Android device using a compatible Expo development build. Camera recording is not supported in a normal desktop browser preview.
5. Grant camera and microphone permissions when prompted.

For an installable Android APK, configure an Expo development/production build with EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

The preview profile can produce an installable APK when configured in `eas.json`.

## Important notes
- Recordings are initially saved in the app's temporary cache. Exporting or permanently archiving matches is not included in this first version.
- Events are held in app memory and are cleared when starting a new match or closing the app.
- A phone should be mounted securely and positioned where it can safely capture the playing area. Follow venue rules and get permission before recording people.
- Long recordings can use substantial storage and battery. The app currently sets a three-hour maximum recording duration and an approximate 2 GB file-size cap.
- Test a short recording on the target phone before relying on it for a full match.

## Stack
- Expo SDK 58
- React Native 0.88
- `expo-camera`
- `expo-video`
- TypeScript
