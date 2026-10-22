export function listenForDashboardUpdates({ db, doc, onSnapshot, bridge = globalThis.dashboardUpdates, logger = console }) {
  // Browser dashboards cannot install a Windows application update.
  if (!bridge?.checkForUpdates) return () => {};
  let lastRequestId = null;

  return onSnapshot(doc(db, 'config', 'global'), { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.exists() || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const request = snapshot.data().dashboardUpdateRequest;
    if (!request || typeof request.id !== 'string' || request.id === lastRequestId ||
        typeof request.requestedAt?.toMillis !== 'function') return;
    lastRequestId = request.id;
    Promise.resolve()
      .then(() => bridge.checkForUpdates({ id: request.id, requestedAtMs: request.requestedAt.toMillis() }))
      .catch((error) => logger.error('Dashboard update request failed:', error));
  }, (error) => logger.error('Could not listen for dashboard update requests:', error));
}
