/**
 * Auto-refresh functionality for the noticeboard.
 * Reloads the page on every quarter-hour (x:00, x:15, x:30, x:45)
 * Controlled by the `AUTO_REFRESH_ENABLED` flag.
 */

const AUTO_REFRESH_ENABLED = true; // Set to false in development

if (AUTO_REFRESH_ENABLED) {
  function scheduleNextRefresh() {
    const now = new Date();

    // Calculate next quarter-hour
    let nextQuarter = Math.floor(now.getMinutes() / 15) * 15 + 15;
    let nextRefresh = new Date(now);
    if (nextQuarter >= 60) {
      nextQuarter -= 60;
      nextRefresh.setHours(now.getHours() + 1);
    }
    nextRefresh.setMinutes(nextQuarter, 0, 0);

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
