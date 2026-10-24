# PTFD Dashboard

## Install on Windows

Use a 64-bit Windows 10 or Windows 11 computer.

1. Sign into the Windows account that will run the dashboard.
2. When moving from an older installation that asks for administrator approval during updates, uninstall the existing **PTFD DB** through Windows Settings first. That uninstall may require administrator approval once.
3. Copy `dist/PTFD-DB-Setup-5.0.12-x64.exe` to the Windows computer.
4. Double-click the installer normally; do not choose **Run as administrator**. It installs automatically for the current Windows user under `%LOCALAPPDATA%\Programs`, creates shortcuts, and opens the dashboard. There is no all-users option or custom installation folder.
5. Use the same Windows account to run the dashboard. Future updates install silently and reopen it without requesting administrator rights.

The dashboard opens full screen and uses the second monitor when one is connected. Press **Ctrl+Shift+Q** to close it. Internet access is needed for live dashboard content. Node.js is not needed on the computer running the installed app.

Version **5.0.9 and newer** uses a current-user-only installer and does not include the administrator elevation helper. The updater already installs silently. This avoids UAC elevation prompts for normal updates after a clean installation under the dashboard account; Windows security or organization policies may still block an installer independently.

Uninstall through **Settings > Apps > Installed apps > PTFD DB** (or **Apps & features** on Windows 10).

The dashboard sidebar uses the **Pumpkin watch** Halloween theme: warm orange accents, cobwebs, a spider, a bat, and pumpkins above the live clock. The configured department logo, live weather, and weather alerts remain connected. A small label beneath the date displays the installed app version automatically and uses the existing bottom padding without shifting the clock or sidebar. Decorations make room for active alerts and smaller screens.

## Build the Windows installer

On a Windows build computer with Node.js 22.12 or newer:

```powershell
npm ci
npm run build:win
```

The installer is written to `dist/PTFD-DB-Setup-<version>-x64.exe`. Distribute this setup file; the `win-unpacked` folder is build output, not an installer.

The build also produces `latest.yml` and an `.exe.blockmap` file for automatic updates. To publish a Windows release to the configured GitHub repository, set `GH_TOKEN` in the build environment and run `npm run release:win`. Publish the installer, blockmap, and `latest.yml` together. Building with `build:win` does not publish anything. An unsigned build may show a Windows publisher warning; public distribution with a verified publisher requires a Windows code-signing certificate configured for electron-builder.

Version **5.0.10 and newer** checks releases in `pleasantfireclarkoh/dashboard`. Existing installations configured for `TFrank615/ptfd` must receive 5.0.10 once, either by running the new installer manually or by publishing 5.0.10 to the old repository as a transition release. After that, publish future releases to the new repository.

## Request an immediate update from the admin page

Sign into `admin.html` and click **Check & Install Update**. Connected Windows dashboards check GitHub immediately, download a newer release if one is available, install it silently, and reopen automatically. The page confirms that the request was sent; it does not report completion on each computer. Startup and hourly checks continue as before.

This feature requires dashboard version **5.0.7 or newer**. Update existing dashboards to that version once using the installer or the normal automatic update, and upload the edited `admin.html` to your existing admin hosting. The department admin files do not need changes.

Requests use the existing `config/global` document's `dashboardUpdateRequest` field, so the existing Firebase rules must permit signed-in admins to update that field and dashboards to read it. Each dashboard remembers the last request locally. Requests expire after 15 minutes, so an offline dashboard will not act on an old command. A failed check can be retried with another click. Only published, newer Windows releases with their installer, blockmap, and `latest.yml` can be installed.

## Development

Use `npm start` to run from source. Both `npm run build` and `npm run build:win` create the Windows installer.

Use `npm test` to run the update command tests without connecting to GitHub or Firebase.
