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

## 2026-07-22 - Task: Keep AI command approval at the bottom of the latest conversation
### What was done
- Moved AI command and approval cards below the accumulated assistant response so the current permission request remains at the bottom of its conversation.
- Added a regression contract that enforces the response-before-approval rendering order.
- Documented the AI conversation ordering rule for future maintenance.

### Testing
- Confirmed the new regression test failed before the UI order change and passed after it.
- `node --test test/unit/ai-*.spec.js` completed successfully: 23 passing tests, 0 failures.
- Targeted Standard lint completed successfully for the two changed source/test files using a writable cache directory.
- `npm run vite-build` completed successfully. Vite reported the existing externalized Node-module and large-chunk warnings, but no build failure occurred.
- The broader `node --test test/unit/*.spec.js` run remains unavailable in this checkout because `test/unit/custom-require.spec.js` loads the absent generated `src/app/package.json`; the AI-specific suites above completed successfully.

### Notes
- `src/client/components/ai/ai-chat-history-item.jsx` - Rendered the assistant response before command and approval cards.
- `test/unit/ai-command-approval.spec.js` - Added a regression assertion for the approval-card position.
- `docs/PLUS-MAINTENANCE.md` - Recorded the required AI conversation display order.
- `progress.md` - Added this implementation and validation record.
- Rollback: run `git restore src/client/components/ai/ai-chat-history-item.jsx test/unit/ai-command-approval.spec.js docs/PLUS-MAINTENANCE.md progress.md` before committing; after committing, revert the commit that contains this task.

## 2026-07-22 - Task: Add a Codex-style operations Agent interaction
### What was done
- Replaced the Agent's separated response/tool presentation with an ordered timeline that keeps assistant messages, command approvals, execution states, and results in their actual sequence.
- Added task-level planning, approval, execution, completion, stopped, failure, and step-limit status labels while retaining the existing per-tool status cards.
- Added retry for stopped, failed, and step-limit tasks, including surfaced backend request failures so they can be retried instead of leaving the UI running indefinitely.
- Continued finished Agent tasks on the same terminal with bounded text context while excluding in-flight tasks and raw tool state.
- Added English and Chinese UI labels plus light/dark timeline styling without changing command policy, approval, or audit behavior.

### Testing
- Added three regression contracts first and confirmed they failed before implementation; the completed implementation makes all three pass.
- `node --test test/unit/ai-*.spec.js` completed successfully: 26 passing tests, 0 failures.
- Targeted Standard lint completed successfully for all changed JavaScript/JSX files using a writable cache directory.
- `git diff --check` completed with no whitespace errors.
- `npm run vite-build` completed successfully. Vite reported the existing externalized Node-module and large-chunk warnings, but no build failure occurred.
- The broader `node --test test/unit/*.spec.js` entry remains unavailable because this checkout lacks the generated `src/app/package.json` loaded by `test/unit/custom-require.spec.js`; all AI-specific suites completed successfully.

### Notes
- `src/client/components/ai/agent.js` - Added ordered timeline events, bounded continuation context consumption, retryable backend failures, and task terminal-state messages.
- `src/client/components/ai/ai-chat.jsx` - Chained completed same-terminal Agent tasks with bounded context and initialized timeline metadata.
- `src/client/components/ai/ai-chat-history-item.jsx` - Rendered the unified timeline, task status labels, continued-task marker, and retry action.
- `src/client/components/ai/ai-output.jsx` - Allowed individual timeline messages to reuse Markdown output without repeating provider branding.
- `src/client/components/ai/ai.styl` - Styled the task header, ordered timeline, retry action, and dark-theme timeline state.
- `src/client/common/plus-locales.js` - Added English and Chinese task-state, continuation, and retry labels.
- `test/unit/ai-command-approval.spec.js` - Added contracts for ordered events, retry, and bounded continuation context.
- `docs/PLUS-MAINTENANCE.md` - Documented the Agent timeline, retry, continuation, and unchanged safety boundary.
- `progress.md` - Added this implementation and validation record.
- Rollback: run `git restore src/client/components/ai/agent.js src/client/components/ai/ai-chat.jsx src/client/components/ai/ai-chat-history-item.jsx src/client/components/ai/ai-output.jsx src/client/components/ai/ai.styl src/client/common/plus-locales.js test/unit/ai-command-approval.spec.js docs/PLUS-MAINTENANCE.md progress.md` before committing; after committing, revert the commit that contains this task.

## 2026-07-22 - Task: Optimize the operations Agent interaction and UI
### What was done
- Removed the duplicated inner assistant heading and consolidated terminal selection, connection state, active run state, and audit access into a compact context area.
- Reworked the composer into a shorter two-row layout with a clear primary send action and localized mode/context status labels.
- Added an explicit new-task action that preserves visible history while preventing unrelated operations work from inheriting the previous task's context.
- Reduced visual weight for completed tool steps and made waiting approval cards sticky, prominent, and easier to act on above the composer.
- Tightened spacing, shadows, message rhythm, and dark-theme states only within the AI operations assistant panel.

### Testing
- Added three interaction/UI regression contracts first and confirmed they failed before implementation; all pass after the changes.
- `node --test test/unit/ai-*.spec.js` completed successfully: 29 passing tests, 0 failures.
- Targeted Standard lint completed successfully for all changed JavaScript/JSX files using a writable cache directory.
- `git diff --check` completed with no whitespace errors.
- `npm run vite-build` completed successfully. Vite reported the existing externalized Node-module and large-chunk warnings, but no build failure occurred.
- Inspected the running AI panel before implementation using read-only desktop UI access. The running app was not reloaded after the build because it had an active SSH session; final live visual confirmation remains a manual check after a safe restart.

### Notes
- `src/client/components/ai/ai-chat.jsx` - Added explicit conversation boundaries, compact context controls, localized terminal states, and the primary send action.
- `src/client/components/ai/ai.styl` - Added the compact composer, lower-density timeline, sticky approval state, and matching dark-theme treatments.
- `src/client/common/plus-locales.js` - Added new-task, connection, terminal-input, and user-takeover labels in English and Chinese.
- `test/unit/ai-command-approval.spec.js` - Added contracts for new-task isolation, the compact composer, and sticky approvals.
- `docs/PLUS-MAINTENANCE.md` - Documented the Agent conversation boundary and UI interaction contract.
- `progress.md` - Added this implementation and validation record.
- Rollback: run `git restore src/client/components/ai/ai-chat.jsx src/client/components/ai/ai.styl src/client/common/plus-locales.js test/unit/ai-command-approval.spec.js docs/PLUS-MAINTENANCE.md progress.md` before committing; after committing, revert the commit that contains this task.

## 2026-07-22 - Task: Redesign the electermPlus Dock icon
### What was done
- Redesigned the desktop application icon around a warm-white macOS-style squircle, a dimensional blue/violet terminal cloud, a high-contrast `>_` glyph, and a restrained connection/Plus node.
- Added a transparent 1024px bitmap master and regenerated the square application assets used by macOS packaging, Windows ICO/AppX, Linux/AppImage, the development window, and design previews.
- Kept tray, watermark, wordmark, and AppX wide-tile artwork unchanged because they are independent UI/brand scenarios rather than Dock icons.
- Documented the new bitmap source of truth and the asset synchronization boundary for future maintenance.

### Testing
- Visually inspected the transparent 1024px master and a 32/64/128px comparison; the terminal glyph remains recognizable at 32px and the connection/Plus detail remains secondary.
- Validated 32 RGBA PNG assets with Pillow, including their expected dimensions, full alpha range, and fully transparent canvas corners.
- Validated `build/icons/electerm-plus.ico` with Pillow and `file`; it contains the expected 16, 24, 32, 48, 64, 128, and 256px entries.
- Confirmed the five 1024px source/packaging copies have identical SHA-256 hashes.
- `git diff --check` completed with no whitespace errors.
- `npm run vite-build` completed successfully. Vite reported the existing externalized Node-module and large-chunk warnings, but no build failure occurred.
- `iconutil` reports the repository iconset as invalid on this macOS host for both the regenerated files and a pristine copy from `HEAD`. The iconset filenames and dimensions were validated independently; current macOS packaging uses `build/icons/electerm-plus.png`, so this pre-existing tool incompatibility does not block the Dock icon change.

### Notes
- `docs/design/electerm-plus-dock-icon-1024.png` - Added the transparent 1024px bitmap master for the new dimensional Dock icon.
- `docs/design/final-icon-1024.png` - Updated the full-size design preview.
- `docs/design/final-icon-64.png` - Updated the 64px design preview.
- `docs/design/final-icon-32.png` - Updated the 32px design preview.
- `build/icons/electerm-plus.png` - Updated the primary 1024px macOS packaging icon.
- `build/icons/electerm-plus-1024.png` - Updated the 1024px square packaging asset.
- `build/icons/electerm-plus-512.png` - Updated the 512px square packaging asset.
- `build/icons/electerm-plus-310.png` - Updated the 310px square packaging asset.
- `build/icons/electerm-plus-256.png` - Updated the 256px square packaging asset.
- `build/icons/electerm-plus-150.png` - Updated the 150px square packaging asset.
- `build/icons/electerm-plus-128.png` - Updated the 128px square packaging asset.
- `build/icons/electerm-plus-64.png` - Updated the 64px square packaging asset.
- `build/icons/electerm-plus-48.png` - Updated the 48px square packaging asset.
- `build/icons/electerm-plus-44.png` - Updated the 44px square packaging asset.
- `build/icons/electerm-plus-32.png` - Updated the 32px square packaging asset.
- `build/icons/electerm-plus-24.png` - Updated the 24px square packaging asset.
- `build/icons/electerm-plus-16.png` - Updated the 16px square packaging asset.
- `build/icons/electerm-plus.ico` - Regenerated the seven-size Windows application icon.
- `build/icons/appx/Square150x150Logo.png` - Updated the Windows AppX 150px square logo.
- `build/icons/appx/Square44x44Logo.png` - Updated the Windows AppX 44px square logo.
- `build/icons/appx/StoreLogo.png` - Updated the Windows Store 50px square logo.
- `build/icons/electermPlus.iconset/icon_16x16.png` - Updated the macOS 16px iconset asset.
- `build/icons/electermPlus.iconset/icon_16x16@2x.png` - Updated the macOS 32px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32.png` - Updated the macOS 32px iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32@2x.png` - Updated the macOS 64px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128.png` - Updated the macOS 128px iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128@2x.png` - Updated the macOS 256px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256.png` - Updated the macOS 256px iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256@2x.png` - Updated the macOS 512px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512.png` - Updated the macOS 512px iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512@2x.png` - Updated the macOS 1024px Retina iconset asset.
- `src/app/assets/images/electerm-plus.png` - Updated the 256px application image shown during startup.
- `src/app/assets/images/electerm-plus-round-128x128.png` - Updated the development window and Linux/AppImage desktop icon.
- `docs/PLUS-MAINTENANCE.md` - Documented the Dock icon source of truth and synchronization scope.
- `progress.md` - Added this implementation, validation, and rollback record.
- Rollback: before committing, restore `build/icons`, the three `docs/design/final-icon-*.png` previews, and the two `src/app/assets/images/electerm-plus*.png` files from `HEAD`; move `docs/design/electerm-plus-dock-icon-1024.png` to a temporary backup; then remove only this task's maintenance section and progress entry so the earlier uncommitted AI work remains intact. After committing, revert only the commit that contains this task.

## 2026-07-23 - Task: Replace the cloud Dock icon with a black terminal design
### What was done
- Removed the cloud-shaped center mark and replaced it with an original black terminal window so the application no longer resembles the Codex icon.
- Kept the warm-white macOS squircle while adding a restrained blue/violet frame, a high-contrast `>_` prompt, terminal status dots, a small connection path, and the electermPlus badge.
- Added a deterministic SVG source and regenerated the transparent bitmap master plus all square packaging/runtime sizes.
- Updated the maintenance contract so future icon work starts from the new SVG source rather than editing a generated bitmap.

### Testing
- Parsed `docs/design/electerm-plus-dock-icon.svg` successfully with Python `xml.etree.ElementTree`.
- Visually inspected the transparent 1024px master and a 32/64/128px comparison; the black terminal silhouette and `>_` prompt remain recognizable at 32px.
- Validated 32 RGBA PNG assets with Pillow, including expected dimensions, full alpha range, and fully transparent canvas corners.
- Validated `build/icons/electerm-plus.ico` with Pillow and `file`; it contains the expected 16, 24, 32, 48, 64, 128, and 256px entries.
- Confirmed the five 1024px source/packaging copies have identical SHA-256 hashes.
- `git diff --check` completed with no whitespace errors.
- `npm run vite-build` completed successfully. Vite reported the existing externalized Node-module and large-chunk warnings, but no build failure occurred.

### Notes
- `docs/design/electerm-plus-dock-icon.svg` - Added the editable source for the new black terminal Dock icon.
- `docs/design/electerm-plus-dock-icon-1024.png` - Replaced the cloud bitmap master with the transparent black terminal export.
- `docs/design/final-icon-1024.png` - Updated the full-size design preview.
- `docs/design/final-icon-64.png` - Updated the 64px design preview.
- `docs/design/final-icon-32.png` - Updated the 32px design preview.
- `build/icons/electerm-plus.png` - Updated the primary 1024px macOS packaging icon.
- `build/icons/electerm-plus-1024.png` - Updated the 1024px square packaging asset.
- `build/icons/electerm-plus-512.png` - Updated the 512px square packaging asset.
- `build/icons/electerm-plus-310.png` - Updated the 310px square packaging asset.
- `build/icons/electerm-plus-256.png` - Updated the 256px square packaging asset.
- `build/icons/electerm-plus-150.png` - Updated the 150px square packaging asset.
- `build/icons/electerm-plus-128.png` - Updated the 128px square packaging asset.
- `build/icons/electerm-plus-64.png` - Updated the 64px square packaging asset.
- `build/icons/electerm-plus-48.png` - Updated the 48px square packaging asset.
- `build/icons/electerm-plus-44.png` - Updated the 44px square packaging asset.
- `build/icons/electerm-plus-32.png` - Updated the 32px square packaging asset.
- `build/icons/electerm-plus-24.png` - Updated the 24px square packaging asset.
- `build/icons/electerm-plus-16.png` - Updated the 16px square packaging asset.
- `build/icons/electerm-plus.ico` - Regenerated the seven-size Windows application icon.
- `build/icons/appx/Square150x150Logo.png` - Updated the Windows AppX 150px square logo.
- `build/icons/appx/Square44x44Logo.png` - Updated the Windows AppX 44px square logo.
- `build/icons/appx/StoreLogo.png` - Updated the Windows Store 50px square logo.
- `build/icons/electermPlus.iconset/icon_16x16.png` - Updated the macOS 16px iconset asset.
- `build/icons/electermPlus.iconset/icon_16x16@2x.png` - Updated the macOS 32px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32.png` - Updated the macOS 32px iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32@2x.png` - Updated the macOS 64px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128.png` - Updated the macOS 128px iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128@2x.png` - Updated the macOS 256px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256.png` - Updated the macOS 256px iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256@2x.png` - Updated the macOS 512px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512.png` - Updated the macOS 512px iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512@2x.png` - Updated the macOS 1024px Retina iconset asset.
- `src/app/assets/images/electerm-plus.png` - Updated the 256px application image shown during startup.
- `src/app/assets/images/electerm-plus-round-128x128.png` - Updated the development window and Linux/AppImage desktop icon.
- `docs/PLUS-MAINTENANCE.md` - Changed the Dock icon source of truth from the bitmap master to the new SVG source.
- `progress.md` - Added this implementation, validation, and rollback record.
- Rollback: before committing, copy `/private/tmp/electerm-plus-dock-cloud-backup-1024.png` back to `docs/design/electerm-plus-dock-icon-1024.png` and regenerate the same square assets from it; move `docs/design/electerm-plus-dock-icon.svg` to a temporary backup; then remove only this task's maintenance edits and progress entry so earlier uncommitted work remains intact. The backup hash is `01b97c4c0e8c6e1de1b6eec6f530d35e31182a9464e445fe908be4171f5767f6`. After committing, revert only the commit that contains this task.

## 2026-07-23 - Task: Repackage the local macOS arm64 application
### What was done
- Rebuilt the production frontend, prepared the packaged application dependency tree, and rebuilt the arm64 native modules.
- Generated a fresh local macOS application and DMG with signing discovery and notarization disabled only in a temporary builder configuration.
- Preserved the previous `dist` directory at `/private/tmp/electermPlus-dist-before-repack-20260723` before replacing the local package.

### Testing
- `npm run b` completed successfully, including the Vite production build and packaging preparation.
- `electron-rebuild --arch arm64 -f work/app` completed successfully for `@serialport/bindings-cpp` and `node-pty`.
- Electron Builder 26.9.0 generated `electermPlus-3.15.93-mac-arm64.dmg` and its block map successfully.
- `hdiutil verify` reported the DMG checksum as valid.
- Verified that the packaged executable is a Mach-O 64-bit arm64 binary with bundle identifier `org.electerm.electermPlus` and version `3.15.93`.
- Extracted and visually checked the packaged 1024px `icon.icns`; it contains the new black terminal design.
- Confirmed the application has only an ad-hoc linker signature with no Team ID, as expected for this local non-notarized build.
- The DMG size is 110,161,936 bytes and its SHA-256 is `83167147605016ccbe1c044dc877e643f2df2ecc1051dc9654f384c0b817bc78`.

### Notes
- `dist/electermPlus-3.15.93-mac-arm64.dmg` - Generated the local Apple Silicon installer.
- `dist/electermPlus-3.15.93-mac-arm64.dmg.blockmap` - Generated the matching differential-update block map.
- `dist/mac-arm64/electermPlus.app` - Generated the unpacked local arm64 application bundle.
- `progress.md` - Added the local packaging, validation, and rollback record.
- Rollback: move the new `dist` directory to `/private/tmp/electermPlus-dist-local-repack-20260723`, move `/private/tmp/electermPlus-dist-before-repack-20260723` back to `dist`, and remove only this task entry from `progress.md`. The packaged application is local-only; no release, upload, or repository configuration change needs external rollback.

## 2026-07-23 - Task: Make the Dock icon base pure white and repackage macOS
### What was done
- Removed the gray lower gradient from the Dock icon while preserving the black terminal, blue/violet frame, connection path, and Plus badge.
- Regenerated the transparent bitmap master and every square packaging/runtime size from the updated SVG source.
- Rebuilt the local Apple Silicon application and replaced the DMG with the pure-white-base icon version.
- Added a maintenance rule that prevents the gray base gradient from being reintroduced.

### Testing
- Parsed the updated SVG successfully and visually inspected the 1024px master plus 32/64/128px previews.
- Validated 32 RGBA PNG assets with their expected dimensions, alpha ranges, and transparent canvas corners.
- Sampled the outer base at four positions; three are exact `#FFFFFF` and the anti-aliased right edge is neutral `#FDFDFD`.
- Validated the Windows ICO entries at 16, 24, 32, 48, 64, 128, and 256px.
- `npm run b` completed successfully, including the Vite build and packaging preparation.
- Electron Builder 26.9.0 generated the arm64 DMG and block map successfully using the local non-notarized configuration.
- Extracted the packaged 1024px `icon.icns` and visually confirmed the pure white base is embedded in the application bundle.
- Verified the packaged executable is a Mach-O 64-bit arm64 binary at version 3.15.93.
- `hdiutil verify` reported the new DMG checksum as valid.
- The DMG size is 109,878,872 bytes and its SHA-256 is `646523be3417e651389cf29a5385d78d215a18c46d478fe580fb0cb8ace01be0`.
- `git diff --check` completed with no whitespace errors.

### Notes
- `docs/design/electerm-plus-dock-icon.svg` - Changed the outer squircle gradient stops to solid white.
- `docs/design/electerm-plus-dock-icon-1024.png` - Updated the transparent 1024px pure-white-base master.
- `docs/design/final-icon-1024.png` - Updated the full-size design preview.
- `docs/design/final-icon-64.png` - Updated the 64px design preview.
- `docs/design/final-icon-32.png` - Updated the 32px design preview.
- `build/icons/electerm-plus.png` - Updated the primary 1024px macOS packaging icon.
- `build/icons/electerm-plus-1024.png` - Updated the 1024px square packaging asset.
- `build/icons/electerm-plus-512.png` - Updated the 512px square packaging asset.
- `build/icons/electerm-plus-310.png` - Updated the 310px square packaging asset.
- `build/icons/electerm-plus-256.png` - Updated the 256px square packaging asset.
- `build/icons/electerm-plus-150.png` - Updated the 150px square packaging asset.
- `build/icons/electerm-plus-128.png` - Updated the 128px square packaging asset.
- `build/icons/electerm-plus-64.png` - Updated the 64px square packaging asset.
- `build/icons/electerm-plus-48.png` - Updated the 48px square packaging asset.
- `build/icons/electerm-plus-44.png` - Updated the 44px square packaging asset.
- `build/icons/electerm-plus-32.png` - Updated the 32px square packaging asset.
- `build/icons/electerm-plus-24.png` - Updated the 24px square packaging asset.
- `build/icons/electerm-plus-16.png` - Updated the 16px square packaging asset.
- `build/icons/electerm-plus.ico` - Regenerated the seven-size Windows application icon.
- `build/icons/appx/Square150x150Logo.png` - Updated the Windows AppX 150px square logo.
- `build/icons/appx/Square44x44Logo.png` - Updated the Windows AppX 44px square logo.
- `build/icons/appx/StoreLogo.png` - Updated the Windows Store 50px square logo.
- `build/icons/electermPlus.iconset/icon_16x16.png` - Updated the macOS 16px iconset asset.
- `build/icons/electermPlus.iconset/icon_16x16@2x.png` - Updated the macOS 32px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32.png` - Updated the macOS 32px iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32@2x.png` - Updated the macOS 64px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128.png` - Updated the macOS 128px iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128@2x.png` - Updated the macOS 256px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256.png` - Updated the macOS 256px iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256@2x.png` - Updated the macOS 512px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512.png` - Updated the macOS 512px iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512@2x.png` - Updated the macOS 1024px Retina iconset asset.
- `src/app/assets/images/electerm-plus.png` - Updated the 256px application image shown during startup.
- `src/app/assets/images/electerm-plus-round-128x128.png` - Updated the development window and Linux/AppImage desktop icon.
- `dist/electermPlus-3.15.93-mac-arm64.dmg` - Rebuilt the local Apple Silicon installer with the pure white icon base.
- `dist/electermPlus-3.15.93-mac-arm64.dmg.blockmap` - Regenerated the matching differential-update block map.
- `dist/mac-arm64/electermPlus.app` - Rebuilt the unpacked local application bundle.
- `docs/PLUS-MAINTENANCE.md` - Documented the solid-white Dock icon base requirement.
- `progress.md` - Added this implementation, validation, packaging, and rollback record.
- Rollback: restore `/private/tmp/electerm-plus-dock-terminal-gradient-backup.svg` and `/private/tmp/electerm-plus-dock-terminal-gradient-backup-1024.png`, regenerate the same square assets, move the current `dist` to `/private/tmp/electermPlus-dist-white-icon-20260723`, and move `/private/tmp/electermPlus-dist-before-white-icon-20260723` back to `dist`. Remove only this task's maintenance bullet and progress entry so earlier uncommitted work remains intact.

## 2026-07-23 - Task: Remove gray internal shadows from the Dock icon and repackage macOS
### What was done
- Removed the terminal and Plus badge drop shadows that were tinting the lower half of the otherwise white Dock icon base.
- Preserved the black terminal, colored border, connection path, Plus badge, white squircle, and existing outer silhouette.
- Regenerated the transparent bitmap master and all square packaging/runtime icon sizes from the corrected SVG.
- Rebuilt the local Apple Silicon application and DMG with the corrected pure-white icon.

### Testing
- Before the fix, 68.64% of the 37,881 opaque pixels in the bottom test region (`x=200..820`, `y=840..900`) were non-white, with a minimum RGB value of `(221, 222, 224)`.
- Parsed the corrected SVG successfully and confirmed it no longer contains `terminalShadow` or `badgeShadow` definitions or references.
- Validated 32 RGBA PNG assets with their expected dimensions, transparent corners, and matching 1024px master hashes.
- Confirmed all 37,881 opaque pixels in the bottom test region are exact `#FFFFFF`; the corrected master preserves the previous alpha channel exactly.
- Visually inspected the corrected 1024px master and 32/64/128px previews; the terminal and Plus badge remain recognizable without the internal shadows.
- Validated the Windows ICO entries at 16, 24, 32, 48, 64, 128, and 256px.
- `npm run b` completed successfully, including the Vite production build and packaging preparation.
- Electron Builder 26.9.0 rebuilt the arm64 native modules and generated the local DMG and block map using the temporary non-notarized configuration.
- `hdiutil verify` reported the DMG checksum as valid.
- Verified the packaged executable is a Mach-O 64-bit arm64 binary with bundle identifier `org.electerm.electermPlus` and version `3.15.93`; its signature is ad hoc with no Team ID.
- Extracted the 1024px icon from both the unpacked application and the read-only mounted DMG; both are pixel-identical to the corrected master and have zero non-white pixels in the bottom test region.
- The DMG size is 109,405,180 bytes and its SHA-256 is `d953c53620b78cb2c9921a25e5fca7c9451e68bb716c1d612e8341b41f92ff9e`.
- `git diff --check` completed with no whitespace errors.

### Notes
- `docs/design/electerm-plus-dock-icon.svg` - Removed the terminal and badge drop-shadow filters.
- `docs/design/electerm-plus-dock-icon-1024.png` - Updated the transparent 1024px pure-white-base master.
- `docs/design/final-icon-1024.png` - Updated the full-size design preview.
- `docs/design/final-icon-64.png` - Updated the 64px design preview.
- `docs/design/final-icon-32.png` - Updated the 32px design preview.
- `build/icons/electerm-plus.png` - Updated the primary 1024px macOS packaging icon.
- `build/icons/electerm-plus-1024.png` - Updated the 1024px square packaging asset.
- `build/icons/electerm-plus-512.png` - Updated the 512px square packaging asset.
- `build/icons/electerm-plus-310.png` - Updated the 310px square packaging asset.
- `build/icons/electerm-plus-256.png` - Updated the 256px square packaging asset.
- `build/icons/electerm-plus-150.png` - Updated the 150px square packaging asset.
- `build/icons/electerm-plus-128.png` - Updated the 128px square packaging asset.
- `build/icons/electerm-plus-64.png` - Updated the 64px square packaging asset.
- `build/icons/electerm-plus-48.png` - Updated the 48px square packaging asset.
- `build/icons/electerm-plus-44.png` - Updated the 44px square packaging asset.
- `build/icons/electerm-plus-32.png` - Updated the 32px square packaging asset.
- `build/icons/electerm-plus-24.png` - Updated the 24px square packaging asset.
- `build/icons/electerm-plus-16.png` - Updated the 16px square packaging asset.
- `build/icons/electerm-plus.ico` - Regenerated the seven-size Windows application icon.
- `build/icons/appx/Square150x150Logo.png` - Updated the Windows AppX 150px square logo.
- `build/icons/appx/Square44x44Logo.png` - Updated the Windows AppX 44px square logo.
- `build/icons/appx/StoreLogo.png` - Updated the Windows Store 50px square logo.
- `build/icons/electermPlus.iconset/icon_16x16.png` - Updated the macOS 16px iconset asset.
- `build/icons/electermPlus.iconset/icon_16x16@2x.png` - Updated the macOS 32px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32.png` - Updated the macOS 32px iconset asset.
- `build/icons/electermPlus.iconset/icon_32x32@2x.png` - Updated the macOS 64px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128.png` - Updated the macOS 128px iconset asset.
- `build/icons/electermPlus.iconset/icon_128x128@2x.png` - Updated the macOS 256px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256.png` - Updated the macOS 256px iconset asset.
- `build/icons/electermPlus.iconset/icon_256x256@2x.png` - Updated the macOS 512px Retina iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512.png` - Updated the macOS 512px iconset asset.
- `build/icons/electermPlus.iconset/icon_512x512@2x.png` - Updated the macOS 1024px Retina iconset asset.
- `src/app/assets/images/electerm-plus.png` - Updated the 256px application image shown during startup.
- `src/app/assets/images/electerm-plus-round-128x128.png` - Updated the development window and Linux/AppImage desktop icon.
- `dist/electermPlus-3.15.93-mac-arm64.dmg` - Rebuilt the local Apple Silicon installer with the shadow-free pure-white icon base.
- `dist/electermPlus-3.15.93-mac-arm64.dmg.blockmap` - Regenerated the matching differential-update block map.
- `dist/mac-arm64/electermPlus.app` - Rebuilt the unpacked local application bundle.
- `docs/PLUS-MAINTENANCE.md` - Documented that terminal and badge shadows must not cover the white base.
- `progress.md` - Added this implementation, validation, packaging, and rollback record.
- Rollback: copy `/private/tmp/electerm-plus-before-no-inner-shadow.svg` to `docs/design/electerm-plus-dock-icon.svg` and `/private/tmp/electerm-plus-before-no-inner-shadow-1024.png` to the bitmap master, regenerate the same square assets, restore the previous maintenance sentence, move the current `dist` aside, and move `/private/tmp/electermPlus-dist-before-no-inner-shadow-20260723` back to `dist`. The SVG and master backup hashes are `5c92d9688ea4087101b403150e428bd9a8ee238e28abd367f42f614171f03258` and `988547049d1cf7ab2b6a4864297fb5b7e82d9d728617a1d8a4892240a871dc82`.

## 2026-07-23 - Task: Remove the macOS gray outer icon shell
### What was done
- Added a macOS-only icon derived from the transparent master by compositing it over an opaque pure-white 1024px canvas.
- Pointed macOS packaging at the opaque asset while leaving the transparent Windows, Linux, AppX, iconset, preview, and runtime assets unchanged.
- Documented the macOS 27 icon-compositing requirement so future builds do not pass the transparent rounded master directly to macOS.
- Rebuilt the local Apple Silicon application and DMG with the single-layer white Dock icon.

### Testing
- Compared the installed Codex icon resource with the previous electermPlus icon: the Codex canvas is fully opaque, while electermPlus previously had a transparent alpha bounding box of `(64, 64, 960, 960)`.
- Validated `build/icons/electerm-plus-mac.png` as 1024x1024 RGBA with alpha extrema `(255, 255)` and exact `#FFFFFF` in all four corners.
- Confirmed all 758,286 fully opaque pixels from the transparent source are unchanged in the macOS derivative, so the terminal artwork was not resized or recolored.
- Parsed both the release and temporary local Electron Builder configurations successfully after changing the macOS icon path.
- Electron Builder 26.9.0 rebuilt the arm64 native modules and generated the local DMG and block map successfully.
- `hdiutil verify` reported the DMG checksum as valid.
- Extracted the 1024px `icon.icns` from both the unpacked application and the read-only mounted DMG; both are fully opaque, have a full-canvas alpha bounding box, have exact-white corners, and are pixel-identical to the macOS source asset.
- Used Finder's macOS 27 system icon renderer at 96px size to inspect the packaged application. The previous screenshot's outer-face samples were gray (`RGB 192-225`); the new icon face samples at the left, right, and bottom are exact `RGB(255, 255, 255)`. Only the standard external system shadow remains.
- The packaged executable is a Mach-O 64-bit arm64 binary with an ad hoc signature and no Team ID.
- The DMG size is 109,296,454 bytes and its SHA-256 is `6fb24e9d9ff7c111db770fd70e277baf90f24f524e4598aae0b60b06d43b0f0b`.
- `git diff --check` completed with no whitespace errors.

### Notes
- `build/icons/electerm-plus-mac.png` - Added the fully opaque pure-white macOS packaging icon.
- `build/electron-builder.json` - Pointed macOS packaging at the macOS-only opaque icon.
- `docs/PLUS-MAINTENANCE.md` - Documented the opaque macOS canvas and platform-specific generation rule.
- `dist/electermPlus-3.15.93-mac-arm64.dmg` - Rebuilt the local Apple Silicon installer with the single-layer white icon.
- `dist/electermPlus-3.15.93-mac-arm64.dmg.blockmap` - Regenerated the matching differential-update block map.
- `dist/mac-arm64/electermPlus.app` - Rebuilt the unpacked local application bundle.
- `progress.md` - Added this implementation, validation, packaging, and rollback record.
- Rollback: move `build/icons/electerm-plus-mac.png` aside, copy `/private/tmp/electerm-plus-before-opaque-mac-electron-builder.json` back to `build/electron-builder.json`, copy `/private/tmp/electerm-plus-before-opaque-mac-maintenance.md` back to `docs/PLUS-MAINTENANCE.md`, restore `/private/tmp/electerm-plus-before-opaque-mac-local-builder.json` only if another local package is needed, move the current `dist` aside, and move `/private/tmp/electermPlus-dist-before-opaque-mac-icon-20260723` back to `dist`.

## 2026-07-28 - Task: Implement the mobile Web SSH UI
### What was done
- Added an independent mobile Web entry that does not load the Electron preload bridge or change the existing desktop interface.
- Implemented the server list, quick connection form, terminal view, simulated command responses, connection state, and mobile terminal shortcut bar.
- Added direct terminal focus for the iPhone system keyboard, iOS input safeguards, visual viewport resizing, and safe-area layout handling.
- Added dedicated development and production build commands for the mobile interface.
- Documented the current UI-only boundary, local run/build commands, validation evidence, and the remaining real SSH gateway dependency.

### Testing
- `node_modules/.bin/eslint --no-cache --config node_modules/standard/eslintrc.json build/vite/mobile-conf.js src/mobile-web/main.jsx src/mobile-web/mobile-ssh-app.jsx` completed successfully.
- `npm run mobile-web-build` completed successfully and generated `work/mobile-web/`.
- Verified the home, quick connection, and terminal views at `390×844`; entering `whoami` through the focused system-keyboard control and pressing Enter appended the expected `deploy` output.
- Verified at `320×740` that the document width remains 320px with no page-level horizontal overflow; the wider shortcut row scrolls inside its own container.
- Confirmed the terminal input uses `autocapitalize=none`, `autocorrect=off`, `autocomplete=off`, `spellcheck=false`, `inputmode=text`, and a computed 16px font size.
- Confirmed the mobile page does not expose `window.api` or `window.pre` and produced no browser console errors during the interaction checks.

### Notes
- `package.json` - Added the `mobile-web-dev` and `mobile-web-build` commands.
- `build/vite/mobile-conf.js` - Added the standalone mobile Web Vite development and production build configuration.
- `src/mobile-web/index.html` - Added the mobile browser document, iOS web-app metadata, viewport behavior, and application mount point.
- `src/mobile-web/main.jsx` - Added the standalone React entry.
- `src/mobile-web/mobile-ssh-app.jsx` - Added the mobile server list, quick connection, terminal, mock command, and system-keyboard interactions.
- `src/mobile-web/mobile-ssh-app.styl` - Added the responsive mobile visual system, terminal layout, safe areas, and 320px narrow-screen behavior.
- `docs/codex关于移动SSH网页端的文档/01-移动SSH界面运行与验收说明-2026年07月28日-22时31分.md` - Added the Chinese run, build, scope, validation, and follow-up guide.
- `progress.md` - Added this implementation, testing, file list, and rollback record.
- Rollback: remove `src/mobile-web/`, `build/vite/mobile-conf.js`, and the dated mobile SSH UI guide; remove only the two `mobile-web-*` scripts from `package.json`; remove only this task entry from `progress.md`; optionally delete the generated ignored directory `work/mobile-web/`. This leaves all pre-existing desktop, icon, AI, documentation, and progress changes untouched.

## 2026-07-28 - Task: Deploy the public single-user mobile SSH gateway
### What was done
- Replaced the UI-only simulated terminal flow with a real same-origin API and WSS SSH gateway while leaving the Electron desktop authentication path unchanged.
- Added a single-administrator scrypt password, signed HttpOnly session cookie, strict Origin checks, login failure limiting, SSH host allowlisting, session ownership, idle cleanup, and conservative security response headers.
- Added real password-authenticated SSH shell relay through `@electerm/ssh2`, persistent known-host verification, explicit first-use fingerprint confirmation, xterm output, resize handling, iPhone native keyboard focus, and mobile terminal shortcut keys.
- Fixed the administrator password helper so a terminal that delivers an entire input line in one chunk completes correctly instead of treating the newline as password data.
- Deployed the production build to the user's Tencent Cloud Ubuntu server as an enabled systemd service listening only on `127.0.0.1:5581`.
- Routed `ssh.aizzj.cloud` through the server's existing Cloudflare Tunnel to provide public HTTPS/WSS without exposing the Node port or coupling the new service to a public Nginx listener. Preserved the existing Hermes route and restored Nginx to its original inactive/disabled state after the direct-certificate attempt was blocked by the DNSPod webblock response.
- Restricted the production SSH allowlist to the current server addresses and stored the generated gateway credential material only in a root-owned `0600` environment file. The SSH and gateway passwords were not written to the repository or deployment documentation.
- Documented the deployed paths, service operations, Cloudflare Tunnel topology, alternative proxy examples, validation checks, limitations, and rollback sequence.

### Testing
- Backend and test ESLint completed successfully for the Vite proxy, password helper, security service, SSH session manager, gateway server, and both mobile SSH test suites.
- Browser-environment ESLint completed successfully for the mobile API, login/connection application, entry point, and xterm component.
- `npm run mobile-web-build` completed successfully; Vite generated the production page in `work/mobile-web/` with a 11.96 kB CSS bundle and 494.25 kB JavaScript bundle.
- `node --test test/unit-ci/mobile-ssh-security.spec.js test/unit-ci/mobile-ssh-gateway.spec.js` passed 4/4 tests, covering password hashing, mandatory allowlisting, HTTPS enforcement, unauthenticated rejection, hostile-Origin rejection, HttpOnly/SameSite cookies, first-use host-key confirmation, known-host persistence, real SSH shell creation, WSS input, and terminal output.
- Mobile browser validation at `390×844` completed the login, connection form, first-use fingerprint confirmation, real terminal connection, system-keyboard input, and `whoami` response. At `320×740`, the document and body widths remained 320px with no page-level horizontal overflow and no browser console warnings or errors.
- The password helper was re-run through a TTY with a complete password line delivered in one chunk; it exited successfully and produced a valid `scrypt$...` hash after the fix.
- The uploaded 142 kB deployment archive matched SHA-256 `99556b39844928320cf5a13ab40fa0bdbba1cf5b720777ecd64ff29949b76ae0`. Remote production dependency installation added 84 packages and reported 0 known vulnerabilities.
- `systemd-analyze verify` accepted the mobile SSH unit; the only emitted warning belongs to the pre-existing unrelated `tat_agent.service` legacy PID path.
- The production service is enabled and active, reports `mobile SSH gateway listening on 127.0.0.1:5581`, and `ss` confirms port 5581 is bound only to `127.0.0.1`.
- The root-owned environment file is mode `0600`; the persisted mobile `known_hosts` file is mode `0600`. The current Tencent server ED25519 fingerprint is `SHA256:tn6rWzsV4IHFOKpwMKz1kYdFgw5K82WUUVLKvl54FeU`.
- Cloudflare ingress validation passed, the hostname matches the new `http://127.0.0.1:5581` rule, and `https://ssh.aizzj.cloud` plus its health endpoint return HTTP 200 through Cloudflare. The existing Hermes route remains reachable and returns its normal HTTP redirect on GET.
- A production end-to-end smoke test through the formal domain returned login 200, SSH session 201, connected over WSS, executed `whoami`, and received `ubuntu`. The service journal contained no warning-or-higher entries after deployment and testing.

### Notes
- `package.json` - Added the mobile build, password-hash, and production gateway commands.
- `build/vite/mobile-conf.js` - Added the standalone mobile build and local API/WSS development proxies.
- `build/bin/mobile-ssh-password.js` - Added hidden administrator password hashing and corrected multi-character TTY input handling.
- `src/mobile-server/security.js` - Added the production configuration checks, scrypt credential verification, signed session cookie, Origin validation, host allowlist, and login limiting.
- `src/mobile-server/ssh-session-manager.js` - Added allowlisted SSH password sessions, known-host verification, fingerprint confirmation, WSS ownership, relay, resize, limits, and cleanup.
- `src/mobile-server/server.js` - Added the production static server, authentication/session API, security headers, same-origin WebSocket endpoint, and lifecycle handling.
- `src/mobile-web/api.js` - Added same-origin API requests and WSS URL construction.
- `src/mobile-web/app.jsx` - Added the real administrator login, recent-host list, SSH connection, host-fingerprint confirmation, and terminal state flow.
- `src/mobile-web/mobile-terminal.jsx` - Added the xterm WebSocket terminal, native mobile textarea focus, resize synchronization, and shortcut-key input.
- `src/mobile-web/main.jsx` - Switched the mobile entry from the UI-only mock to the production application.
- `src/mobile-web/mobile-ssh-app.styl` - Added the login, empty, fingerprint, connection, and real xterm responsive states.
- `src/mobile-web/mobile-ssh-app.jsx` - Removed the superseded UI-only simulated terminal implementation.
- `test/unit-ci/mobile-ssh-security.spec.js` - Added focused security configuration and password tests.
- `test/unit-ci/mobile-ssh-gateway.spec.js` - Added a real in-process SSH server and HTTP/WSS end-to-end gateway test.
- `docs/codex关于移动SSH网页端的文档/02-公网单用户SSH网关部署说明-2026年07月28日-22时54分.md` - Added and then updated the public single-user deployment guide with the actual Tencent Cloud and Cloudflare Tunnel landing point.
- `progress.md` - Appended this implementation, deployment, verification, file list, and rollback record.
- `/home/ubuntu/electerm-mobile-ssh/` - Installed the production web build, gateway source, minimal package manifest/lockfile, production dependencies, and persistent `data/known_hosts` on the Tencent Cloud server.
- `/etc/electerm-mobile-ssh.env` - Stored only production hashes, secrets, origin, allowlist, bind address, and known-host path as root-owned mode `0600` data.
- `/etc/systemd/system/electerm-mobile-ssh.service` - Added the enabled production service for the loopback-only Node gateway.
- `/home/ubuntu/.cloudflared/config.yml` - Preserved the Hermes ingress and added `ssh.aizzj.cloud -> http://127.0.0.1:5581` before the catch-all rule.
- `/home/ubuntu/.cloudflared/config.yml.before-electerm-mobile-ssh-20260728-2308` - Saved the executable rollback point for the pre-deployment tunnel configuration.
- Cloudflare DNS - Replaced the prior hostname record with the tunnel-managed CNAME for `ssh.aizzj.cloud`.
- Rollback: on the Tencent server run `sudo systemctl disable --now electerm-mobile-ssh.service`; restore `/home/ubuntu/.cloudflared/config.yml.before-electerm-mobile-ssh-20260728-2308` to `/home/ubuntu/.cloudflared/config.yml`, validate ingress, and restart `cloudflared.service`; remove only the `ssh.aizzj.cloud` tunnel CNAME in Cloudflare while retaining `hermes.aizzj.cloud`; retain `/etc/electerm-mobile-ssh.env`, the systemd unit, deployment directory, and `known_hosts` until backup or audit needs are resolved. For a full source rollback, remove only the mobile gateway/server/test/document files listed above, remove the four `mobile-*` scripts from `package.json`, restore the prior UI-only mobile entry if it is still required, and leave all unrelated icon, AI, desktop, documentation, and historical progress changes untouched.

## 2026-07-28 - Task: Add 207.56.229.202 to the production mobile SSH allowlist
### What was done
- Added only `207.56.229.202` to the existing production `MOBILE_SSH_ALLOWED_HOSTS` value without changing authentication, Cloudflare Tunnel, SSH protocol, or other host entries.
- Backed up the previous root-owned environment file before the edit, preserved mode `0600`, and restarted the mobile SSH gateway so the new allowlist is active.
- Updated the public deployment guide to match the live production allowlist.

### Testing
- Read the production allowlist after the edit and confirmed it is exactly `127.0.0.1,159.75.6.223,ssh.aizzj.cloud,207.56.229.202`.
- Confirmed both the active environment file and its rollback backup are owned by `root:root` with mode `0600`.
- Confirmed `electerm-mobile-ssh.service` returned `active` after restart.
- Confirmed the loopback health endpoint returned `{"ok":true}` after restart.

### Notes
- `/etc/electerm-mobile-ssh.env` - Added `207.56.229.202` to the production SSH host allowlist.
- `/etc/electerm-mobile-ssh.env.before-allowlist-207-56-229-202-20260728-2323` - Saved the pre-change production environment as the executable rollback point.
- `docs/codex关于移动SSH网页端的文档/02-公网单用户SSH网关部署说明-2026年07月28日-22时54分.md` - Synchronized both documented allowlist locations with production.
- `progress.md` - Appended this production configuration, verification, file list, and rollback record.
- Rollback: run `sudo cp -p /etc/electerm-mobile-ssh.env.before-allowlist-207-56-229-202-20260728-2323 /etc/electerm-mobile-ssh.env` on the Tencent server, then run `sudo systemctl restart electerm-mobile-ssh.service` and confirm the loopback health endpoint returns `{"ok":true}`. This removes only `207.56.229.202` and preserves all previous allowlist entries and unrelated deployment state.

## 2026-07-29 - Task: Optimize iPhone keyboard input and deploy the mobile SSH frontend
### What was done
- Reduced avoidable iPhone input latency by writing visual viewport height directly to CSS, coalescing terminal fitting into animation frames, and trailing-throttling terminal resize messages.
- Corrected Apple soft-keyboard behavior by disabling browser text assistance on the xterm input, preserving terminal focus when keyboard and shortcut controls are used, and applying one-shot Ctrl transformations to both hardware-style and soft-keyboard input.
- Prevented the terminal resize feedback loop by giving the page and application an explicit visual-viewport height while retaining an 80px terminal area in heavily compressed keyboard layouts.
- Queued input generated while the terminal WebSocket is still connecting and flushed it in order after connection, without introducing unsafe local terminal echo.
- Backed up the previous production web build, deployed the updated build and matching frontend source to the Tencent Cloud application directory, and restarted the existing service without changing authentication, allowlists, SSH relay, or Cloudflare Tunnel configuration.
- Updated the deployment guide with the keyboard behavior, measured public latency boundary, and the production rollback point.

### Testing
- Frontend ESLint completed successfully for `src/mobile-web/app.jsx` and `src/mobile-web/mobile-terminal.jsx`.
- `npm run mobile-web-build` completed successfully and generated `index-Cg0_d_iQ.js` plus `index-HlpIqeF1.css`.
- `node --test test/unit-ci/mobile-ssh-security.spec.js test/unit-ci/mobile-ssh-gateway.spec.js` passed 4/4 tests after granting the test runner permission to bind a temporary loopback port.
- Browser validation at `390×844` confirmed that the page and app remained fixed at 844px while the terminal height stayed stable at 554px across repeated checks; terminal input attributes, keyboard-button focus, one-shot Ctrl+C, `whoami`, and shortcut-button focus all behaved as expected.
- Browser validation at `320×300` retained an 80px terminal and had no document-level horizontal overflow; at `320×740` it retained a 450px terminal with no horizontal overflow.
- `git diff --check` completed without whitespace errors for the three frontend source files.
- Production `electerm-mobile-ssh.service` is active; its loopback and public health endpoints both returned `{"ok":true}`; the public page references the new JavaScript and CSS asset names.
- A production end-to-end smoke test through `https://ssh.aizzj.cloud` completed administrator login, SSH session creation, WSS attachment, `whoami`, and received `ubuntu`. The post-restart service journal showed a clean startup with no application warnings or errors.

### Notes
- `src/mobile-web/app.jsx` - Replaced React-driven viewport resizing with a coalesced CSS viewport-height update.
- `src/mobile-web/mobile-terminal.jsx` - Added Apple input attributes, connecting-state input buffering, soft-keyboard Ctrl handling, focus preservation, and coalesced fit/resize behavior.
- `src/mobile-web/mobile-ssh-app.styl` - Fixed the application to the visual viewport, retained a usable compressed terminal height, and added touch behavior for terminal controls.
- `work/mobile-web/` - Regenerated the production mobile Web assets deployed to the server.
- `docs/codex关于移动SSH网页端的文档/02-公网单用户SSH网关部署说明-2026年07月28日-22时54分.md` - Documented the iPhone keyboard fixes, remaining public RTT, and frontend rollback procedure.
- `progress.md` - Appended this implementation, verification, deployment, file list, and rollback record.
- `/home/ubuntu/electerm-mobile-ssh/work/mobile-web/` - Replaced the production mobile Web build.
- `/home/ubuntu/electerm-mobile-ssh/src/mobile-web/` - Added the matching updated frontend source files to the deployment directory.
- `/home/ubuntu/electerm-mobile-ssh-backup-20260729-keyboard-fix.tar.gz` - Saved the pre-deployment production web build as the executable rollback point.
- Rollback: on the Tencent server run `sudo systemctl stop electerm-mobile-ssh.service`, then `tar -xzf /home/ubuntu/electerm-mobile-ssh-backup-20260729-keyboard-fix.tar.gz -C /home/ubuntu/electerm-mobile-ssh`, then `sudo systemctl start electerm-mobile-ssh.service`; confirm both loopback and public health endpoints return `{"ok":true}`. This restores only the prior mobile web build and preserves the current allowlist, authentication secrets, known hosts, SSH relay, and Cloudflare Tunnel configuration.
