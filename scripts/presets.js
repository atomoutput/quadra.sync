/* scripts/presets.js */

import { EventEmitter } from './utils/eventEmitter.js';

// Preset Constants
const PRESET_CONSTANTS = {
    STORAGE_KEY: 'delay_presets',
    VALIDATION: {
        NAME: {
            MIN_LENGTH: 1,
            MAX_LENGTH: 50,
            PATTERN: /^[a-zA-Z0-9\s-_]+$/
        },
        BPM: {
            MIN: 20,
            MAX: 300
        }
    }
};

// Preset Manager Class
export class PresetManager extends EventEmitter {
    constructor() {
        super();
        this.presets = new Map();
        this.state = {
            isInitialized: false,
            lastLoaded: null,
            lastSaved: null
        };
    }

    // Initialization
    async initialize() {
        try {
            await this.loadFromStorage();
            this.state.isInitialized = true;
            this.emit('initialized', { presetCount: this.presets.size });
        } catch (error) {
            console.error('Failed to initialize presets:', error);
            this.emit('error', error);
            throw error;
        }
    }

    // Storage Operations
    async loadFromStorage() {
        try {
            const storedPresets = localStorage.getItem(PRESET_CONSTANTS.STORAGE_KEY);
            if (storedPresets) {
                const presetArray = JSON.parse(storedPresets);
                this.presets.clear();
                presetArray.forEach(preset => {
                    this.presets.set(preset.name, this.validatePreset(preset));
                });
            }
            this.emit('presetsLoaded', { presetCount: this.presets.size });
        } catch (error) {
            console.error('Error loading presets from storage:', error);
            throw new Error('Failed to load presets from storage');
        }
    }

    async saveToStorage() {
        try {
            const presetArray = Array.from(this.presets.values());
            localStorage.setItem(PRESET_CONSTANTS.STORAGE_KEY, JSON.stringify(presetArray));
            this.emit('presetsSaved', { presetCount: this.presets.size });
        } catch (error) {
            console.error('Error saving presets to storage:', error);
            throw new Error('Failed to save presets to storage');
        }
    }

    // Preset Operations
    async savePreset(name, bpm, customSubdivisions = []) {
        try {
            this.validatePresetName(name);
            this.validateBPM(bpm);

            const preset = this.validatePreset({
                name,
                bpm,
                customSubdivisions: this.validateCustomSubdivisions(customSubdivisions),
                timestamp: Date.now()
            });

            this.presets.set(name, preset);
            await this.saveToStorage();

            this.state.lastSaved = preset;
            this.emit('presetSaved', preset);

            return preset;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async loadPreset(name) {
        try {
            const preset = this.presets.get(name);
            if (!preset) {
                throw new Error(`Preset "${name}" not found`);
            }

            this.state.lastLoaded = preset;
            this.emit('presetLoaded', preset);

            return preset;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async deletePreset(name) {
        try {
            const preset = this.presets.get(name);
            if (!preset) {
                throw new Error(`Preset "${name}" not found`);
            }

            this.presets.delete(name);
            await this.saveToStorage();

            this.emit('presetDeleted', preset);
            return preset;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async updatePreset(name, updates) {
        try {
            const existingPreset = this.presets.get(name);
            if (!existingPreset) {
                throw new Error(`Preset "${name}" not found`);
            }

            const updatedPreset = this.validatePreset({
                ...existingPreset,
                ...updates,
                timestamp: Date.now()
            });

            this.presets.set(name, updatedPreset);
            await this.saveToStorage();

            this.emit('presetUpdated', updatedPreset);
            return updatedPreset;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    // Validation
    validatePresetName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Preset name is required');
        }

        if (name.length < PRESET_CONSTANTS.VALIDATION.NAME.MIN_LENGTH ||
            name.length > PRESET_CONSTANTS.VALIDATION.NAME.MAX_LENGTH) {
            throw new Error(`Preset name must be between ${PRESET_CONSTANTS.VALIDATION.NAME.MIN_LENGTH} and ${PRESET_CONSTANTS.VALIDATION.NAME.MAX_LENGTH} characters`);
        }

        if (!PRESET_CONSTANTS.VALIDATION.NAME.PATTERN.test(name)) {
            throw new Error('Preset name contains invalid characters');
        }

        return name;
    }

    validateBPM(bpm) {
        const numBPM = Number(bpm);
        if (isNaN(numBPM)) {
            throw new Error('BPM must be a number');
        }

        if (numBPM < PRESET_CONSTANTS.VALIDATION.BPM.MIN ||
            numBPM > PRESET_CONSTANTS.VALIDATION.BPM.MAX) {
            throw new Error(`BPM must be between ${PRESET_CONSTANTS.VALIDATION.BPM.MIN} and ${PRESET_CONSTANTS.VALIDATION.BPM.MAX}`);
        }

        return numBPM;
    }

    validateCustomSubdivisions(subdivisions) {
        if (!Array.isArray(subdivisions)) {
            throw new Error('Custom subdivisions must be an array');
        }

        return subdivisions.map(subdivision => {
            if (!subdivision.name || typeof subdivision.name !== 'string') {
                throw new Error('Subdivision name is required');
            }

            if (!subdivision.factor || typeof subdivision.factor !== 'number') {
                throw new Error('Subdivision factor must be a number');
            }

            return {
                name: subdivision.name,
                factor: subdivision.factor
            };
        });
    }

    validatePreset(preset) {
        if (!preset || typeof preset !== 'object') {
            throw new Error('Invalid preset object');
        }

        return {
            name: this.validatePresetName(preset.name),
            bpm: this.validateBPM(preset.bpm),
            customSubdivisions: this.validateCustomSubdivisions(preset.customSubdivisions || []),
            timestamp: preset.timestamp || Date.now()
        };
    }

    // Utility Methods
    getAllPresets() {
        return Array.from(this.presets.values());
    }

    getPresetByName(name) {
        return this.presets.get(name);
    }

    getCustomSubdivisions(presetName) {
        const preset = this.presets.get(presetName);
        return preset ? preset.customSubdivisions : [];
    }

    getPresetCount() {
        return this.presets.size;
    }

    hasPreset(name) {
        return this.presets.has(name);
    }

    // State Management
    getState() {
        return { ...this.state };
    }

    isInitialized() {
        return this.state.isInitialized;
    }

    // Cleanup
    cleanup() {
        this.presets.clear();
        this.state.isInitialized = false;
        this.state.lastLoaded = null;
        this.state.lastSaved = null;
        this.removeAllListeners();
    }
}

// Create and export Preset Manager instance
export const presetManager = new PresetManager();

// Initialize Presets
export async function initializePresets() {
    await presetManager.initialize();
    return presetManager;
}