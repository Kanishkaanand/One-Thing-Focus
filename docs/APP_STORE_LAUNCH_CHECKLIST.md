# App Store Launch Checklist

## 1. Product and Legal
- [ ] Replace placeholder support email in `docs/PRIVACY_POLICY.md` and `docs/TERMS_OF_USE.md`
- [ ] Publish privacy policy and terms on a public URL you control
- [ ] Add those public URLs to App Store Connect and Google Play Console
- [ ] Verify in-app links open those published URLs

## 2. App Configuration
- [ ] Replace bundle/package IDs in `app.json` with your owned namespace
- [ ] Set `expo.version` for release
- [ ] Set `ios.buildNumber` and `android.versionCode` for release
- [ ] Confirm permission copy in `app.json` matches actual usage

## 3. Build and Signing
- [ ] Log in to Expo account: `eas login`
- [ ] Configure project: `eas build:configure`
- [ ] Build iOS production: `eas build -p ios --profile production`
- [ ] Build Android production: `eas build -p android --profile production`
- [ ] Submit iOS: `eas submit -p ios --profile production`
- [ ] Submit Android: `eas submit -p android --profile production`

## 4. Store Metadata
- [ ] App name, subtitle, full description, keywords
- [ ] Privacy policy URL
- [ ] Support URL and marketing URL
- [ ] Screenshots for required device classes (phone/tablet if applicable)
- [ ] App icon QA on both platforms

## 5. Compliance Forms
- [ ] Complete App Store privacy questionnaire (App Privacy Details)
- [ ] Complete Google Play Data Safety form
- [ ] Confirm notification and photo access disclosures are accurate

## 6. Quality and Release QA
- [ ] Install dependencies and run tests: `npm install && npm test`
- [ ] Smoke test onboarding flow
- [ ] Smoke test notifications (enable, disable, change times)
- [ ] Smoke test proof upload and reflection flow
- [ ] Smoke test timezone/date boundary around midnight
- [ ] Smoke test reset app data behavior
- [ ] Test on at least one physical iOS device and one physical Android device

## 7. Post-Launch Readiness
- [ ] Add crash reporting provider (recommended: Sentry)
- [ ] Set up support triage and response SLA
- [ ] Prepare rollback/hotfix plan with version bump process

