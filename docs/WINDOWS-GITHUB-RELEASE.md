# Windows GitHub Release publishing

The Windows NSIS workflow builds `electermPlus-<version>-win-x64-installer.exe` on GitHub's `windows-2022` runner. The build remains available for the configured workflow branches, while Release publishing runs only for commits whose message contains `[release]`.

## Publishing a version

1. Ensure `package.json` contains the intended release version and the matching `v<version>` tag already exists on GitHub.
2. Push a commit to the `win-nsis` branch with `[release]` in its message.
3. The workflow derives the tag from `package.json`, creates the GitHub Release if necessary, and uploads the generated x64 NSIS installer.

No Cloudflare R2 credentials are required for this publishing path. The workflow uses the repository-scoped `GITHUB_TOKEN` with `contents: write` permission.

## Verification

After the workflow succeeds, verify the release and asset with:

```sh
gh release view v<version> --repo codezhangzj/electermPlus
```

## Rollback

Delete the uploaded asset or GitHub Release from the repository release page. To stop future automatic Release uploads, remove the `Upload installer to GitHub Release` step from `.github/workflows/win-nsis.yml`.
