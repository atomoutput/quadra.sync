/* scripts/midi.js */

import { EventEmitter } from './utils/eventEmitter.js';

// MIDI Constants
const MIDI_CONSTANTS = {
    MESSAGES: {
        TIMING_CLOCK: 0xF8,
        START: 0xFA,
        CONTINUE: 0xFB,
        STOP: 0xFC
    },
    BPM: {
        MIN: 20,
        MAX: 300,
        CHANGE_THRESHOLD: 1
    },
    BUFFER: {
        SIZE: 5,
        PULSES_PER_QUARTER_NOTE: 24
    }
};

// MIDI Manager Class
export class MIDIManager extends EventEmitter {
    constructor() {
        super();
        this.state = {
            isSupported: this.checkMIDISupport(),
            midiAccess: null,
            selectedInput: null,
            selectedOutput: null,
            isListening: false,
            timeIntervals: [],
            lastTime: 0,
            lastReportedBPM: 0,
            pulseCount: 0
        };

        // Bind methods
        this.handleMIDIMessage = this.handleMIDIMessage.bind(this);
        this.handleMIDIStateChange = this.handleMIDIStateChange.bind(this);
    }

    // Initialization
    async initialize() {
        if (!this.state.isSupported) {
            throw new Error('MIDI API not supported in this browser');
        }

        try {
            this.state.midiAccess = await navigator.requestMIDIAccess();
            this.state.midiAccess.onstatechange = this.handleMIDIStateChange;
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize MIDI:', error);
            this.emit('error', error);
            throw error;
        }
    }

    checkMIDISupport() {
        return 'requestMIDIAccess' in navigator;
    }

    // Device Management
    async getDevices() {
        if (!this.state.midiAccess) {
            await this.initialize();
        }

        const devices = {
            inputs: [],
            outputs: []
        };

        // Get inputs
        for (const input of this.state.midiAccess.inputs.values()) {
            devices.inputs.push({
                id: input.id,
                name: input.name,
                manufacturer: input.manufacturer,
                state: input.state,
                connection: input.connection
            });
        }

        // Get outputs
        for (const output of this.state.midiAccess.outputs.values()) {
            devices.outputs.push({
                id: output.id,
                name: output.name,
                manufacturer: output.manufacturer,
                state: output.state,
                connection: output.connection
            });
        }

        return devices;
    }

    async setInput(deviceId) {
        if (this.state.selectedInput) {
            this.state.selectedInput.onmidimessage = null;
        }

        if (!deviceId) {
            this.state.selectedInput = null;
            this.emit('inputChanged', null);
            return;
        }

        const input = this.state.midiAccess.inputs.get(deviceId);
        if (!input) {
            throw new Error('Selected MIDI input device not found');
        }

        this.state.selectedInput = input;
        if (this.state.isListening) {
            input.onmidimessage = this.handleMIDIMessage;
        }
        this.emit('inputChanged', input);
    }

    async setOutput(deviceId) {
        if (!deviceId) {
            this.state.selectedOutput = null;
            this.emit('outputChanged', null);
            return;
        }

        const output = this.state.midiAccess.outputs.get(deviceId);
        if (!output) {
            throw new Error('Selected MIDI output device not found');
        }

        this.state.selectedOutput = output;
        this.emit('outputChanged', output);
    }

    // MIDI Message Handling
    handleMIDIMessage(event) {
        switch (event.data[0]) {
            case MIDI_CONSTANTS.MESSAGES.TIMING_CLOCK:
                this.handleTimingClock(event);
                break;
            case MIDI_CONSTANTS.MESSAGES.START:
                this.handleStart(event);
                break;
            case MIDI_CONSTANTS.MESSAGES.CONTINUE:
                this.handleContinue(event);
                break;
            case MIDI_CONSTANTS.MESSAGES.STOP:
                this.handleStop(event);
                break;
            default:
                this.emit('message', event);
        }
    }

    handleTimingClock(event) {
        this.state.pulseCount++;
        const now = performance.now();

        if (this.state.lastTime) {
            const interval = now - this.state.lastTime;
            this.state.timeIntervals.push(interval);

            if (this.state.timeIntervals.length > MIDI_CONSTANTS.BUFFER.SIZE) {
                this.state.timeIntervals.shift();
            }

            const avgInterval = this.state.timeIntervals.reduce((a, b) => a + b, 0) / 
                              this.state.timeIntervals.length;
            const currentBPM = Math.round(60000 / (avgInterval * MIDI_CONSTANTS.BUFFER.PULSES_PER_QUARTER_NOTE));

            if (Math.abs(currentBPM - this.state.lastReportedBPM) >= MIDI_CONSTANTS.BPM.CHANGE_THRESHOLD) {
                if (currentBPM >= MIDI_CONSTANTS.BPM.MIN && currentBPM <= MIDI_CONSTANTS.BPM.MAX) {
                    this.state.lastReportedBPM = currentBPM;
                    this.emit('bpmChange', currentBPM);
                }
            }
        }

        this.state.lastTime = now;
    }

    handleStart(event) {
        this.resetTimingState();
        this.emit('start', event);
    }

    handleContinue(event) {
        this.emit('continue', event);
    }

    handleStop(event) {
        this.resetTimingState();
        this.emit('stop', event);
    }

    resetTimingState() {
        this.state.timeIntervals = [];
        this.state.lastTime = 0;
        this.state.lastReportedBPM = 0;
        this.state.pulseCount = 0;
    }

    // MIDI State Change Handling
    handleMIDIStateChange(event) {
        this.emit('stateChange', {
            port: event.port,
            state: event.port.state,
            connection: event.port.connection
        });
    }

    // Start/Stop MIDI Input
    startListening() {
        if (!this.state.selectedInput) {
            throw new Error('No MIDI input device selected');
        }

        this.state.selectedInput.onmidimessage = this.handleMIDIMessage;
        this.state.isListening = true;
        this.resetTimingState();
        this.emit('listening', true);
    }

    stopListening() {
        if (this.state.selectedInput) {
            this.state.selectedInput.onmidimessage = null;
        }
        this.state.isListening = false;
        this.resetTimingState();
        this.emit('listening', false);
    }

    // Send MIDI Messages
    async sendMessage(message) {
        if (!this.state.selectedOutput) {
            throw new Error('No MIDI output device selected');
        }

        try {
            await this.state.selectedOutput.send(message);
            this.emit('messageSent', message);
        } catch (error) {
            console.error('Failed to send MIDI message:', error);
            this.emit('error', error);
            throw error;
        }
    }

    // Cleanup
    cleanup() {
        this.stopListening();
        this.state.selectedInput = null;
        this.state.selectedOutput = null;
        this.removeAllListeners();
    }
}

// Create and export MIDI instance
export const midi = new MIDIManager();

// Initialize MIDI
export async function initializeMIDI() {
    await midi.initialize();
    return midi;
}