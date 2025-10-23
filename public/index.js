import EventListViewModel from './EventListViewModel.js';
import EventViewModel from './EventViewModel.js';
import BadgeViewModel from './BadgeViewModel.js';
import IndexViewModel from './IndexViewModel.js';
import SectionViewModel from './SectionViewModel.js';
import SessionViewModel from './SessionViewModel.js';
import toTitleCase from './Text.js';

async function get(path) {
  const url = new URL(path, window.location.origin);

  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const json = await response.json();
  return json;
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

document.addEventListener("DOMContentLoaded", async function () {
  const evenings = await get('api/evenings');
  evenings.sort((a, b) => (new Date(a.startDateTime) - new Date(b.startDateTime) || a.id - b.id));

  // Find the relevant sessions
  //const now = new Date('2025-04-03T19:15:00'); //Date.now();
  const now = new Date();
  const indexViewModel = new IndexViewModel();

  const currentSession = evenings.filter(x => new Date(x.startDateTime) <= now && new Date(x.endDateTime) >= now)[0];
  if (currentSession == null) {
    console.log(`No current session found matching timestamp ${now}`, evenings);
  } else {
    console.log(`Current session found matching timestamp ${now}: ${currentSession.title}`);
  }

  const nextSession = 
    currentSession != null 
    ? evenings.filter(x => x.sectionId === currentSession.sectionId && x.id !== currentSession.id && new Date(x.startDateTime) >= new Date(currentSession.startDateTime))[0]
    : evenings.filter(x => new Date(x.startDateTime) > new Date(now))[0];

  const section = await get(`api/sections/${currentSession != null ? currentSession.sectionId : nextSession.sectionId}`);
  const sectionViewModel = new SectionViewModel(toTitleCase(section.groupName), toTitleCase(section.sectionType), logoUrl(section.sectionType));
  indexViewModel.setCurrentSection(sectionViewModel);

  if (currentSession != null) {
    const currentSessionViewModel = 
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
    indexViewModel.setCurrentSession(currentSessionViewModel);
  }

  if (nextSession != null) {
    const nextSessionViewModel = 
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
    indexViewModel.setNextSession(nextSessionViewModel);
  }

  if (section != null) {
    const termId = currentSession != null ? currentSession.termId : nextSession.termId;
    const events = await get(`api/sections/${section.id}/terms/${termId}/events`);
    const eventlist = new EventListViewModel();

    for (const evt of events) {
      eventlist.addEvent(evt.name, evt.date, evt.location, evt.cost);
    }
    indexViewModel.setUpcomingEvents(eventlist);
  }

  ko.applyBindings(indexViewModel);
  
  // Set the page load timestamp
  setPageLoadTimestamp();
    // Start ticking clock
    startClock();
});