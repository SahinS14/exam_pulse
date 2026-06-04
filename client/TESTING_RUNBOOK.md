# ExamPulse Development Build Runbook

## Final Identifiers

- iOS bundle identifier: `com.exampulse.app`
- Android application ID: `com.exampulse.app`
- Deep link scheme: `exampulse`

## EAS Development Build Configuration

Current `eas.json` development profile:

```json
{
  "developmentClient": true,
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

This matches the required real-device testing setup:

- `developmentClient: true` enables Expo Development Build.
- `distribution: internal` creates installable internal builds.
- `android.buildType: apk` makes Android output directly installable on devices.

## Prerequisites

1. Install and sign in to EAS CLI:

```bash
npx eas-cli login
```

2. Configure the EAS project if not already linked:

```bash
npx eas-cli build:configure
```

3. Register your iPhone or iPad for internal iOS installs before the first iOS build:

```bash
npx eas-cli device:create
```

4. Confirm backend is running and reachable from the test device.

Recommended local backend start:

```bash
cd /Users/sahin/Documents/exam_pulse/server
npm start
```

5. If the phone is on the same Wi-Fi network, set `apiBaseUrl` in `app.json` `expo.extra` to your machine IP before building. Example:

```json
"extra": {
  "apiBaseUrl": "http://192.168.1.10:5000/api",
  "whatsappNumber": "916376122867"
}
```

If you change `app.json`, rebuild the development client.

## Exact Build Commands

Android real device development build:

```bash
cd /Users/sahin/Documents/exam_pulse/client
npx eas-cli build --platform android --profile development
```

iOS real device development build:

```bash
cd /Users/sahin/Documents/exam_pulse/client
npx eas-cli build --platform ios --profile development
```

Start the Metro server for the installed development client:

```bash
cd /Users/sahin/Documents/exam_pulse/client
npx expo start --dev-client
```

Optional local Android native run if Android Studio and adb are installed:

```bash
cd /Users/sahin/Documents/exam_pulse/client
npx expo run:android
```

Optional local iOS native run if full Xcode and CocoaPods are installed:

```bash
cd /Users/sahin/Documents/exam_pulse/client
npx pod-install ios
npx expo run:ios --device
```

## End-to-End Test Checklist

### Registration

- Open the development build on a real device.
- Confirm `Splash` routes to `Login` when no session exists.
- Tap the register link.
- Enter valid `name`, `email`, `phone`, and `password`.
- Submit registration.
- Verify the backend creates the user.
- Verify the app navigates to `Paywall`.
- Verify the saved user has `role: student`.
- Verify the saved user has `isPaid: false`.

### Login

- Log out from the paywall screen.
- Enter the newly created email and password.
- Submit login.
- Verify successful login returns to `Paywall` for unpaid users.
- Enter an incorrect password.
- Verify the app shows a login failure alert.

### JWT Persistence

- Log in successfully.
- Close the app completely.
- Reopen the app from the device launcher.
- Verify `Splash` restores the saved session from Secure Store.
- Verify the app returns to `Paywall` or `Home` without asking for login again.

### Logout

- From `Paywall`, tap `Use a different account`.
- Verify the app clears the Secure Store session.
- Verify navigation returns to `Login`.
- Close and reopen the app.
- Verify `Splash` does not auto-login.

### Razorpay Payment Success

- Log in as an unpaid student.
- Open `Paywall`.
- Tap `Unlock Everything for ₹50 / year`.
- Verify the app first calls `POST /api/payment/create-order`.
- Verify the Razorpay native sheet opens.
- Complete a successful test payment with Razorpay test credentials.
- Verify the app calls `POST /api/payment/verify`.
- Verify the app navigates to `Home`.

### Razorpay Payment Failure

- Return to `Paywall` with another unpaid student account.
- Tap the unlock button.
- Cancel the checkout manually.
- Verify the app shows the cancellation message and remains on `Paywall`.
- Retry and simulate a failed payment from Razorpay test mode.
- Verify the app shows a payment failure alert.
- Verify no premium access is granted.

### Premium Status Activation

- After a successful payment, inspect the user record in MongoDB.
- Verify `isPaid` becomes `true`.
- Verify `accessExpiry` is set to about 365 days ahead.
- Close and reopen the app.
- Verify `Splash` now routes the user to `Home`.
- Verify the same account no longer lands on `Paywall`.

## Pass Criteria Before Phase 10

- Registration works on a real device.
- Login works on a real device.
- JWT persistence works after app restart.
- Logout clears the stored session.
- Razorpay success flow completes in the native SDK.
- Razorpay failure and cancellation flows are handled correctly.
- Premium activation is reflected both in MongoDB and in client navigation.

Do not start Phase 10 until every item above passes on at least one Android device and one iOS device.
