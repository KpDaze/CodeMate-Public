# CodeMate — Android stack migration

React Native + Expo + TypeScript implementation of the existing CodeMate editor.
This is a migration draft; visual and gesture parity are not yet verified.

The original workspace ZIP is retained in the private CodeMate backup. This
public repository contains app source and build/verification infrastructure.
It does not contain that archive's reference attachments or conversation notes.

The production visual model, sample page and Zustand store match the ZIP byte
for byte. `scripts/baseline-checksums.json` records their original SHA-256 hashes.
Native views, touch responders, bundled fonts, SVG and native image sampling
replace the browser-specific implementation. No roadmap features are added.

## Verification

Locally passed: TypeScript checking, Android Metro/Hermes bundle export, seven
model tests and the baseline integrity guard. Three stale test expectations in
the ZIP were corrected to match its actual sample page, without changing the
production model.

GitHub Actions builds an x86_64 emulator APK and collects native UI screenshots.
An APK build or smoke test alone does not verify the full editor: direct dragging,
sibling crossing, all resize handles, viewport stability, content movement,
floating-editor movement, colour sampling and visual parity require checks on
Android. Do not treat the migration as finished before those pass.

## Development

- `npm ci`
- `npm run android` — native development build
- `npm run prebuild:android` — pinned Expo SDK 56 native template
- `npm run typecheck`
- `npm test`
- `npm run bundle:android`
- `python3 scripts/verify-baseline.py`

The CI APK is debug-signed for emulator verification, not a phone/store release.
No website, store publication or production signing is configured.
