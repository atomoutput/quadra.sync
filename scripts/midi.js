/* scripts/midi.js */

import { showNotification } from './ui.js';
import { updateMIDIProgress } from './ui.js';

// Function to check if MIDI API is supported
function midiSupport() {
    return navigator.requestMIDIAccess ? true : false;
}

async function getMidiDevices() {
    if (!midiSupport()) {
        showNotification("MIDI API not supported.", "error");
        return { error: "MIDI API not supported." };
    }
    try {
        const midiAccess = await navigator.requestMIDIAccess();
        const inputs = midiAccess.inputs;
        const midiDevices = [];
        inputs.forEach(input => midiDevices.push({ id: input.id, name: input.name }));
        return midiDevices;
    } catch (error) {
        console.error('Error accessing MIDI devices', error);
        showNotification("Error accessing MIDI devices", "error");
        return { error: error };
    }
}

function startMidiInput(midiId, callback) {
    if (!midiSupport()) {
        showNotification("MIDI API not supported.", "error");
        return;
    }
    navigator.requestMIDIAccess().then(midiAccess => {
        const input = midiAccess.inputs.get(midiId);
        if (!input) {
            showNotification("Selected MIDI device not found.", "error");
            console.error('Input device not found.');
            return;
        }
        let timeIntervals = [];
        let lastTime = 0;
        let lastReportedBPM = 0;
        let pulseCount = 0;
        const bpmChangeThreshold = 1;
        const bufferSize = 5;
        input.onmidimessage = e => {
            if (e.data[0] === 0xF8) {
                pulseCount++;
                let now = performance.now();
                if (lastTime) {
                    const interval = now - lastTime;
                    timeIntervals.push(interval);
                    if (timeIntervals.length > bufferSize) {
                        timeIntervals.shift();
                    }
                    let avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
                    let currentBpm = 60000 / (avgInterval * 24);
                    currentBpm = Math.round(currentBpm);
                    if (Math.abs(currentBpm - lastReportedBPM) >= bpmChangeThreshold) {
                        callback(currentBpm);
                        lastReportedBPM = currentBpm;
                    }
                }
                lastTime = now;
            }
        };
        updateMIDIProgress(true);
    }).catch(error => {
        console.error('Error accessing MIDI devices', error);
        showNotification("Error accessing MIDI devices", "error");
    });
}

function stopMidiInput() {
    navigator.requestMIDIAccess().then(midiAccess => {
        midiAccess.inputs.forEach(input => {
            input.onmidimessage = null;
        });
        updateMIDIProgress(false);
    });
}

// Export midi functions
export { getMidiDevices, startMidiInput, stopMidiInput };