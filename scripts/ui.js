/* scripts/ui.js */

import { calculateDelayTimes, getCustomSubdivisions } from './calculations.js';
import { getAudioContext } from './audio.js';

// DOM Elements for UI
const bpmInput = document.getElementById('bpm-input');
const suggestionsTable = document.getElementById('suggestions-table').querySelector('tbody');
const copyBtn = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tapBtn = document.getElementById('tap-btn');
const tapFeedback = document.getElementById('tap-feedback');
const tapProgress = document.getElementById('tap-progress');
const notification = document.getElementById('notification');
const delayPopup = document.getElementById('delay-popup');
const popupContent = document.getElementById('popup-content');
const midiProgress = document.getElementById('midi-progress');
const audioProgress = document.getElementById('audio-progress');
const sysexProgress = document.getElementById('sysex-progress');
const calculateBtn = document.getElementById('calculate-btn');

// State Variables (if needed for UI interactions)
let tapTimes = [];
let tapTimeout = null;
const maxTaps = 8;

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
  document.body.setAttribute('data-theme', initialTheme);
  updateThemeIcon();

  themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const currentTheme = document.body.getAttribute('data-theme');
  themeIcon.innerHTML = currentTheme === 'dark'
    ? `
      <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor"/>
      <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor" style="display: none;"/>
    `
    : `
      <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor" style="display: none;"/>
      <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor"/>
    `;
}

// Tap Tempo Functionality
function handleTapTempo() {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > maxTaps) {
    tapTimes.shift();
  }
  if (tapTimeout) clearTimeout(tapTimeout);
  tapTimeout = setTimeout(() => {
    tapTimes = [];
    tapFeedback.textContent = '';
    tapProgress.style.width = '0%';
  }, 1500);

  if (tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);
    bpmInput.value = bpm;
    tapFeedback.textContent = `BPM set to ${bpm}`;
    const delayTimes = calculateDelayTimes(bpm);
    populateSuggestionsTable(delayTimes);
    showNotification('BPM set via Tap Tempo!');
    // Visual Indicator
    const progress = Math.min((avgInterval / 2000) * 100, 100);
    tapProgress.style.width = progress + '%';
  } else {
    tapFeedback.textContent = 'Keep tapping...';
    tapProgress.style.width = '20%';
  }
}

// Populate Delay Suggestions Table
function populateSuggestionsTable(delayTimes) {
  suggestionsTable.innerHTML = '';
  const simpleSubdivisions = {
    'Whole Note (1/1)': 4,
    'Half Note (1/2)': 2,
    'Quarter Note (1/4)': 1,
    'Eighth Note (1/8)': 0.5,
    'Sixteenth Note (1/16)': 0.25,
    'Thirty-Second Note (1/32)': 0.125
  };
  const compoundSubdivisions = {
    'Dotted Half Note (3/4)': 3,
    'Dotted Quarter Note (3/8)': 1.5,
    'Dotted Eighth Note (3/16)': 0.75,
    'Triplet Whole Note (2/3)': 2.6667,
    'Triplet Half Note (2/3)': 1.3333,
    'Triplet Quarter Note (2/3)': 0.6667,
    'Triplet Eighth Note (2/3)': 0.3333,
    'Triplet Sixteenth Note (2/3)': 0.1667
  };

  // Add Rows Function
  function addRows(subdivisions, category) {
    if (category) {
      const categoryRow = suggestionsTable.insertRow();
      const categoryCell = categoryRow.insertCell();
      categoryCell.colSpan = 2;
      categoryCell.textContent = category;
      categoryCell.style.fontWeight = 'bold';
      categoryCell.style.backgroundColor = 'rgba(30, 144, 255, 0.1)';
      categoryCell.style.textAlign = 'center';
    }
    for (const [subdivision, factor] of Object.entries(subdivisions)) {
      const ms = (60000 / bpmInput.value) * factor;
      const row = suggestionsTable.insertRow();
      row.classList.add('clickable-row');
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Copy delay time for ${subdivision}, ${ms.toFixed(2)} milliseconds`);
      const cellSubdivision = row.insertCell();
      const cellMs = row.insertCell();
      cellSubdivision.textContent = subdivision;
      cellMs.textContent = ms.toFixed(2) + ' ms';
    }
  }

  // Add Subdivisions to Table
  addRows(simpleSubdivisions, 'Simple Subdivisions');
  addRows(compoundSubdivisions, 'Compound Subdivisions');

  // Add Custom Subdivisions
  getCustomSubdivisions().forEach(sub => {
    const ms = (60000 / bpmInput.value) * sub.factor;
    const row = suggestionsTable.insertRow();
    row.classList.add('clickable-row');
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Copy delay time for ${sub.name}, ${ms.toFixed(2)} milliseconds`);
    const cellSubdivision = row.insertCell();
    const cellMs = row.insertCell();
    cellSubdivision.textContent = sub.name;
    cellMs.textContent = ms.toFixed(2) + ' ms';
  });

  // Add event listeners to the new rows
  addDelayRowEventListeners();
}

// Copy to Clipboard and Popup
function handleRowClick(row) {
  const subdivision = row.cells[0].textContent;
  const delayMsText = row.cells[1].textContent;
  const delayMs = delayMsText.replace(' ms', '');

  navigator.clipboard.writeText(delayMs)
    .then(() => {
      showNotification(`Copied ${delayMs} ms to clipboard!`);
      row.classList.add('copied');
      setTimeout(() => row.classList.remove('copied'), 1000);
    })
    .catch(() => showNotification('Failed to copy delay time.', 'error'));

  showDelayPopup(delayMs);
}

// Debounce Function for Row Click
const debouncedHandleRowClick = debounce(handleRowClick, 300);

// Add Event Listeners to Delay Suggestions Rows
function addDelayRowEventListeners() {
  const clickableRows = document.querySelectorAll('.delay-suggestions-card table tbody tr.clickable-row');
  clickableRows.forEach(row => {
    row.addEventListener('click', () => debouncedHandleRowClick(row));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        debouncedHandleRowClick(row);
      }
    });
  });
}

// Show Delay Popup
function showDelayPopup(delayMs) {
  popupContent.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="popup-icon" viewBox="0 0 24 24" width="48" height="48" fill="green">
      <path d="M20.285,6.708l-11.49,11.49l-5.659-5.659L5.596,13.024L8.565,16L19.7,4.865l-1.414-1.414Z"/>
    </svg>
    <span>${delayMs} ms</span>
  `;
  delayPopup.classList.remove('hide');
  delayPopup.classList.add('show');
  delayPopup.setAttribute('aria-hidden', 'false');
  delayPopup.style.display = 'block';
}

// Hide Delay Popup
function hideDelayPopup() {
  delayPopup.classList.remove('show');
  delayPopup.classList.add('hide');
  delayPopup.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    delayPopup.style.display = 'none';
    delayPopup.classList.remove('hide');
  }, 300);
}

// Notification System
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

// Initialize Popup
function initializePopup() {
  delayPopup.addEventListener('click', hideDelayPopup);
}

// Initialize Audio Feedback
function initAudioFeedback() {
  const audioContext = getAudioContext();
  if (audioContext) {
    audioProgress.style.width = '100%';
    console.log('Audio Context is ready.');
  } else {
    audioProgress.style.width = '0%';
    console.error('Audio Context is not ready.');
  }
}

// Function to update MIDI connection progress
function updateMIDIProgress(isConnected) {
  midiProgress.style.width = isConnected ? '100%' : '0%';
}

// Function to update Sysex progress
function updateSysexProgress(progress) {
  sysexProgress.style.width = progress ? '100%' : '0%';
}

// Debounce Function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Handle Calculate Button Click
function handleCalculate() {
    const bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm <= 0) {
        showNotification('Please enter a valid BPM.', 'error');
        return;
    }
    const delayTimes = calculateDelayTimes(bpm);
    populateSuggestionsTable(delayTimes);
    showNotification('Delay times calculated successfully!');
}
  
  // Handle Copy Button Click
function handleCopy() {
    let textToCopy = 'Delay Time Suggestions:\n';
    const rows = suggestionsTable.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 2) {
        textToCopy += `${cells[0].textContent}: ${cells[1].textContent}\n`;
      }
    });
    navigator.clipboard.writeText(textToCopy)
      .then(() => showNotification('Delay times copied to clipboard!'))
      .catch(() => showNotification('Failed to copy delay times.', 'error'));
}

// Event Listeners for UI Elements
function setupUIEventHandlers() {
  calculateBtn.addEventListener('click', handleCalculate);
  copyBtn.addEventListener('click', handleCopy);
  tapBtn.addEventListener('click', handleTapTempo);
}

// Initialize UI
function init() {
  initializeTheme();
  initializePopup();
  initAudioFeedback();
  setupUIEventHandlers();
  // Initialize other UI components and event listeners as needed
}

export {
  init,
  showNotification,
  updateMIDIProgress,
  updateSysexProgress,
  populateSuggestionsTable
};