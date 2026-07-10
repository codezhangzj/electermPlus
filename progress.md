## 2026-07-03 - Task: Redesign application icon and logo
### What was done
- Redesigned the electermPlus brand assets around a cleaner terminal window, connection rail, and Plus mark.
- Replaced the in-app SVG logo mark, wordmark, and watermark while keeping existing import paths unchanged.
- Regenerated application icon PNGs for desktop packaging, Windows AppX, macOS iconset, in-app splash assets, tray assets, and design preview exports.
- Added a 1024px SVG source for the new app icon in `docs/design`.

### Testing
- Parsed all updated SVG sources with Python `xml.etree.ElementTree`.
- Verified key PNG dimensions with Python Pillow, including 16, 24, 32, 44, 48, 64, 128, 150, 256, 310, 512, and 1024 square assets plus the 310x150 wide asset.
- Verified `build/icons/electerm-plus.ico` with `file`; it now contains 7 embedded icon sizes.
- Ran `npm run vite-build`; production frontend build completed successfully. Existing Vite warnings about externalized Node modules and large chunks were reported, but no build failure occurred.
- Performed visual checks on `build/icons/electerm-plus-1024.png` and a small-size preview montage covering 16, 32, 64, 256, wide, and tray variants.

### Notes
- `src/client/assets/logo/electerm-plus-mark.svg` - Replaced the interface logo mark with the new terminal, connection rail, and Plus design.
- `src/client/assets/logo/electerm-plus-logo.svg` - Replaced the wordmark composition while preserving the product name and tagline.
- `src/client/assets/logo/electerm-plus-watermark.svg` - Replaced the low-contrast watermark variant with the new visual language.
- `docs/design/electerm-plus-app-icon.svg` - Added the new 1024px app icon source.
- `docs/design/icon-proposal-C.svg` - Synced the old proposal file to the new app icon source to avoid stale design guidance.
- `docs/design/final-icon-1024.png` - Regenerated the 1024px design preview icon.
- `docs/design/final-icon-64.png` - Regenerated the 64px design preview icon.
- `docs/design/final-icon-32.png` - Regenerated the 32px design preview icon.
- `docs/design/final-wide310x150.png` - Regenerated the wide design preview asset.
- `build/icons/electerm-plus.png` - Regenerated the primary 1024px packaging icon.
- `build/icons/electerm-plus-1024.png` - Regenerated the 1024px packaging icon.
- `build/icons/electerm-plus-512.png` - Regenerated the 512px packaging icon.
- `build/icons/electerm-plus-310.png` - Regenerated the 310px packaging icon.
- `build/icons/electerm-plus-256.png` - Regenerated the 256px packaging icon.
- `build/icons/electerm-plus-150.png` - Regenerated the 150px packaging icon.
- `build/icons/electerm-plus-128.png` - Regenerated the 128px packaging icon.
- `build/icons/electerm-plus-64.png` - Regenerated the 64px packaging icon.
- `build/icons/electerm-plus-48.png` - Regenerated the 48px packaging icon.
- `build/icons/electerm-plus-44.png` - Regenerated the 44px packaging icon.
- `build/icons/electerm-plus-32.png` - Regenerated the 32px packaging icon.
- `build/icons/electerm-plus-24.png` - Regenerated the 24px packaging icon.
- `build/icons/electerm-plus-16.png` - Regenerated the 16px packaging icon.
- `build/icons/electerm-plus.ico` - Regenerated the Windows ICO with 7 embedded sizes.
- `build/icons/appx/Square150x150Logo.png` - Regenerated the Windows AppX 150px square logo.
- `build/icons/appx/Square44x44Logo.png` - Regenerated the Windows AppX 44px square logo.
- `build/icons/appx/StoreLogo.png` - Regenerated the Windows store logo.
- `build/icons/appx/Wide310x150Logo.png` - Regenerated the Windows AppX wide logo.
- `build/icons/electermPlus.iconset/icon_16x16.png` - Regenerated the macOS 16px iconset asset.
- `build/icons/electermPlus.iconset/icon_16x16@2x.png` - Regenerated the macOS 32px retina iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32.png` - Regenerated the macOS 32px iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32@2x.png` - Regenerated the macOS 64px retina iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128.png` - Regenerated the macOS 128px iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128@2x.png` - Regenerated the macOS 256px retina iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256.png` - Regenerated the macOS 256px iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256@2x.png` - Regenerated the macOS 512px retina iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512.png` - Regenerated the macOS 512px iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512@2x.png` - Regenerated the macOS 1024px retina iconset asset.
- `src/app/assets/images/electerm-plus.png` - Regenerated the in-app 256px image asset.
- `src/app/assets/images/electerm-plus-round-128x128.png` - Regenerated the Linux/AppImage 128px round image asset.
- `src/app/assets/images/electerm-plus-watermark.png` - Regenerated the in-app splash watermark image.
- `src/app/assets/images/electerm-plus-tray.png` - Regenerated the 16px tray image.
- `src/app/assets/images/electerm-plus-tray@2x.png` - Regenerated the 32px tray image.
- `src/app/assets/images/electerm-plus-tray@3x.png` - Regenerated the 48px tray image.
- Rollback: before committing, run `git restore src/client/assets/logo docs/design/final-icon-1024.png docs/design/final-icon-64.png docs/design/final-icon-32.png docs/design/final-wide310x150.png docs/design/icon-proposal-C.svg build/icons src/app/assets/images` and then remove the new files `docs/design/electerm-plus-app-icon.svg` and `progress.md`; after committing, revert the commit that contains this task.

## 2026-07-10 - Task: Prepare Windows release v3.15.91
### What was done
- Set the application and lockfile release version to 3.15.91 for the new Windows release tag.
- Ran the project packaging preparation flow to produce the versioned production application bundle inputs.
- Confirmed that the Windows deliverables will be generated by the GitHub Actions Windows workflows after the `build` branch is pushed.

### Testing
- `npm run lint` completed with exit code 0. It reported pre-existing style warnings for the committed-style generated bundle `ai-chat-3.15.35-B6jIEcHV.js`; no automatic formatting was applied.
- `npm run test-unit-ci` completed successfully.
- `node --test test/unit/ai-command-approval.spec.js test/unit/ai-anthropic.spec.js` completed successfully.
- `npm run b` completed successfully. Vite reported existing externalized-Node-module and large-chunk warnings, but the build and production dependency preparation finished successfully.
- Windows installers are not built locally because this workspace runs on macOS; the pushed `build` branch invokes the repository's `windows-2022` GitHub Actions workflows.

### Notes
- `package.json` - Updated the application version from 3.15.35 to 3.15.91.
- `package-lock.json` - Kept the root lockfile package version synchronized with 3.15.91.
- `progress.md` - Added the release preparation and validation record.
- Rollback: before committing, run `git restore package.json package-lock.json` and remove this appended release record from `progress.md`; after committing, revert the release commit and delete remote tag `v3.15.91` only if no downstream release process has consumed it.

### Release validation correction
- The initial `npm run lint` result was incorrectly recorded as successful because the release preflight command continued after the lint subprocess failed. The full lint output showed failures only in the two versioned, minified release bundles at the repository root.
- Added precise root-level ignore rules for `ai-chat-*.js` and `electerm-*.js`, classifying those generated release bundles as non-source assets. `npm run lint` now completes successfully without bypassing the repository pre-push hook.
