/* scripts/main.js (formerly app.js) */

import * as ui from './ui.js';
import * as calculations from './calculations.js';
import * as presets from './presets.js';
import * as midi from './midi.js';
import * as audio from './audio.js';
import * as sysex from './sysex.js';
import * as install from './install.js';
import * as help from './help.js';

// DOM Elements for Event Listeners
const calculateBtn = document.getElementById('calculate-btn');
const bpmInput = document.getElementById('bpm-input');
const midiInputSelect = document.getElementById('midi-input-select');
const startMidiBtn = document.getElementById('start-midi-btn');
const midiOutputSelect = document.getElementById('midi-output-select');
const sendSysexBtn = document.getElementById('send-sysex-btn');
const sysexParameterSelect = document.getElementById('sysex-parameter-select');
const sysexParameterValue = document.getElementById('sysex-parameter-value');
const sendSysexParameterBtn = document.getElementById('send-sysex-parameter-btn');
const subdivisionNameInput = document.getElementById('subdivision-name');
const subdivisionFactorInput = document.getElementById('subdivision-factor');
const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
const presetNameInput = document.getElementById('preset-name');
const savePresetBtn = document.getElementById('save-preset-btn');
const kickSubdivisionSelect = document.getElementById('kick-subdivision-select'); // Required for calculations
const presetsTable = document.getElementById('presets-table').querySelector('tbody');

// Event listener for the Calculate button
calculateBtn.addEventListener('click', () => {
    const bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm <= 0) {
        ui.showNotification('Please enter a valid BPM.', 'error');
        return;
    }
    const delayTimes = calculations.calculateDelayTimes(bpm);
    ui.populateSuggestionsTable(delayTimes);
    ui.showNotification('Delay times calculated successfully!');
});

// Handle Sysex Button Click Event
sendSysexBtn.addEventListener('click', () => {
    const selectedMidiOutputId = midiOutputSelect.value;
    if (selectedMidiOutputId === "") {
        ui.showNotification('Please select MIDI output device!', 'error');
        return;
    }
    sysex.connectToQuadraverb(selectedMidiOutputId);
    const subdivision = parseFloat(kickSubdivisionSelect.value);
    const delayMs = (60000 / bpmInput.value) * subdivision;
    sysex.sendSysexMessage('leftDelay', delayMs);
    ui.updateSysexProgress(true);
    ui.showNotification('Sysex message sent!');
    setTimeout(() => {
        ui.updateSysexProgress(false);
    }, 1000);
});

// Event Listener for Sysex Parameter Send Button
sendSysexParameterBtn.addEventListener('click', () => {
    const selectedMidiOutputId = midiOutputSelect.value;
    if (selectedMidiOutputId === "") {
        ui.showNotification('Please select MIDI output device!', 'error');
        return;
    }
    sysex.connectToQuadraverb(selectedMidiOutputId);
    const parameter = sysexParameterSelect.value;
    const value = parseInt(sysexParameterValue.value);
    sysex.sendSysexMessage(parameter, value);
    ui.updateSysexProgress(true);
    ui.showNotification('Sysex parameter sent!');
    setTimeout(() => {
        ui.updateSysexProgress(false);
    }, 1000);
});

// Event listener for the Add Subdivision button
addSubdivisionBtn.addEventListener('click', () => {
    const name = subdivisionNameInput.value.trim();
    const factor = parseFloat(subdivisionFactorInput.value);
    if (name && factor) {
        calculations.addCustomSubdivision(name, factor);
        ui.populateSuggestionsTable(calculations.calculateDelayTimes(parseInt(bpmInput.value)));
        ui.showNotification('Subdivision added successfully!', 'success');
        subdivisionNameInput.value = '';
        subdivisionFactorInput.value = '';
    } else {
        ui.showNotification('Invalid subdivision name or factor.', 'error');
    }
});

// Event listener for the Save Preset button
savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    const bpm = parseInt(bpmInput.value);
    if (name && bpm) {
        presets.savePreset(name, bpm, calculations.getCustomSubdivisions());
        ui.showNotification('Preset saved successfully!', 'success');
        presetNameInput.value = '';
        updatePresetsTable();
    } else {
        ui.showNotification('Invalid preset name or BPM.', 'error');
    }
});

// Function to update the presets table
function updatePresetsTable() {
    const currentPresets = presets.getPresets();
    presetsTable.innerHTML = '';
    currentPresets.forEach((preset, index) => {
        const row = presetsTable.insertRow();
        const cellName = row.insertCell();
        const cellBPM = row.insertCell();
        const cellAction = row.insertCell();

        cellName.textContent = preset.name;
        cellBPM.textContent = preset.bpm;

        // Load Button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.classList.add('action-button');
        loadBtn.setAttribute('aria-label', `Load preset ${preset.name}`);
        loadBtn.addEventListener('click', () => {
            const selectedPreset = presets.loadPreset(preset.name);
            bpmInput.value = selectedPreset.bpm;
            ui.populateSuggestionsTable(calculations.calculateDelayTimes(selectedPreset.bpm));
            if (selectedPreset.customSubdivisions) {
                selectedPreset.customSubdivisions.forEach(sub => {
                    calculations.addCustomSubdivision(sub.name, sub.factor);
                });
            }
        });

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('action-button');
        deleteBtn.setAttribute('aria-label', `Delete preset ${preset.name}`);
        deleteBtn.addEventListener('click', () => {
            presets.deletePreset(index);
            updatePresetsTable();
        });

        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.justifyContent = 'center';
        actionContainer.style.gap = '10px';
        actionContainer.appendChild(loadBtn);
        actionContainer.appendChild(deleteBtn);
        cellAction.appendChild(actionContainer);
    });
}

// Initialize the application
function init() {
    ui.init();
    midi.getMidiDevices().then(devices => {
        const midiInputSelect = document.getElementById('midi-input-select');
        midiInputSelect.innerHTML = '<option value="">No MIDI Input</option>';
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            midiInputSelect.appendChild(option);
        });
    });
    midi.getMidiOutputs().then(devices => {
        const midiOutputSelect = document.getElementById('midi-output-select');
        midiOutputSelect.innerHTML = '<option value="">No MIDI Output</option>';
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            midiOutputSelect.appendChild(option);
        });
    });
    audio.initializeAudio();
    calculations.init();
    presets.initializePresets();
    install.init();
    help.init();
    updatePresetsTable();
}

// Call init() on window load
window.addEventListener('load', init);