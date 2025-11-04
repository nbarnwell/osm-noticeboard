import EventListViewModel from './EventListViewModel.js';
import EventViewModel from './EventViewModel.js';
import BadgeViewModel from './BadgeViewModel.js';
import IndexViewModel from './IndexViewModel.js';
import SectionViewModel from './SectionViewModel.js';
import SessionViewModel from './SessionViewModel.js';
import toTitleCase from './Text.js';

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

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,  // Use 24-hour format
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Set the page load timestamp in the bottom-right corner
 */
function setPageLoadTimestamp() {
  const now = new Date();
  const timestampElement = document.getElementById('page-timestamp');
  if (timestampElement) {
    const formattedDateTime = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
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
    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    if (clockElement) {
      clockElement.textContent = formattedDateTime;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);
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
  const evenings = await get('api/evenings', { now: now.toISOString() });
  evenings.sort((a, b) => (new Date(a.startDateTime) - new Date(b.startDateTime) || a.id - b.id));

  const currentSession = evenings.filter(x => new Date(x.startDateTime) <= now && new Date(x.endDateTime) >= now)[0];
  const nextSession = 
    currentSession != null 
    ? evenings.filter(x => x.sectionId === currentSession.sectionId && x.id !== currentSession.id && new Date(x.startDateTime) >= new Date(currentSession.startDateTime))[0]
    : evenings.filter(x => new Date(x.startDateTime) > new Date(now))[0];

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
      eventlist = new EventListViewModel();

      for (const evt of events) {
        eventlist.addEvent(evt.name, evt.date, evt.location, evt.cost);
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
  const now = nowParam ? new Date(nowParam) : new Date();

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
    
    const now = new Date();
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

    setTimeout(async () => {
      await reloadData(viewModel);
      scheduleNextRefresh(); // Schedule the next refresh
    }, timeUntilRefresh);
  }

  scheduleNextRefresh();
}