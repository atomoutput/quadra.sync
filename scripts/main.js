/* scripts/main.js */

import * as ui from './ui.js';
import * as calculations from './calculations.js';
import * as presets from './presets.js';
import * as midi from './midi.js';
import * as audio from './audio.js';
import * as sysex from './sysex.js';
import * as install from './install.js';
import * as help from './help.js';

// State management
const state = {
    bpm: 120,
    selectedMidiInput: null,
    selectedMidiOutput: null,
    customSubdivisions: [],
    eventListeners: new Map(),
};

// DOM Elements for Event Listeners
const elements = {
    calculateBtn: document.getElementById('calculate-btn'),
    bpmInput: document.getElementById('bpm-input'),
    midiInputSelect: document.getElementById('midi-input-select'),
    startMidiBtn: document.getElementById('start-midi-btn'),
    midiOutputSelect: document.getElementById('midi-output-select'),
    sendSysexBtn: document.getElementById('send-sysex-btn'),
    sysexParameterSelect: document.getElementById('sysex-parameter-select'),
    sysexParameterValue: document.getElementById('sysex-parameter-value'),
    sendSysexParameterBtn: document.getElementById('send-sysex-parameter-btn'),
    subdivisionNameInput: document.getElementById('subdivision-name'),
    subdivisionFactorInput: document.getElementById('subdivision-factor'),
    addSubdivisionBtn: document.getElementById('add-subdivision-btn'),
    presetNameInput: document.getElementById('preset-name'),
    savePresetBtn: document.getElementById('save-preset-btn'),
    kickSubdivisionSelect: document.getElementById('kick-subdivision-select'),
    presetsTable: document.getElementById('presets-table').querySelector('tbody'),
};

// Validate all required DOM elements
function validateElements() {
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            throw new Error(`Required DOM element not found: ${key}`);
        }
    }
}

// Add event listener with automatic cleanup registration
function addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    const listeners = state.eventListeners.get(element) || new Set();
    listeners.add({ event, handler });
    state.eventListeners.set(element, listeners);
}

// Clean up event listeners
function cleanupEventListeners() {
    for (const [element, listeners] of state.eventListeners) {
        listeners.forEach(({ event, handler }) => {
            element.removeEventListener(event, handler);
        });
    }
    state.eventListeners.clear();
}

// Event Handlers
const handleCalculate = () => {
    try {
        const bpm = parseInt(elements.bpmInput.value);
        if (isNaN(bpm) || bpm <= 0) {
            throw new Error('Please enter a valid BPM.');
        }
        state.bpm = bpm;
        const delayTimes = calculations.calculateDelayTimes(bpm);
        ui.populateSuggestionsTable(delayTimes);
        ui.showNotification('Delay times calculated successfully!');
    } catch (error) {
        ui.showNotification(error.message, 'error');
        console.error('Calculation error:', error);
    }
};

const handleSysex = async () => {
    try {
        const selectedMidiOutputId = elements.midiOutputSelect.value;
        if (!selectedMidiOutputId) {
            throw new Error('Please select MIDI output device!');
        }

        await sysex.connectToQuadraverb(selectedMidiOutputId);
        const subdivision = parseFloat(elements.kickSubdivisionSelect.value);
        const delayMs = (60000 / state.bpm) * subdivision;
        
        await sysex.sendSysexMessage('leftDelay', delayMs);
        ui.updateSysexProgress(true);
        ui.showNotification('Sysex message sent!');
        
        setTimeout(() => {
            ui.updateSysexProgress(false);
        }, 1000);
    } catch (error) {
        ui.showNotification(error.message, 'error');
        console.error('Sysex error:', error);
        ui.updateSysexProgress(false);
    }
};

const handleSysexParameter = async () => {
    try {
        const selectedMidiOutputId = elements.midiOutputSelect.value;
        if (!selectedMidiOutputId) {
            throw new Error('Please select MIDI output device!');
        }

        await sysex.connectToQuadraverb(selectedMidiOutputId);
        const parameter = elements.sysexParameterSelect.value;
        const value = parseInt(elements.sysexParameterValue.value);
        
        if (isNaN(value)) {
            throw new Error('Invalid parameter value');
        }

        await sysex.sendSysexMessage(parameter, value);
        ui.updateSysexProgress(true);
        ui.showNotification('Sysex parameter sent!');
        
        setTimeout(() => {
            ui.updateSysexProgress(false);
        }, 1000);
    } catch (error) {
        ui.showNotification(error.message, 'error');
        console.error('Sysex parameter error:', error);
        ui.updateSysexProgress(false);
    }
};

const handleAddSubdivision = () => {
    try {
        const name = elements.subdivisionNameInput.value.trim();
        const factor = parseFloat(elements.subdivisionFactorInput.value);
        
        if (!name || isNaN(factor)) {
            throw new Error('Invalid subdivision name or factor.');
        }

        calculations.addCustomSubdivision(name, factor);
        ui.populateSuggestionsTable(calculations.calculateDelayTimes(state.bpm));
        ui.showNotification('Subdivision added successfully!', 'success');
        
        elements.subdivisionNameInput.value = '';
        elements.subdivisionFactorInput.value = '';
    } catch (error) {
        ui.showNotification(error.message, 'error');
        console.error('Add subdivision error:', error);
    }
};

// Initialize the application
async function init() {
    try {
        validateElements();

        // Initialize all modules
        ui.init();
        calculations.init();
        presets.initializePresets();
        install.init();
        help.init();
        await audio.initializeAudio();

        // Set up event listeners
        addEventListenerWithCleanup(elements.calculateBtn, 'click', handleCalculate);
        addEventListenerWithCleanup(elements.sendSysexBtn, 'click', handleSysex);
        addEventListenerWithCleanup(elements.sendSysexParameterBtn, 'click', handleSysexParameter);
        addEventListenerWithCleanup(elements.addSubdivisionBtn, 'click', handleAddSubdivision);

        // Initialize MIDI devices
        const midiDevices = await midi.getMidiDevices();
        if (!midiDevices.error) {
            elements.midiInputSelect.innerHTML = '<option value="">No MIDI Input</option>';
            midiDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.name;
                elements.midiInputSelect.appendChild(option);
            });
        }

        const midiOutputs = await sysex.getMidiOutputs();
        if (!midiOutputs.error) {
            elements.midiOutputSelect.innerHTML = '<option value="">No MIDI Output</option>';
            midiOutputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.name;
                elements.midiOutputSelect.appendChild(option);
            });
        }

        updatePresetsTable();
        ui.showNotification('Application initialized successfully!', 'success');
    } catch (error) {
        ui.showNotification('Failed to initialize application: ' + error.message, 'error');
        console.error('Initialization error:', error);
    }
}

// Cleanup function
function cleanup() {
    cleanupEventListeners();
    audio.cleanup?.(); // Call cleanup if it exists
}

// Initialize on load and set up cleanup
window.addEventListener('load', init);
window.addEventListener('unload', cleanup);

// Export for testing
export { state, init, cleanup };