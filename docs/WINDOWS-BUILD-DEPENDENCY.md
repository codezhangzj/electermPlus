# Windows build dependency source

## `@electerm/electerm-resource` 1.3.7

The npm mirror artifact for `@electerm/electerm-resource@1.3.7` is no longer available. Windows GitHub Actions jobs install dependencies from a clean checkout, so a registry dependency would fail before packaging starts.

The root `package.json` and `package-lock.json` therefore pin this development dependency to the immutable GitHub source tarball for commit `1429b45735dde7d031dd9a17d167d9e9ade2da80`. That commit's package version is `1.3.7` and retains the `tray-icons` and `res/imgs` paths used by the build scripts.

## Verification

Before changing this pin, verify a fresh dependency installation and the production preparation flow:

```sh
npm install --ignore-scripts --legacy-peer-deps
npm run b
```

Push the release commit to the `build` branch to run the Windows GitHub Actions packaging workflows.
