/* scripts/ui.js */

import { animations } from './animations.js';

export class UI {
    constructor() {
        this.eventHandlers = new Map();
        this.init();
    }

    init() {
            this.setupEventListeners();
        this.setupThemeToggle();
    }

    setupEventListeners() {
        // BPM Input
        const bpmInput = document.getElementById('bpm-input');
        if (bpmInput) {
            bpmInput.addEventListener('input', (e) => {
                const bpm = parseInt(e.target.value);
                if (!isNaN(bpm) && bpm > 0) {
                    this.emit('calculateBPM', bpm);
                }
            });
        }

        // Tap Tempo
        const tapBtn = document.querySelector('.tap-btn');
        if (tapBtn) {
            let tapTimes = [];
            let lastTapTime = 0;

            tapBtn.addEventListener('click', () => {
                const currentTime = Date.now();
                
                if (currentTime - lastTapTime > 2000) {
                    tapTimes = [];
                }

                tapTimes.push(currentTime);
                lastTapTime = currentTime;

                if (tapTimes.length > 1) {
                    const intervals = [];
                    for (let i = 1; i < tapTimes.length; i++) {
                        intervals.push(tapTimes[i] - tapTimes[i - 1]);
                    }

                    const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                    const bpm = Math.round(60000 / averageInterval);

                    if (bpm >= 20 && bpm <= 300) {
                        this.emit('tapTempo', bpm);
                        if (bpmInput) bpmInput.value = bpm;
                    }
                }

                if (tapTimes.length > 4) {
                    tapTimes.shift();
                }
            });
        }

        // MIDI Device Selection
        const midiInputSelect = document.getElementById('midi-input-select');
        if (midiInputSelect) {
            midiInputSelect.addEventListener('change', (e) => {
                this.emit('midiInputChange', e.target.value);
            });
        }

        const midiOutputSelect = document.getElementById('midi-output-select');
        if (midiOutputSelect) {
            midiOutputSelect.addEventListener('change', (e) => {
                this.emit('midiOutputChange', e.target.value);
            });
        }

        // Custom Subdivision
        const addSubdivisionBtn = document.getElementById('add-subdivision-btn');
        const subdivisionNameInput = document.getElementById('subdivision-name');
        const subdivisionFactorInput = document.getElementById('subdivision-factor');

        if (addSubdivisionBtn && subdivisionNameInput && subdivisionFactorInput) {
            addSubdivisionBtn.addEventListener('click', () => {
                const name = subdivisionNameInput.value.trim();
                const factor = parseFloat(subdivisionFactorInput.value);

                if (name && !isNaN(factor)) {
                    this.emit('addSubdivision', { name, factor });
                    subdivisionNameInput.value = '';
                    subdivisionFactorInput.value = '';
                } else {
                    animations.showNotification('Please enter valid subdivision details', 'error');
                }
            });
        }

        // Presets
        const savePresetBtn = document.getElementById('save-preset-btn');
        const presetNameInput = document.getElementById('preset-name');

        if (savePresetBtn && presetNameInput) {
            savePresetBtn.addEventListener('click', () => {
                const name = presetNameInput.value.trim();
                if (name) {
                    this.emit('savePreset', name);
                    presetNameInput.value = '';
                } else {
                    animations.showNotification('Please enter a preset name', 'error');
                }
            });
        }
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        if (themeToggle) {
            // Set initial theme
            document.body.dataset.theme = prefersDark.matches ? 'dark' : 'light';
            
            // Update theme icon
            this.updateThemeIcon(prefersDark.matches);
            
            // Listen for system theme changes
            prefersDark.addEventListener('change', (e) => {
                document.body.dataset.theme = e.matches ? 'dark' : 'light';
                this.updateThemeIcon(e.matches);
            });
        }
    }

    updateThemeIcon(isDark) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.innerHTML = isDark ? this.getSunIcon() : this.getMoonIcon();
        }
    }

    getSunIcon() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`;
    }

    getMoonIcon() {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>`;
    }

    createDelayTimeCard(delay) {
        const card = document.createElement('div');
        card.className = 'delay-time-card';
        card.dataset.subdivision = delay.name;

        card.innerHTML = `
            <h3 class="delay-time-title">${delay.name}</h3>
            <div class="delay-time-value">${delay.time.toFixed(2)}ms</div>
            <div class="delay-time-factor">${delay.factor}x</div>
        `;

        card.addEventListener('click', () => {
            this.emit('selectSubdivision', delay);
        });

        return card;
    }

    updateMIDIDevices(inputs, outputs) {
        const inputSelect = document.getElementById('midi-input-select');
        const outputSelect = document.getElementById('midi-output-select');

        if (inputSelect) {
            inputSelect.innerHTML = '<option value="">No MIDI Input</option>' +
                inputs.map(device => 
                    `<option value="${device.id}">${device.name}</option>`
                ).join('');
        }

        if (outputSelect) {
            outputSelect.innerHTML = '<option value="">No MIDI Output</option>' +
                outputs.map(device => 
                    `<option value="${device.id}">${device.name}</option>`
                ).join('');
        }
    }

    updateBPM(bpm) {
        const bpmInput = document.getElementById('bpm-input');
        if (bpmInput) {
            animations.showLoadingState(bpmInput, true);
            bpmInput.value = bpm;
            animations.showLoadingState(bpmInput, false);
        }
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).delete(handler);
        }
    }

    emit(event, ...args) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => handler(...args));
        }
    }

    cleanup() {
        this.eventHandlers.clear();
    }
}

// Initialize and export UI
export function initializeUI() {
    return new UI();
}