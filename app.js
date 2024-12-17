let midiAccess, clockTicks = [];
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let kickInterval, delayNode;

// BPM Delay Calculation
document.getElementById('calculate-btn').addEventListener('click', () => {
    const bpm = parseInt(document.getElementById('bpm-input').value);
    if (!bpm) return alert("Enter a valid BPM");

    const delays = {
        '1/4 Note': 60000 / bpm,
        '1/8 Note': 60000 / bpm / 2,
        'Dotted 1/8': (60000 / bpm) * 1.5
    };

    const tbody = document.querySelector('#delay-table tbody');
    tbody.innerHTML = '';
    Object.entries(delays).forEach(([subdivision, delay]) => {
        const row = `<tr><td>${subdivision}</td><td>${delay.toFixed(2)} ms</td></tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
});

// MIDI Clock Listener
document.getElementById('enable-midi-btn').addEventListener('click', () => {
    navigator.requestMIDIAccess().then((midi) => {
        midiAccess = midi;
        midi.inputs.forEach(input => input.onmidimessage = handleMIDIMessage);
        document.getElementById('midi-feedback').textContent = "MIDI Sync Enabled";
    });
});

function handleMIDIMessage(event) {
    if (event.data[0] === 248) {
        const now = performance.now();
        clockTicks.push(now);
        if (clockTicks.length > 10) clockTicks.shift();

        const bpm = Math.round(60000 / ((now - clockTicks[0]) / clockTicks.length));
        document.getElementById('bpm-input').value = bpm;
    }
}

// Kick Pulse Generator
document.getElementById('start-kick-btn').addEventListener('click', () => {
    const bpm = parseInt(document.getElementById('bpm-input').value);
    const interval = 60000 / bpm;

    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = interval / 2000;

    kickInterval = setInterval(() => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.frequency.value = 60;

        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.connect(gainNode).connect(delayNode).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }, interval);
});

document.getElementById('stop-kick-btn').addEventListener('click', () => {
    clearInterval(kickInterval);
});

// SysEx Sender
document.getElementById('send-sysex-btn').addEventListener('click', () => {
    const bpm = parseInt(document.getElementById('bpm-input').value);
    const subdivision = parseFloat(document.getElementById('sysex-select').value);
    const delayMs = Math.round((60000 / bpm) * subdivision);

    const sysex = [0xF0, 0x00, 0x00, 0x0E, 0x0E, 0x10, delayMs >> 8, delayMs & 0xFF, 0xF7];
    midiAccess.outputs.forEach(output => output.send(sysex));

    document.getElementById('sysex-feedback').textContent = `Sent Delay: ${delayMs} ms`;
});
