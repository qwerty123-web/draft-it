# DraftIt for Android

A small native shell (Capacitor) that opens the live DraftIt web app, so the Android app always matches the website. GitHub Actions builds it on every push to `main` that touches this folder (`.github/workflows/android.yml`) and attaches `DraftIt.apk` to the **android-latest** release:

https://github.com/qwerty123-web/draft-it/releases/download/android-latest/DraftIt.apk

To install: open that link on the phone, download, and allow installing from your browser when Android asks. The APK is signed with a debug key, which is fine for testing and demos; Play Store release needs a release key (store it as GitHub secrets and switch the build to `assembleRelease`).

Build locally (needs Node 22, Java 21 and the Android SDK):

```bash
cd android-app
npm install
npx cap add android
cp -r res/* android/app/src/main/res/
npx cap sync android
cd android && ./gradlew assembleDebug
```
