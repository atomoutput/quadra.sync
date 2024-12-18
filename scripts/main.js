/* scripts/main.js */

import { calculator } from './calculations.js';
import { initializeUI, UI } from './ui.js';
import { initializePresets, PresetManager } from './presets.js';
import { initializeMIDI, MIDIManager } from './midi.js';
import { initializeAudio, AudioManager } from './audio.js';
import { initializeSysex, SysexManager } from './sysex.js';
import { initializeInstall } from './install.js';
import { initializeHelp } from './help.js';
import { animations } from './animations.js';

// Application State
class AppState {
    constructor() {
        this.bpm = 120;
        this.midiInput = null;
        this.midiOutput = null;
        this.isConnected = false;
        this.isPlaying = false;
        this.selectedSubdivision = null;
        this.listeners = new Set();
        this.theme = 'light';
    }

    update(changes) {
        const oldState = { ...this };
        Object.assign(this, changes);
        this.notifyListeners(oldState);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners(oldState) {
        this.listeners.forEach(listener => listener(this, oldState));
    }
}

// Application Controller
class App {
    constructor() {
        this.state = new AppState();
        this.ui = null;
        this.midi = null;
        this.audio = null;
        this.sysex = null;
        this.presets = null;
        this.lastSentDelayTime = null;
        this.delayUpdateThreshold = 5; // ms threshold for delay time updates
    }

    async initialize() {
        try {
            // Initialize UI first
            this.ui = await initializeUI();
            animations.showNotification('Initializing application...');

            // Initialize core modules
            this.midi = await initializeMIDI();
            this.audio = await initializeAudio();
            this.sysex = await initializeSysex();
            this.presets = await initializePresets();

            // Initialize optional modules
            await initializeInstall();
            await initializeHelp();

            // Set up event handling
            this.setupEventHandling();

            // Initialize MIDI devices
            await this.initializeMIDIDevices();

            // Start BPM visualization
            animations.updateBPMVisualization(this.state.bpm);

            animations.showNotification('Application initialized successfully!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            animations.showNotification('Failed to initialize: ' + error.message, 'error');
        }
    }

    setupEventHandling() {
        // BPM and calculations
        this.ui.on('calculateBPM', this.handleCalculate.bind(this));
        this.ui.on('tapTempo', this.handleTapTempo.bind(this));
        
        // MIDI and Sysex
        this.ui.on('midiInputChange', this.handleMIDIInputChange.bind(this));
        this.ui.on('midiOutputChange', this.handleMIDIOutputChange.bind(this));
        this.midi.on('bpmChange', this.handleMIDIClockBPM.bind(this));
        
        // Presets and subdivisions
        this.ui.on('savePreset', this.handleSavePreset.bind(this));
        this.ui.on('loadPreset', this.handleLoadPreset.bind(this));
        this.ui.on('deletePreset', this.handleDeletePreset.bind(this));
        this.ui.on('addSubdivision', this.handleAddSubdivision.bind(this));
        this.ui.on('removeSubdivision', this.handleRemoveSubdivision.bind(this));
        this.ui.on('selectSubdivision', this.handleSubdivisionSelect.bind(this));

        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
                this.state.update({ theme: newTheme });
                document.body.dataset.theme = newTheme;
                animations.showNotification(`Switched to ${newTheme} theme`);
            });
        }

        // Subscribe to state changes
        this.state.subscribe((newState, oldState) => {
            // Update connection status indicator
            if (newState.isConnected !== oldState.isConnected) {
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.classList.toggle('connected', newState.isConnected);
                    if (newState.isConnected) {
                        animations.pulseStatusDot(statusDot);
                    }
                }
            }

            // Update BPM visualization
            if (newState.bpm !== oldState.bpm) {
                animations.updateBPMVisualization(newState.bpm);
            }
        });
    }

    async initializeMIDIDevices() {
        try {
            const { inputs, outputs } = await this.midi.getDevices();
            this.ui.updateMIDIDevices(inputs, outputs);
        } catch (error) {
            console.error('MIDI initialization error:', error);
            animations.showNotification('Failed to initialize MIDI devices', 'error');
        }
    }

    // Event Handlers
    async handleCalculate(bpm) {
        try {
            const bpmInput = document.getElementById('bpm-input');
            animations.showLoadingState(bpmInput, true);

            const delayTimes = calculator.calculateAllDelayTimes(bpm);
            this.state.update({ bpm });
            
            // Update UI with animation
            const delayGrid = document.getElementById('delay-grid');
            if (delayGrid) {
                delayGrid.innerHTML = ''; // Clear existing cards
                delayTimes.forEach(delay => {
                    const card = this.ui.createDelayTimeCard(delay);
                    delayGrid.appendChild(card);
                    animations.animateDelayTimeCard(card);
                });
            }

            animations.showLoadingState(bpmInput, false);
            animations.showNotification('Delay times calculated successfully!');
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async handleSysex(data) {
        try {
            const button = document.querySelector('.sysex-send-btn');
            animations.showLoadingState(button, true);
            
            await this.sysex.sendMessage(data);
            
            animations.showLoadingState(button, false);
            animations.showNotification('Sysex message sent successfully!');
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async handleMIDIInputChange(deviceId) {
        try {
            const select = document.getElementById('midi-input-select');
            animations.showLoadingState(select, true);
            
            await this.midi.setInput(deviceId);
            this.state.update({ 
                midiInput: deviceId,
                isConnected: !!deviceId
            });
            
            animations.showLoadingState(select, false);
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async handleMIDIOutputChange(deviceId) {
        try {
            const select = document.getElementById('midi-output-select');
            animations.showLoadingState(select, true);
            
            await this.midi.setOutput(deviceId);
            this.state.update({ 
                midiOutput: deviceId,
                isConnected: !!deviceId
            });
            
            animations.showLoadingState(select, false);
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    handleAddSubdivision(name, factor) {
        try {
            calculator.addCustomSubdivision(name, factor);
            const delayTimes = calculator.calculateAllDelayTimes(this.state.bpm);
            
            // Update UI with animation
            const delayGrid = document.getElementById('delay-grid');
            if (delayGrid) {
                const card = this.ui.createDelayTimeCard({ name, factor });
                delayGrid.appendChild(card);
                animations.animateDelayTimeCard(card);
            }
            
            animations.showNotification('Custom subdivision added successfully!');
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async handleMIDIClockBPM(bpm) {
        try {
            // Update state and UI with animation
            this.state.update({ bpm });
            const bpmInput = document.getElementById('bpm-input');
            if (bpmInput) {
                animations.showLoadingState(bpmInput, true);
                bpmInput.value = bpm;
                animations.showLoadingState(bpmInput, false);
            }

            // Calculate delay times if a subdivision is selected
            if (this.state.selectedSubdivision) {
                await this.updateDelayTime(bpm, this.state.selectedSubdivision);
            }
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async updateDelayTime(bpm, subdivision) {
        try {
            // Calculate new delay time
            const delayTime = calculator.calculateDelayTime(bpm, subdivision.factor);

            // Check if the change is significant enough to send
            if (!this.lastSentDelayTime || 
                Math.abs(delayTime - this.lastSentDelayTime) > this.delayUpdateThreshold) {
                
                const button = document.querySelector('.delay-update-btn');
                if (button) animations.showLoadingState(button, true);
                
                // Send to both left and right delay parameters
                await this.sysex.sendMessage('leftDelay', delayTime);
                await this.sysex.sendMessage('rightDelay', delayTime);
                
                if (button) animations.showLoadingState(button, false);
                
                this.lastSentDelayTime = delayTime;
                animations.showNotification(`Delay time updated: ${delayTime}ms`);
            }
        } catch (error) {
            animations.showNotification(error.message, 'error');
        }
    }

    async handleSubdivisionSelect(subdivision) {
        const cards = document.querySelectorAll('.delay-time-card');
        cards.forEach(card => {
            if (card.dataset.subdivision === subdivision.name) {
                card.classList.add('selected');
                animations.animateDelayTimeCard(card);
            } else {
                card.classList.remove('selected');
            }
        });

        this.state.update({ selectedSubdivision: subdivision });
        if (this.state.bpm) {
            await this.updateDelayTime(this.state.bpm, subdivision);
        }
    }

    cleanup() {
        this.audio?.cleanup();
        this.midi?.cleanup();
        this.sysex?.cleanup();
        this.ui?.cleanup();
    }
}

// Create and initialize application
const app = new App();

// Initialize on load and set up cleanup
window.addEventListener('load', () => app.initialize());
window.addEventListener('unload', () => app.cleanup());

// Export for development
export const DEBUG = { app, calculator };