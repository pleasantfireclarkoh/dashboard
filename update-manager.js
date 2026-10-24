const fs = require('node:fs');
const path = require('node:path');

function createUpdateManager({ app, autoUpdater, log, storage = fs, now = Date.now, defer = setImmediate }) {
  const requestFile = path.join(app.getPath('userData'), 'last-update-request.json');
  let lastRequestId = null;
  let checkInProgress = null;
  let downloading = false;
  let downloaded = false;
  let installationScheduled = false;

  try {
    lastRequestId = JSON.parse(storage.readFileSync(requestFile, 'utf8')).id;
  } catch (error) {
    if (error.code !== 'ENOENT') log.warn('Could not read the last update request:', error);
  }

  function installDownloadedUpdate() {
    if (installationScheduled) return;
    installationScheduled = true;
    log.info('Update downloaded. Restarting app to install...');
    defer(() => autoUpdater.quitAndInstall(true, true));
  }

  autoUpdater.autoDownload = true;
  autoUpdater.on('checking-for-update', () => log.info('Checking for update...'));
  autoUpdater.on('update-available', (info) => {
    downloading = true;
    log.info('Update available:', info);
  });
  autoUpdater.on('update-not-available', () => {
    downloading = false;
    log.info('Update not available.');
  });
  autoUpdater.on('error', (error) => {
    downloading = false;
    installationScheduled = false;
    log.error('Error in auto-updater:', error);
  });
  autoUpdater.on('download-progress', (progress) => {
    log.info(`Update downloaded ${progress.percent}% (${progress.transferred}/${progress.total})`);
  });
  autoUpdater.on('update-downloaded', () => {
    downloading = false;
    downloaded = true;
    installDownloadedUpdate();
  });

  function checkForUpdates() {
    if (!app.isPackaged) return Promise.resolve({ status: 'unavailable' });
    if (downloaded) {
      installDownloadedUpdate();
      return Promise.resolve({ status: 'installing' });
    }
    if (downloading) return Promise.resolve({ status: 'downloading' });
    if (checkInProgress) return checkInProgress;

    checkInProgress = Promise.resolve()
      .then(() => autoUpdater.checkForUpdates())
      .then((result) => {
        if (result?.downloadPromise) {
          result.downloadPromise.catch((error) => {
            downloading = false;
            log.error('Update download failed:', error);
          });
        }
        return { status: result ? (downloading ? 'downloading' : 'up-to-date') : 'unavailable' };
      })
      .finally(() => { checkInProgress = null; });
    return checkInProgress;
  }

  async function handleRemoteRequest(request) {
    if (!request || typeof request.id !== 'string' || !request.id.trim() || request.id.length > 128 ||
        !Number.isFinite(request.requestedAtMs)) {
      throw new Error('Invalid dashboard update request.');
    }
    const age = now() - request.requestedAtMs;
    if (age > 15 * 60 * 1000 || age < -60 * 1000) return { status: 'expired' };
    if (request.id === lastRequestId) return { status: 'already-requested' };
    if (!app.isPackaged) return { status: 'unavailable' };

    // Each dashboard remembers the command independently so a restart cannot replay it.
    storage.mkdirSync(path.dirname(requestFile), { recursive: true });
    storage.writeFileSync(requestFile, JSON.stringify({ id: request.id }), 'utf8');
    lastRequestId = request.id;
    log.info('Admin requested an immediate update check:', request.id);
    return checkForUpdates();
  }

  return { checkForUpdates, handleRemoteRequest };
}

module.exports = { createUpdateManager };
