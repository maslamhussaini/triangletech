import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Freelancer Time & Invoice — Capacitor config (M1).
 *
 * appId / appName: `co.triangletech.freelancer` / "Freelancer Time & Invoice".
 * webDir: `out-freelancer/` — the scoped static export produced by
 * `npm run build:freelancer` (see scripts/build-freelancer.mjs). The
 * production website build is untouched by this config, and the
 * Tools app (see capacitor.config.ts) is a different product: no
 * reference to its appId or name appears here. (The build script
 * verifies this: `scripts/build-freelancer.mjs` fails the build if the
 * Tools app's appId or display name appears anywhere in this file,
 * comments included.)
 *
 * Native shells: Capacitor CLI 8.6.0 has no `--config` option and
 * assumes a single `android/` and `ios/` directory per project root, so
 * the freelancer native projects (`android-freelancer/` /
 * `ios-freelancer/`) were created in M2 by a temporary config swap:
 * copy this file over `capacitor.config.ts`, move the Tools `android/`
 * + `ios/` aside (both fully committed, restored afterwards and
 * verified byte-identical by `git status`), run `npx cap add android`
 * / `npx cap add ios`, rename the result to `android-freelancer/` /
 * `ios-freelancer/`, restore the Tools projects and the Tools config
 * (SHA-256 verified). `cap sync` needs the same swap + rename dance.
 *
 * Android build (M2, verified): Gradle 8.14.3 run DIRECTLY from the
 * cached distribution (`~/.gradle/wrapper/dists/...`, NOT `./gradlew` —
 * the wrapper hashes the distribution URL differently and re-downloads
 * over the blocked proxy), `--offline --no-daemon`, Gradle JVM = Temurin
 * JDK 21 (`-Djava.net.preferIPv4Stack=true` on GRADLE_OPTS and
 * `-Dorg.gradle.jvmargs`, else the daemon cannot be reached in this VM;
 * `android-freelancer/gradle.properties` carries the same flag, mirroring
 * the Tools app's baseline fix), build-tools 35.0.0 installed into the
 * shared SDK via direct curl of the official Google zip
 * (`build-tools_r35_linux.zip` — the `-` spelling 404s). Debug APK:
 * `android-freelancer/app/build/outputs/apk/debug/app-debug.apk`
 * (debug-signed, aapt2-verified `co.triangletech.freelancer` 1.0.0).
 * Emulator/device launch is NOT TESTED (no /dev/kvm, no device).
 *
 * Plugins: the same @capacitor/* 8.x set as the Tools app (app, share,
 * filesystem, preferences, status-bar, keyboard, splash-screen).
 * Deliberately NOT installed in M1: ads (no AdMob), in-app purchase
 * (no Play Billing / StoreKit) — see checklist §6.
 */
const config: CapacitorConfig = {
  appId: "co.triangletech.freelancer",
  appName: "Freelancer Time & Invoice",
  webDir: "out-freelancer",
  backgroundColor: "#312E81",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#312E81",
      showSpinner: false,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
