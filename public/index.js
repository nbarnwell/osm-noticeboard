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

function logoUrl(sectionType) {
  return `/images/sections/${sectionType}.png`;
}

document.addEventListener("DOMContentLoaded", async function () {
  const evenings = await get('api/evenings');
  evenings.sort((a, b) => (new Date(a.startDateTime) - new Date(b.startDateTime) || a.id - b.id));

  // Find the relevant sessions
  //const now = new Date('2025-04-03T19:15:00'); //Date.now();
  const now = Date.now();
  const indexViewModel = new IndexViewModel();

  const currentSession = evenings.filter(x => new Date(x.startDateTime) <= now && new Date(x.endDateTime) >= now)[0];
  if (currentSession == null) {
    console.log(`No current session found matching ${now}`);
  }

  const nextSession = 
    currentSession != null 
    ? evenings.filter(x => x.sectionId === currentSession.sectionId && x.id !== currentSession.id && new Date(x.startDateTime) >= new Date(currentSession.startDateTime))[0]
    : evenings.filter(x => new Date(x.startDateTime) > new Date(now))[0];

  const section = await get(`api/sections/${currentSession != null ? currentSession.sectionId : nextSession.sectionId}`);
  const sectionViewModel = new SectionViewModel(toTitleCase(section.groupName), toTitleCase(section.sectionType), logoUrl(section.sectionType));
  indexViewModel.setCurrentSection(sectionViewModel);

  if (currentSession != null) {
    const currentSessionViewModel = new SessionViewModel(currentSession.id, currentSession.title, formatDate(currentSession.startDateTime), `${formatTime(currentSession.startDateTime)}`, `${formatTime(currentSession.endDateTime)}`, currentSession.notesForParents);
    for (const badge of currentSession.badgeLinks) {
      currentSessionViewModel.addBadge(new BadgeViewModel(badge.sectionLongName, badge.badgetypeLongName, badge.badgeLongName));
    }
    indexViewModel.setCurrentSession(currentSessionViewModel);
  }

  if (nextSession != null) {
    const nextSessionViewModel = new SessionViewModel(nextSession.id, nextSession.title, formatDate(nextSession.startDateTime), `${formatTime(nextSession.startDateTime)}`, `${formatTime(nextSession.endDateTime)}`, nextSession.notesForParents);
    for (const badge of nextSession.badgeLinks) {
      nextSessionViewModel.addBadge(new BadgeViewModel(badge.sectionLongName, badge.badgetypeLongName, badge.badgeLongName));
    }
    indexViewModel.setNextSession(nextSessionViewModel);
  }

  if (section != null) {
    const termId = currentSession != null ? currentSession.termId : nextSession.termId;
    const events = await get(`api/sections/${section.id}/terms/${termId}/events`);
    const eventlist = new EventListViewModel();

    for (const evt of events) {
      eventlist.addEvent(evt.name, evt.date);
    }
    indexViewModel.setUpcomingEvents(eventlist);
  }

  ko.applyBindings(indexViewModel);
});