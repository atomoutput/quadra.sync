/* scripts/sysex.js */

import { showNotification } from './ui.js';

async function getMidiOutputs() {
  if (!navigator.requestMIDIAccess) {
    showNotification("MIDI API not supported.", "error");
    return { error: "MIDI API not supported." };
  }
  try {
    const midiAccess = await navigator.requestMIDIAccess();
    const outputs = midiAccess.outputs;
    const midiDevices = [];
    outputs.forEach(output => midiDevices.push({ id: output.id, name: output.name }));
    return midiDevices;
  } catch (error) {
    console.error('Error accessing MIDI devices', error);
    showNotification("Error accessing MIDI devices", "error");
    return { error: error };
  }
}

let outputDevice;

function connectToQuadraverb(midiOutputId) {
  navigator.requestMIDIAccess().then(midiAccess => {
    outputDevice = midiAccess.outputs.get(midiOutputId);
    if (!outputDevice) {
      console.error('Output device not found.');
      showNotification("MIDI output device not found.", "error");
      return;
    }
  });
}

function encode7bit(data) {
  const result = [];
  let buffer = 0;
  let bits = 0;

  for (const byte of data) {
    buffer |= (byte & 0x7F) << bits;
    bits += 7;

    while (bits >= 8) {
      result.push(buffer & 0x7F);
      buffer >>= 7;
      bits -= 7;
    }
  }

  if (bits > 0) {
    result.push(buffer & 0x7F);
  }
  return result;
}

// Define a mapping of parameters to their respective group and parameter numbers.
const sysexParameterMap = {
  leftDelay: { group: 0x02, msb: 0x2A, lsb: 0x2B }, // Delay time (MSB and LSB)
  reverbType: { group: 0x00, parameter: 0x50 },   // Reverb Type
  lowEQFrequency: { group: 0x04, msb: 0x00, lsb: 0x01 } // Low EQ Frequency (MSB and LSB)
};

function generateSysexMessage(parameter, value) {
  const parameterInfo = sysexParameterMap[parameter];
  if (!parameterInfo) {
    console.error("Invalid parameter:", parameter);
    showNotification("Invalid Sysex parameter.", "error");
    return;
  }
  let sysexMessage = [
    0xF0, // SysEx start
    0x00, 0x00, 0x0E, // Alesis manufacturer ID
    0x02, // Quadraverb device ID
    0x01, // Change Parameter command
    parameterInfo.group
  ];

  if (parameter === 'leftDelay' || parameter === 'lowEQFrequency') {
    const msb = (value >> 8) & 0xFF; // Most Significant Byte
    const lsb = value & 0xFF; // Least Significant Byte
    sysexMessage.push(parameterInfo.msb);
    sysexMessage.push(msb);
    sysexMessage.push(lsb);
    sysexMessage.push(0xF7);
    let sysexMessageLSB = [
      0xF0, // SysEx start
      0x00, 0x00, 0x0E, // Alesis manufacturer ID
      0x02, // Quadraverb device ID
      0x01, // Change Parameter command
      parameterInfo.group,
      parameterInfo.lsb,
      lsb,
      0xF7 // End Sysex
    ];
    return [encode7bit(sysexMessage), encode7bit(sysexMessageLSB)];
  } else {
    sysexMessage.push(parameterInfo.parameter);
    sysexMessage.push(value);
    sysexMessage.push(0xF7); // End Sysex
    return [encode7bit(sysexMessage)];
  }
}

function sendSysexMessage(parameter, value) {
    const sysexMessages = generateSysexMessage(parameter, value);
    if (!sysexMessages) return;
  
    if (outputDevice) {
      sysexMessages.forEach((sysexMessage) => {
        outputDevice.send(sysexMessage);
      });
    } else {
      console.error('No Output device is selected. Check connection.');
      showNotification("No MIDI output device selected.", "error");
    }
  }

export { getMidiOutputs, connectToQuadraverb, sendSysexMessage };