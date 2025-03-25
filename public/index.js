import IndexViewModel from './IndexViewModel.js'
import SectionViewModel from './SectionViewModel.js';
import SessionViewModel from './SessionViewModel.js';
import toTitleCase from './Text.js';

async function get(path) {
    const url = new URL(path, 'http://localhost:3000/');

    const response = await fetch(url, { method: 'GET'});
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const json = await response.json()
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

document.addEventListener("DOMContentLoaded", async function () {
  const evenings = await get('api/evenings');
  evenings.sort((a, b) => (new Date(b.startDateTime) - new Date(a.startDateTime) - (b.id - a.id)));
  
  // Find the relevant sessions
  const now = new Date('2025-03-25T19:15:00'); //Date.now();

  const currentSession = evenings.filter(x => new Date(x.startDateTime) <= now && new Date(x.endDateTime) >= now)[0];
  if (currentSession === null) {
    console.log(`No current session found matching ${now}`)
    return;
  }

  const nextSession = evenings.filter(x => x.sectionId === currentSession.sectionId && new Date(x.startDateTime) < new Date(currentSession.startDateTime))[0];
  
  const section = await get(`api/sections/${currentSession.sectionId}`);
  const sectionViewModel = new SectionViewModel(toTitleCase(section.groupName), toTitleCase(section.sectionType));
  const currentSessionViewModel = new SessionViewModel(currentSession.title, new Date(currentSession.startDateTime), `${formatTime(currentSession.startDateTime)}`, `${formatTime(currentSession.endDateTime)}`);
  const nextSessionViewModel = new SessionViewModel(nextSession.title, formatDate(currentSession.startDateTime), `${formatTime(nextSession.startDateTime)}`, `${formatTime(nextSession.endDateTime)}`);

  const indexViewModel = new IndexViewModel(sectionViewModel, currentSessionViewModel, nextSessionViewModel);

  ko.applyBindings(indexViewModel);
});