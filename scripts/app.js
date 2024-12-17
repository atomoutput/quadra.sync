/* scripts/app.js */

/* =========================
   DOM Elements
========================= */
import { getMidiDevices, startMidiInput, stopMidiInput } from './midi.js';
import { initializeAudio, setKickPulse, stopKickPulse, getAudioContext, setDelay, setKickGain, setDelayGain, setFeedback } from './audio.js';
import { getMidiOutputs, connectToQuadraverb, sendSysexMessage } from './sysex.js';

const calculateBtn = document.getElementById('calculate-btn');
const bpmInput = document.getElementById('bpm-input');
const suggestionsTable = document.getElementById('suggestions-table').querySelector('tbody');
const copyBtn = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tapBtn = document.getElementById('tap-btn');
const tapFeedback = document.getElementById('tap-feedback');
const tapProgress = document.getElementById('tap-progress');
const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
const subdivisionNameInput = document.getElementById('subdivision-name');
const subdivisionFactorInput = document.getElementById('subdivision-factor');
const customSubdivisionsTable = document.getElementById('custom-subdivisions-table').querySelector('tbody');
const savePresetBtn = document.getElementById('save-preset-btn');
const presetNameInput = document.getElementById('preset-name');
const presetsTable = document.getElementById('presets-table').querySelector('tbody');
const notification = document.getElementById('notification');
const installBtn = document.getElementById('install-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpModal = document.getElementById('close-help-modal');
const delayPopup = document.getElementById('delay-popup');
const popupContent = document.getElementById('popup-content');

// MIDI Elements
const midiInputSelect = document.getElementById('midi-input-select');
const startMidiBtn = document.getElementById('start-midi-btn');
const midiProgress = document.getElementById('midi-progress');

// Audio Elements
const audioProgress = document.getElementById('audio-progress');
const kickPulseToggle = document.getElementById('kick-pulse-toggle');
const kickSubdivisionSelect = document.getElementById('kick-subdivision-select');
const kickDelayToggle = document.getElementById('kick-delay-toggle');
const kickGainSlider = document.getElementById('kick-gain-slider');
const delayGainSlider = document.getElementById('delay-gain-slider');
const delayFeedbackSlider = document.getElementById('delay-feedback-slider');

// Sysex Elements
const midiOutputSelect = document.getElementById('midi-output-select');
const sendSysexBtn = document.getElementById('send-sysex-btn');
const sysexProgress = document.getElementById('sysex-progress');
const sysexParameterSelect = document.getElementById('sysex-parameter-select');
const sysexParameterValue = document.getElementById('sysex-parameter-value');
const sendSysexParameterBtn = document.getElementById('send-sysex-parameter-btn');


/* =========================
   State Variables
========================= */
let customSubdivisions = [];
let presets = JSON.parse(localStorage.getItem('delay_presets')) || [];
let tapTimes = [];
let tapTimeout;
const maxTaps = 8;
let deferredPrompt;

// MIDI State Variables
let selectedMidiId = '';
let midiActive = false;

// Audio State Variables
let kickActive = false;
let currentSubdivision = 1;
let delayActive = false;

// Sysex State variables
let selectedMidiOutputId = '';


/* =========================
   Initialization
========================= */
initializeTheme();
initializePresets();
initializePopup();
initAudioFeedback();

/* =========================
   Theme Management
========================= */
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
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = `
            <!-- Moon Icon Visible -->
            <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor"/>
            <!-- Sun Icon Hidden -->
            <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor" style="display: none;"/>
        `;
    } else {
        themeIcon.innerHTML = `
            <!-- Moon Icon Hidden -->
            <path id="moon-icon" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="currentColor" style="display: none;"/>
            <!-- Sun Icon Visible -->
            <path id="sun-icon" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.8 1.8 1.41-1.42zM10.27 2.05l-1.8 1.8 1.41 1.41 1.8-1.8-1.41-1.41zM12 5a7 7 0 000 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm6.24 1.16l1.79 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM17.16 19.16l1.8 1.8 1.41-1.41-1.8-1.8-1.41 1.41zM12 19a7 7 0 007-7h-2a5 5 0 01-5 5v2z" fill="currentColor"/>
        `;
    }
}

/* =========================
   Delay Time Calculations
========================= */
calculateBtn.addEventListener('click', handleCalculate);

function handleCalculate() {
    const bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm <= 0) {
        showNotification('Please enter a valid BPM.', 'error');
        return;
    }
    const delayTimes = calculateDelayTimes(bpm);
    populateSuggestions(delayTimes);
    showNotification('Delay times calculated successfully!');
}

function calculateDelayTimes(bpm) {
    const beatDuration = 60000 / bpm; // Quarter note duration in ms
    const standardSubdivisions = {
        // Simple Subdivisions
        'Whole Note (1/1)': 4,
        'Half Note (1/2)': 2,
        'Quarter Note (1/4)': 1,
        'Eighth Note (1/8)': 0.5,
        'Sixteenth Note (1/16)': 0.25,
        'Thirty-Second Note (1/32)': 0.125,

        // Compound Subdivisions
        'Dotted Half Note (3/4)': 3,
        'Dotted Quarter Note (3/8)': 1.5,
        'Dotted Eighth Note (3/16)': 0.75,
        'Triplet Whole Note (2/3)': 2.6667,
        'Triplet Half Note (2/3)': 1.3333,
        'Triplet Quarter Note (2/3)': 0.6667,
        'Triplet Eighth Note (2/3)': 0.3333,
        'Triplet Sixteenth Note (2/3)': 0.1667
    };
    let allSubdivisions = { ...standardSubdivisions };
    customSubdivisions.forEach(sub => {
        allSubdivisions[sub.name] = sub.factor;
    });
    const delayTimes = {};
    for (const [subdivision, factor] of Object.entries(allSubdivisions)) {
        delayTimes[subdivision] = beatDuration * factor;
    }
    return delayTimes;
}

function populateSuggestions(delayTimes) {
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

    // Function to Add Rows
    function addRows(subdivisions, category) {
        if (category) {
            const categoryRow = suggestionsTable.insertRow();
            const categoryCell = categoryRow.insertCell(0);
            categoryCell.colSpan = 2;
            categoryCell.textContent = category;
            categoryCell.style.fontWeight = 'bold';
            categoryCell.style.backgroundColor = 'rgba(30, 144, 255, 0.1)'; /* Light Dodger Blue */
            categoryCell.style.textAlign = 'center';
        }
        for (const [subdivision, factor] of Object.entries(subdivisions)) {
            const ms = (60000 / bpmInput.value) * factor;
            const row = suggestionsTable.insertRow();
            row.classList.add('clickable-row'); // Add class for JavaScript
            row.setAttribute('tabindex', '0'); // Make focusable
            row.setAttribute('role', 'button'); // Role as button
            row.setAttribute('aria-label', `Copy delay time for ${subdivision}, ${ms.toFixed(2)} milliseconds`);
            const cellSubdivision = row.insertCell(0);
            const cellMs = row.insertCell(1);
            cellSubdivision.textContent = subdivision;
            cellMs.textContent = ms.toFixed(2) + ' ms';
        }
    }

    // Add Simple Subdivisions
    addRows(simpleSubdivisions, 'Simple Subdivisions');

    // Add Compound Subdivisions
    addRows(compoundSubdivisions, 'Compound Subdivisions');

    // Add Custom Subdivisions
    customSubdivisions.forEach(sub => {
        const ms = (60000 / bpmInput.value) * sub.factor;
        const row = suggestionsTable.insertRow();
        row.classList.add('clickable-row'); // Add class for JavaScript
        row.setAttribute('tabindex', '0'); // Make focusable
        row.setAttribute('role', 'button'); // Role as button
        row.setAttribute('aria-label', `Copy delay time for ${sub.name}, ${ms.toFixed(2)} milliseconds`);
        const cellSubdivision = row.insertCell(0);
        const cellMs = row.insertCell(1);
        cellSubdivision.textContent = sub.name;
        cellMs.textContent = ms.toFixed(2) + ' ms';
    });

    /* After populating the table, add event listeners to the new rows */
    addDelayRowEventListeners();
}

/* =========================
   Copy to Clipboard Functionality
========================= */
copyBtn.addEventListener('click', () => {
    let textToCopy = 'Delay Time Suggestions:\n';
    const rows = suggestionsTable.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
            textToCopy += `${cells[0].textContent}: ${cells[1].textContent}\n`;
        }
    });
    navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('Delay times copied to clipboard!');
    }).catch(() => {
        showNotification('Failed to copy delay times.', 'error');
    });
});

/* =========================
   Tap Tempo Functionality
========================= */
tapBtn.addEventListener('click', () => {
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
    }, 1500); // Reset taps if no tap within 1.5 seconds

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
        populateSuggestions(delayTimes);
        showNotification('BPM set via Tap Tempo!');
        // Visual Indicator
        const progress = Math.min((avgInterval / 2000) * 100, 100); // Max interval 2s
        tapProgress.style.width = progress + '%';
    } else {
        tapFeedback.textContent = 'Keep tapping...';
        tapProgress.style.width = '20%';
    }
});

/* =========================
   Custom Subdivisions Management
========================= */
addSubdivisionBtn.addEventListener('click', () => {
    const name = subdivisionNameInput.value.trim();
    const factor = parseFloat(subdivisionFactorInput.value);
    if (name === '' || isNaN(factor) || factor <= 0) {
        showNotification('Please enter a valid subdivision name and factor.', 'error');
        return;
    }
    // Check for duplicate names
    if (customSubdivisions.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Subdivision name already exists.', 'error');
        return;
    }
    customSubdivisions.push({ name, factor });
    subdivisionNameInput.value = '';
    subdivisionFactorInput.value = '';
    updateCustomSubdivisionsTable();
    if (bpmInput.value) {
        const bpm = parseInt(bpmInput.value);
        if (!isNaN(bpm) && bpm > 0) {
            const delayTimes = calculateDelayTimes(bpm);
            populateSuggestions(delayTimes);
        }
    }
    showNotification('Custom subdivision added!');
});

function updateCustomSubdivisionsTable() {
    customSubdivisionsTable.innerHTML = '';
    customSubdivisions.forEach((sub, index) => {
        const row = customSubdivisionsTable.insertRow();
        const cellName = row.insertCell(0);
        const cellFactor = row.insertCell(1);
        const cellAction = row.insertCell(2);

        cellName.textContent = sub.name;
        cellFactor.textContent = sub.factor;

        // Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('action-button');
        removeBtn.setAttribute('aria-label', `Remove ${sub.name}`);
        removeBtn.addEventListener('click', () => {
            customSubdivisions.splice(index, 1);
            updateCustomSubdivisionsTable();
            const bpm = parseInt(bpmInput.value);
            if (!isNaN(bpm) && bpm > 0) {
                const delayTimes = calculateDelayTimes(bpm);
                populateSuggestions(delayTimes);
            }
            showNotification('Custom subdivision removed!');
        });

        cellAction.appendChild(removeBtn);
    });
}

/* =========================
   Presets Management
========================= */
savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    const bpm = parseInt(bpmInput.value);
    if (name === '' || isNaN(bpm) || bpm <= 0) {
        showNotification('Please enter a valid preset name and BPM.', 'error');
        return;
    }
    // Check for duplicate preset names
    if (presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Preset name already exists.', 'error');
        return;
    }
    const preset = { name, bpm, customSubdivisions: [...customSubdivisions] };
    presets.push(preset);
    localStorage.setItem('delay_presets', JSON.stringify(presets));
    presetNameInput.value = '';
    updatePresetsTable();
    showNotification('Preset saved successfully!');
});

function updatePresetsTable() {
    presetsTable.innerHTML = '';
    presets.forEach((preset, index) => {
        const row = presetsTable.insertRow();
        const cellName = row.insertCell(0);
        const cellBPM = row.insertCell(1);
        const cellAction = row.insertCell(2);

        cellName.textContent = preset.name;
        cellBPM.textContent = preset.bpm;

        // Load Button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.classList.add('action-button');
        loadBtn.setAttribute('aria-label', `Load preset ${preset.name}`);
        loadBtn.addEventListener('click', () => {
            bpmInput.value = preset.bpm;
            customSubdivisions = JSON.parse(JSON.stringify(preset.customSubdivisions));
            updateCustomSubdivisionsTable();
            const delayTimes = calculateDelayTimes(preset.bpm);
            populateSuggestions(delayTimes);
            showNotification(`Preset "${preset.name}" loaded!`);
        });

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('action-button');
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete preset "${preset.name}"?`)) {
                presets.splice(index, 1);
                localStorage.setItem('delay_presets', JSON.stringify(presets));
                updatePresetsTable();
                showNotification('Preset deleted.');
            }
        });

        // Action Buttons Container
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.justifyContent = 'center';
        actionContainer.style.gap = '10px';
        actionContainer.appendChild(loadBtn);
        actionContainer.appendChild(deleteBtn);
        cellAction.appendChild(actionContainer);
    });
}

function initializePresets() {
    updatePresetsTable();
}

/* =========================
   Pop-up Card for Copied Delay Value
========================= */
/* Initialize Pop-up Event Listener */
function initializePopup() {
    // Add a single event listener to hide the pop-up when clicked
    delayPopup.addEventListener('click', hideDelayPopup);
}

/* Function to Show Delay Pop-up with Animation and Icon */
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

    // Ensure the pop-up is visible
    delayPopup.style.display = 'block';
}

/* Function to Hide Delay Pop-up with Animation */
function hideDelayPopup() {
    delayPopup.classList.remove('show');
    delayPopup.classList.add('hide');
    delayPopup.setAttribute('aria-hidden', 'true');

    // Hide the pop-up after animation
    setTimeout(() => {
        delayPopup.style.display = 'none';
        delayPopup.classList.remove('hide');
    }, 300); // Match with CSS animation duration
}

/* =========================
   Notification System
========================= */
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--error-color)';
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/* =========================
   Clipboard and Pop-up Interaction
========================= */
/* Generic Debounce Function */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/* Function to Handle Row Clicks and Keyboard Activation */
function handleRowClick(row) {
    const subdivision = row.cells[0].textContent;
    const delayMsText = row.cells[1].textContent;
    const delayMs = delayMsText.replace(' ms', '');

    // Copy to Clipboard
    navigator.clipboard.writeText(delayMs)
        .then(() => {
            showNotification(`Copied ${delayMs} ms to clipboard!`);
            // Add temporary class for visual confirmation
            row.classList.add('copied');
            setTimeout(() => {
                row.classList.remove('copied');
            }, 1000); // Remove after 1 second
        })
        .catch(() => {
            showNotification('Failed to copy delay time.', 'error');
        });

    // Show Pop-up Card
    showDelayPopup(delayMs);
}

/* Debounced Handle Row Click */
const debouncedHandleRowClick = debounce(handleRowClick, 300);

/* Function to Add Event Listeners to Delay Suggestions Rows */
function addDelayRowEventListeners() {
    const clickableRows = document.querySelectorAll('.delay-suggestions-card table tbody tr.clickable-row');
    clickableRows.forEach(row => {
        // Mouse Click
        row.addEventListener('click', () => {
            debouncedHandleRowClick(row);
        });

        // Keyboard Interaction
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent scrolling on Space
                debouncedHandleRowClick(row);
            }
        });
    });
}

/* =========================
   Install Button Functionality
========================= */
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex'; // Show the install button
    showNotification('You can install quadra.calc as an app!', 'success');
});

/* Handle Install Button Click */
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showNotification('App installed successfully!', 'success');
        } else {
            showNotification('App installation canceled.', 'error');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
});

/* =========================
   Help Modal Functionality
========================= */
/* Open Help Modal */
helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'block';
    helpModal.setAttribute('aria-hidden', 'false');
});

/* Close Help Modal */
closeHelpModal.addEventListener('click', () => {
    helpModal.style.display = 'none';
    helpModal.setAttribute('aria-hidden', 'true');
});

/* Close Modal when clicking outside of the modal content */
window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
        helpModal.style.display = 'none';
        helpModal.setAttribute('aria-hidden', 'true');
    }
});


/* =========================
   MIDI Device Handling
========================= */
async function populateMidiInputs() {
    const midiDevices = await getMidiDevices();
    if (midiDevices.error) {
        console.error("Error accessing MIDI devices:", midiDevices.error);
         showNotification(`Error accessing MIDI devices: ${midiDevices.error}`, 'error');
        return;
    }
    midiInputSelect.innerHTML = '<option value="">No MIDI Input</option>'; // Reset the options
    midiDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.name;
        midiInputSelect.appendChild(option);
    });
}

// Function for starting MIDI clock
function startMidi() {
  if (midiActive) {
    stopMidiInput();
    midiProgress.style.width = '0%';
    startMidiBtn.textContent = 'Start';
    midiActive = false;
      showNotification('MIDI Clock input stopped.');
  } else {
    selectedMidiId = midiInputSelect.value;
     if(selectedMidiId === ""){
         showNotification('Please select MIDI input device!', 'error');
         return;
     }
    startMidiInput(selectedMidiId, handleMidiBPM);
    midiProgress.style.width = '30%';
    startMidiBtn.textContent = 'Stop';
    midiActive = true;
    showNotification('MIDI Clock input started.');
   }
}

// Event Listener for MIDI Start Button
startMidiBtn.addEventListener('click', startMidi);

// Handle Incoming BPM from MIDI
function handleMidiBPM(bpm) {
  bpmInput.value = bpm;
  const delayTimes = calculateDelayTimes(bpm);
  populateSuggestions(delayTimes);
}

// Initialize MIDI Devices
populateMidiInputs();

/* =========================
   Kick Pulse Handling
========================= */

// Initialize audio
initializeAudio();

// Kick toggle event listener
kickPulseToggle.addEventListener('change', handleKickToggle);

// Delay toggle event listener
kickDelayToggle.addEventListener('change', handleDelayToggle);

// Subdivision change listener
kickSubdivisionSelect.addEventListener('change', handleSubdivisionChange);

// Gain slider event listener
kickGainSlider.addEventListener('input', handleKickGainChange);

// Gain slider event listener
delayGainSlider.addEventListener('input', handleDelayGainChange);

// Feedback slider event listener
delayFeedbackSlider.addEventListener('input', handleDelayFeedbackChange);


// Function to handle kick toggle
function handleKickToggle() {
    kickActive = !kickActive;
    if (kickActive) {
        if (bpmInput.value) {
           const bpm = parseInt(bpmInput.value);
            setKickPulse(bpm, currentSubdivision, delayActive);
           showNotification('Kick pulse started!');
         } else {
            showNotification('Please input BPM or use MIDI clock!', 'error');
            kickPulseToggle.checked = false;
            kickActive = false;
        }
    } else {
       stopKickPulse();
       showNotification('Kick pulse stopped.');
    }
}

// Function to handle delay toggle
function handleDelayToggle() {
     delayActive = !delayActive;
    if (kickActive) {
        if (bpmInput.value) {
           const bpm = parseInt(bpmInput.value);
           stopKickPulse();
           setKickPulse(bpm, currentSubdivision, delayActive);
            showNotification('Audio delay ' + (delayActive ? 'enabled' : 'disabled') + '!');
        }
    }
}

// Function to handle subdivision change
function handleSubdivisionChange() {
    currentSubdivision = parseFloat(kickSubdivisionSelect.value);
    if (kickActive) {
        if (bpmInput.value) {
            const bpm = parseInt(bpmInput.value);
            stopKickPulse();
           setKickPulse(bpm, currentSubdivision, delayActive);
        }
    }
}


// Function to handle kick gain slider
function handleKickGainChange() {
   const gainValue = parseFloat(kickGainSlider.value);
   setKickGain(gainValue);
}

// Function to handle delay gain slider
function handleDelayGainChange() {
   const gainValue = parseFloat(delayGainSlider.value);
   setDelayGain(gainValue);
}

// Function to handle delay feedback slider
function handleDelayFeedbackChange() {
  const feedbackValue = parseFloat(delayFeedbackSlider.value);
   setFeedback(feedbackValue);
}

/* =========================
   Sysex Output Handling
========================= */

// Function to populate MIDI output devices
async function populateMidiOutputs() {
    const midiDevices = await getMidiOutputs();
       if (midiDevices.error) {
          console.error("Error accessing MIDI devices:", midiDevices.error);
          showNotification(`Error accessing MIDI devices: ${midiDevices.error}`, 'error');
          return;
       }
    midiOutputSelect.innerHTML = '<option value="">No MIDI Output</option>'; // Reset the options
    midiDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.name;
        midiOutputSelect.appendChild(option);
    });
}

// Event Listener for Sysex Send Button
sendSysexBtn.addEventListener('click', handleSendSysex);

// Handle Sysex Button Click Event
function handleSendSysex(){
      selectedMidiOutputId = midiOutputSelect.value;
    if (selectedMidiOutputId === "") {
        showNotification('Please select MIDI output device!', 'error');
        return;
    }
     connectToQuadraverb(selectedMidiOutputId);
       const subdivision = parseFloat(kickSubdivisionSelect.value);
       const delayMs = (60000 / bpmInput.value) * subdivision;
        sendSysexMessage('leftDelay', delayMs);
         sysexProgress.style.width = '100%';
         showNotification('Sysex message sent!');
        setTimeout(() => {
          sysexProgress.style.width = '0%';
         }, 1000);
}

// Event Listener for Sysex Parameter Send Button
sendSysexParameterBtn.addEventListener('click', handleSendSysexParameter);

function handleSendSysexParameter() {
     selectedMidiOutputId = midiOutputSelect.value;
    if (selectedMidiOutputId === "") {
        showNotification('Please select MIDI output device!', 'error');
        return;
    }
    connectToQuadraverb(selectedMidiOutputId);
    const parameter = sysexParameterSelect.value;
    const value = parseInt(sysexParameterValue.value);
    sendSysexMessage(parameter, value);
     sysexProgress.style.width = '100%';
    showNotification('Sysex parameter sent!');
    setTimeout(() => {
     sysexProgress.style.width = '0%';
    }, 1000);
}


// Initialize MIDI Outputs
populateMidiOutputs();

/* =========================
   UI Feedback Updates
========================= */

// Initialize Audio feedback
function initAudioFeedback() {
    if (getAudioContext()) {
        audioProgress.style.width = '100%';
        console.log('Audio Context is ready.');
     } else {
         audioProgress.style.width = '0%';
         console.error('Audio Context is not ready.');
    }
  }