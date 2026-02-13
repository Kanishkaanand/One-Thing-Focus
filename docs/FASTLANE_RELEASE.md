# Fastlane Release Setup

This project uses Fastlane as a release orchestrator on top of EAS build/submit.

## 1. Install Ruby gems
```bash
bundle install
```

## 2. Configure credentials
1. Copy `.env.fastlane.example` to `.env.fastlane`.
2. Fill required values:
   - `FASTLANE_IOS_BUNDLE_ID`
   - `FASTLANE_ANDROID_PACKAGE_NAME`
   - Apple credentials or App Store Connect API key
   - Google Play service account JSON path

## 3. Expo auth
```bash
npx eas login
```

## 4. Common lanes
- Verify: `bundle exec fastlane verify`
- iOS release: `bundle exec fastlane ios release`
- Android release: `bundle exec fastlane android release`
- Both platforms: `bundle exec fastlane release_all`

Equivalent npm scripts:
- `npm run fastlane:verify`
- `npm run fastlane:ios`
- `npm run fastlane:android`
- `npm run fastlane:all`

## 5. Metadata-only uploads (optional)
- iOS metadata: `bundle exec fastlane ios metadata`
- Android metadata: `bundle exec fastlane android metadata`

## Notes
- Signing is handled by EAS, not Fastlane Match.
- `release` lanes run lint/tests by default.
- To skip checks:
  - `bundle exec fastlane ios release skip_verify:true`
  - `bundle exec fastlane android release skip_verify:true`
