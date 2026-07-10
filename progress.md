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

## 2026-07-10 - Task: Restore Windows release builds for v3.15.92
### What was done
- Preserved the already-published v3.15.91 tag and prepared a corrective v3.15.92 release instead of rewriting remote tag history.
- Replaced the unavailable npm-mirror artifact for `@electerm/electerm-resource` with an immutable GitHub source tarball for the matching 1.3.7 resource-package commit.
- Documented the source pin and the verification procedure required before changing it.

### Testing
- Created a clean temporary installation from the updated `package.json` and `package-lock.json`; `npm install --ignore-scripts --legacy-peer-deps` completed and installed `@electerm/electerm-resource@1.3.7` from the pinned tarball.
- Verified that the installed resource package contains the `tray-icons` and `res/imgs` directories required by the build scripts.
- `npm run lint` completed successfully.
- `npm run test-unit-ci` completed successfully: 22 passing tests, 0 failures.
- `node --test test/unit/ai-command-approval.spec.js test/unit/ai-anthropic.spec.js` completed successfully: 16 passing tests, 0 failures.
- `npm run b` completed successfully. Windows artifact generation remains delegated to the Windows GitHub Actions runners after the corrected `build` branch is pushed.

### Notes
- `package.json` - Bumped the application to 3.15.92 and pinned the resource build dependency to the immutable GitHub tarball.
- `package-lock.json` - Synchronized the release version and resolved resource-package source and integrity hash.
- `docs/WINDOWS-BUILD-DEPENDENCY.md` - Documented why the resource package uses a source tarball and how to verify future changes.
- `progress.md` - Recorded the corrective release scope, evidence, and rollback point.
- Rollback: before committing, run `git restore package.json package-lock.json progress.md` and remove `docs/WINDOWS-BUILD-DEPENDENCY.md`; after committing, revert the v3.15.92 release commit and delete its remote tag only if no downstream release process has consumed it.


## 2026-07-10 - Task: Publish Windows installer through GitHub Release
### What was done
- Updated the Windows NSIS workflow to upload the generated x64 installer to the GitHub Release matching the package version when a release-trigger commit is pushed.
- Removed the Windows NSIS workflow's dependency on Cloudflare R2 credentials for release publishing.
- Added the release trigger, verification, and rollback procedure for Windows maintainers.

### Testing
- Parsed `.github/workflows/win-nsis.yml` successfully with Ruby YAML and ran `git diff --check` with no whitespace errors.
- Verified the release-tag derivation input from `package.json`: `v3.15.92`.
- The GitHub Release API upload is validated by the release-trigger workflow run after this change is pushed; local macOS does not provide PowerShell or a Windows NSIS build environment.

### Notes
- `.github/workflows/win-nsis.yml` - Added scoped GitHub Release publishing with `GITHUB_TOKEN`, guarded by the `[release]` commit-message marker, and removed R2 upload configuration from this workflow.
- `docs/WINDOWS-GITHUB-RELEASE.md` - Documented how to trigger, verify, and roll back Windows GitHub Release uploads.
- `progress.md` - Recorded this workflow and publishing-path change.
- Rollback: before committing, run `git restore .github/workflows/win-nsis.yml progress.md` and remove `docs/WINDOWS-GITHUB-RELEASE.md`; after committing, revert the workflow commit and remove the uploaded release asset or Release if it was created.


## 2026-07-10 - Task: Verify Windows installer GitHub Release v3.15.92
### What was done
- Triggered the Windows NSIS GitHub Actions release path and published the generated x64 installer as an attachment to the existing v3.15.92 GitHub Release.

### Testing
- GitHub Actions run 29094733384 completed successfully, including the `Upload installer to GitHub Release` step.
- Verified through `gh release view v3.15.92` that `electermPlus-3.15.92-win-x64-installer.exe` is in the uploaded state, with a size of 99,354,027 bytes.

### Notes
- `progress.md` - Recorded the completed external publication and verification evidence.
- Rollback: delete `electermPlus-3.15.92-win-x64-installer.exe` from the v3.15.92 GitHub Release, or delete the release if no downstream consumer has used it.
