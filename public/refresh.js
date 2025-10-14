/**
 * Auto-refresh functionality for the noticeboard.
 * Reloads the page on every quarter-hour (x:00, x:15, x:30, x:45)
 * Controlled by the `AUTO_REFRESH_ENABLED` flag.
 */

const AUTO_REFRESH_ENABLED = true; // Set to false in development

if (AUTO_REFRESH_ENABLED) {
  function scheduleNextRefresh() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    // Next refresh at the next quarter-hour mark
    const nextQuarter = Math.ceil(minutes / 15) * 15;
    const nextQuarterMinutes = nextQuarter === 60 ? 0 : nextQuarter;

    // Calculate target time
    const nextRefresh = new Date(now);
    nextRefresh.setMinutes(nextQuarterMinutes, 0, 0);
    if (nextQuarter === 60) nextRefresh.setHours(now.getHours() + 1);

    const timeUntilRefresh = nextRefresh - now;

    console.log(
      `[Noticeboard] Next auto-refresh scheduled at ${nextRefresh.toLocaleTimeString()} (${Math.round(
        timeUntilRefresh / 1000
      )}s)`
    );

    setTimeout(() => location.reload(), timeUntilRefresh);
  }

  scheduleNextRefresh();
}
