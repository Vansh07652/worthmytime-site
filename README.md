# Worth My Time

Worth My Time is a private, offline-first calculator that turns a purchase price into the amount of work time needed to pay for it. It supports hourly pay or annual salary, optional after-tax estimates, seven currency display formats, local settings, recent calculations, and result sharing.

The app uses only plain HTML, CSS, and JavaScript. It has no build step, external dependencies, accounts, analytics, APIs, or cloud storage.

## Run locally

Service workers require an HTTP origin, so serve the repository instead of opening `index.html` directly:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The calculator itself has no Node.js requirement.

## Deploy with GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.

All app URLs are relative, so the site works at a repository path such as `/worthmytime-site/`.

## Install on iPhone

1. Open the deployed site in Safari while online.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Confirm with **Add**.

The first visit must be online so Safari can download and cache the app. After that first successful load, the calculator can open and run offline, including in airplane mode.

## Offline cache updates

The service worker caches every core app file in `service-worker.js`. Whenever any static app file changes, update `CACHE_NAME` to a new version (for example, `worth-my-time-v4` to `worth-my-time-v5`) before deploying. This causes existing installations to discard the old cache and install the updated app shell.

## Privacy

Settings and the latest 10 calculations are stored only in the browser's local storage. Storage access is wrapped defensively so the calculator continues working if local storage is unavailable. See the in-app [privacy policy](./privacy-policy.html) for details.
