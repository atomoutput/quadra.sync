/* scripts/midi.js */

// Function to check if MIDI API is supported
function midiSupport() {
    return navigator.requestMIDIAccess ? true : false;
}

async function getMidiDevices() {
    if (!midiSupport()) return {error: "MIDI API not supported."};
    try {
        const midiAccess = await navigator.requestMIDIAccess();
        const inputs = midiAccess.inputs;
        const midiDevices = [];
        inputs.forEach(input => midiDevices.push({ id: input.id, name: input.name }));
        return midiDevices;
    } catch (error) {
        return {error: error};
    }
}

function startMidiInput(midiId, callback) {
  // Get MIDI Access and handle input events
  if (!midiSupport()) return console.error("MIDI API not supported.");
  navigator.requestMIDIAccess().then(midiAccess => {
    const input = midiAccess.inputs.get(midiId);
    if (!input) return console.error('Input device not found.');
    let timeIntervals = [];
    let lastTime = 0;
    let lastReportedBPM = 0;
    let pulseCount = 0;
    const bpmChangeThreshold = 1; // Configurable BPM change threshold
    const bufferSize = 5; // Size of interval buffer
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
            // Calculate Average
            let avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
            let currentBpm = 60000 / (avgInterval * 24); // 24 ticks per quarter note
            currentBpm = Math.round(currentBpm);
            // Apply Jitter smoothing, only report changes above the threshold
             if (Math.abs(currentBpm - lastReportedBPM) >= bpmChangeThreshold) {
              callback(currentBpm); // report the current BPM.
              console.log('difference: ', currentBpm - lastReportedBPM);
              lastReportedBPM = currentBpm;
            }
          }
          lastTime = now;
       }
     };
   }).catch(error => console.error('Error accessing MIDI devices', error));
 }


function stopMidiInput(){
  // Implement stopping the midi input
  navigator.requestMIDIAccess().then(midiAccess => {
       midiAccess.inputs.forEach(input => {
          input.onmidimessage = null;
       });
    });
  }

//Export midi functions
export {getMidiDevices, startMidiInput, stopMidiInput};