(function initializeDashboardClock() {
  'use strict';

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  let clockTimer = null;

  function renderClock() {
    const timeElement = document.getElementById('dashboard-time');
    const dateElement = document.getElementById('dashboard-date');
    if (!timeElement || !dateElement) return;

    const now = new Date();
    timeElement.textContent = timeFormatter.format(now);
    timeElement.dateTime = now.toISOString();
    dateElement.textContent = dateFormatter.format(now);
  }

  function scheduleClock() {
    if (clockTimer !== null) window.clearTimeout(clockTimer);
    renderClock();

    // Align updates to the next second. Re-scheduling from the current time lets
    // the clock recover immediately after display sleep or renderer throttling.
    const delayUntilNextSecond = 1000 - (Date.now() % 1000) + 10;
    clockTimer = window.setTimeout(scheduleClock, delayUntilNextSecond);
  }

  function resumeClock() {
    scheduleClock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleClock, { once: true });
  } else {
    scheduleClock();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeClock();
  });
  window.addEventListener('focus', resumeClock);
  window.addEventListener('pageshow', resumeClock);
})();
