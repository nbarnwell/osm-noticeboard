import EventListViewModel from './EventListViewModel.js';
import EventViewModel from './EventViewModel.js';
import BadgeViewModel from './BadgeViewModel.js';
import IndexViewModel from './IndexViewModel.js';
import SectionViewModel from './SectionViewModel.js';
import SessionViewModel from './SessionViewModel.js';
import toTitleCase from './Text.js';

const { DateTime } = luxon;

async function get(path, params = {}) {
  const url = new URL(path, window.location.origin);

  // Add query params if provided
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

// Format time in "HH:mm" 24-hour format
function formatTime(dateString) {
  return DateTime.fromISO(dateString)
    .toFormat('HH:mm');
}

// Format date in "DD/MM/YYYY" format
function formatDate(dateString) {
  return DateTime.fromISO(dateString)
    .toFormat('dd/MM/yyyy');
}

/**
 * Set the page load timestamp in the bottom-right corner
 */
function setPageLoadTimestamp() {
  const now = DateTime.now();
  const timestampElement = document.getElementById('page-timestamp');

  if (timestampElement) {
    // Format as "DD/MM/YYYY HH:mm:ss"
    const formattedDateTime = now.toFormat('dd/MM/yyyy HH:mm:ss');

    timestampElement.textContent = `Loaded: ${formattedDateTime}`;
    timestampElement.style.cursor = 'pointer';
    timestampElement.title = 'Click to reload data';
  }
}

/**
 * Start ticking clock in the bottom left
 */
function startClock() {
  const clockElement = document.getElementById('page-clock');

  function updateClock() {
    const now = DateTime.now();
    // Format as "DD/MM/YYYY HH:mm:ss"
    const formattedDateTime = now.toFormat('dd/MM/yyyy HH:mm:ss');

    if (clockElement) {
      clockElement.textContent = formattedDateTime;
    }
  }

  updateClock();             // show immediately
  setInterval(updateClock, 1000); // update every second
}

function logoUrl(sectionType) {
  return `/images/sections/${sectionType}.png`;
}

function getBadgeFilename(badge) {
  if (!badge || typeof badge.picture !== "string") return null;
  return badge.picture.split('/').pop();
}

/**
 * Fetch evenings and determine current/next sessions
 */
async function fetchSessions(now) {
  const evenings = await get('api/evenings', { now: now.toISO() });
  // Treat entries that have a start or end time of 00:00 as "unspecified time" and
  // sort them after entries with real times (people-entered). Preserve id tie-break.
  function isMidnight(iso) {
    const dt = DateTime.fromISO(iso);
    return dt.isValid && dt.hour === 0 && dt.minute === 0 && dt.second === 0;
  }

  evenings.sort((a, b) => {
    const aIsMid = isMidnight(a.startDateTime) || isMidnight(a.endDateTime);
    const bIsMid = isMidnight(b.startDateTime) || isMidnight(b.endDateTime);

    if (aIsMid !== bIsMid) return aIsMid ? 1 : -1;

    const aMs = DateTime.fromISO(a.startDateTime).toMillis();
    const bMs = DateTime.fromISO(b.startDateTime).toMillis();

    return (aMs - bMs) || (a.id - b.id);
  });

  let currentSession = evenings.filter(x => DateTime.fromISO(x.startDateTime) <= now && DateTime.fromISO(x.endDateTime) >= now)[0];

  if (!currentSession) {
    currentSession = evenings.filter(x => DateTime.fromISO(x.startDateTime) <= now && DateTime.fromISO(x.endDateTime).plus({ minutes: 15 }) >= now)[0];
  }

  const nextSession = 
    currentSession != null 
    ? evenings.filter(x => x.sectionId === currentSession.sectionId && x.id !== currentSession.id && DateTime.fromISO(x.startDateTime) >= DateTime.fromISO(currentSession.startDateTime))[0]
    : evenings.filter(x => DateTime.fromISO(x.startDateTime) > now)[0];

  return { currentSession, nextSession };
}

/**
 * Load session data and populate the view model
 */
async function loadSessionData(viewModel, currentSession, nextSession) {
  // Build new view models first (to avoid flickering)
  let currentSessionViewModel = null;
  let nextSessionViewModel = null;
  let sectionViewModel = null;
  let eventlist = null;
  
  // Build current session if exists
  if (currentSession != null) {
    currentSessionViewModel = 
      new SessionViewModel(
        currentSession.id,
        currentSession.title,
        formatDate(currentSession.startDateTime),
        `${formatTime(currentSession.startDateTime)}`,
        `${formatTime(currentSession.endDateTime)}`,
        currentSession.notesForParents,
        currentSession.parentsRequired);
    for (const badge of currentSession.badgeLinks) {
      currentSessionViewModel.addBadge(new BadgeViewModel(badge.sectionLongName, badge.badgetypeLongName, badge.badgeLongName, getBadgeFilename(badge)));
    }
  }
  
  // Build next session if exists
  if (nextSession != null) {
    nextSessionViewModel = 
      new SessionViewModel(
        nextSession.id,
        nextSession.title,
        formatDate(nextSession.startDateTime),
        `${formatTime(nextSession.startDateTime)}`,
        `${formatTime(nextSession.endDateTime)}`,
        nextSession.notesForParents,
        nextSession.parentsRequired);
    for (const badge of nextSession.badgeLinks) {
      nextSessionViewModel.addBadge(new BadgeViewModel(badge.sectionLongName, badge.badgetypeLongName, badge.badgeLongName, getBadgeFilename(badge)));
    }
  }
  
  // Load section and events
  if (currentSession != null || nextSession != null) {
    const section = await get(`api/sections/${currentSession != null ? currentSession.sectionId : nextSession.sectionId}`);
    sectionViewModel = new SectionViewModel(toTitleCase(section.groupName), toTitleCase(section.sectionName), toTitleCase(section.sectionType), logoUrl(section.sectionType));

    if (section != null) {
      const termId = currentSession != null ? currentSession.termId : nextSession.termId;
      const events = await get(`api/sections/${section.id}/terms/${termId}/events`);
      
      if (events && events.length > 0) {
        eventlist = new EventListViewModel();
        for (const evt of events) {
          eventlist.addEvent(evt.name, evt.date, evt.starttime, evt.endtime, evt.location, evt.cost);
        }
      }
    }
  }
  
  // Now update the view model all at once (reduces flickering)
  viewModel.setCurrentSession(currentSessionViewModel);
  viewModel.setNextSession(nextSessionViewModel);
  viewModel.setCurrentSection(sectionViewModel);
  viewModel.setUpcomingEvents(eventlist);
}

document.addEventListener("DOMContentLoaded", async function () {
  // Parse the query string on the current page
  const urlParams = new URLSearchParams(window.location.search);
  const nowParam = urlParams.get('now');

  // Use the query parameter if present, otherwise use the current date
  const now = nowParam ? DateTime.fromISO(nowParam) : DateTime.now();

  // Fetch sessions
  const { currentSession, nextSession } = await fetchSessions(now);
  
  if (currentSession == null) {
    console.log(`No current session found matching timestamp ${now}`);
  } else {
    console.log(`Current session found matching timestamp ${now}: ${currentSession.title}`);
  }

  // Find the relevant sessions
  const indexViewModel = new IndexViewModel();

  // Load the session data into the view model
  await loadSessionData(indexViewModel, currentSession, nextSession);

  ko.applyBindings(indexViewModel);
  
  // Set the page load timestamp
  setPageLoadTimestamp();
  // Start ticking clock
  startClock();
  
  // Add click handler to timestamp for manual refresh
  const timestampElement = document.getElementById('page-timestamp');
  if (timestampElement) {
    timestampElement.addEventListener('click', async () => {
      console.log('[Noticeboard] Manual reload triggered');
      await reloadData(indexViewModel);
    });
  }
  
  // Set up auto-refresh functionality
  setupAutoRefresh(indexViewModel);
});

/**
 * Auto-refresh functionality - reloads data without full page refresh
 * Updates on every quarter-hour (x:00, x:15, x:30, x:45)
 */
const AUTO_REFRESH_ENABLED = true; // Set to false in development

async function reloadData(viewModel) {
  try {
    console.log('[Noticeboard] Reloading data...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const nowParam = urlParams.get('now');

    // Use the query parameter if present, otherwise use the current date
    const now = nowParam ? DateTime.fromISO(nowParam) : DateTime.now();
    const { currentSession, nextSession } = await fetchSessions(now);
    
    // Load the session data into the view model
    await loadSessionData(viewModel, currentSession, nextSession);
    
    // Update the page load timestamp
    setPageLoadTimestamp();
    
    console.log('[Noticeboard] Data reloaded successfully');
  } catch (error) {
    console.error('[Noticeboard] Error reloading data:', error);
  }
}

function setupAutoRefresh(viewModel) {
  if (!AUTO_REFRESH_ENABLED) {
    console.log('[Noticeboard] Auto-refresh is disabled');
    return;
  }
  
  function scheduleNextRefresh() {
    const now = DateTime.now();

    // Calculate the next quarter-hour
    const nextQuarterHour = now.plus({ minutes: 15 - (now.minute % 15) }).startOf('minute');

    const timeUntilRefresh = nextQuarterHour.toMillis() - now.toMillis();

    console.log(
      `[Noticeboard] Next auto-refresh scheduled at ${nextQuarterHour.toFormat('HH:mm')} (${Math.round(
        timeUntilRefresh / 1000
      )}s)`
    );

    setTimeout(async () => {
      await reloadData(viewModel);
      scheduleNextRefresh(); // schedule the next refresh
    }, timeUntilRefresh);
  }

  scheduleNextRefresh();
}