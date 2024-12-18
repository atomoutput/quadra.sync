/* scripts/calculations.js */

import { showNotification } from './ui.js';
import { getCustomSubdivisions as getCustomSubdivisionsFromPreset } from './presets.js';

// Constants
const MIN_BPM = 20;
const MAX_BPM = 300;
const MIN_SUBDIVISION_FACTOR = 0.0001;
const MAX_SUBDIVISION_FACTOR = 10;

// State Variable for custom subdivisions
let customSubdivisions = [];

// Memoization cache for delay time calculations
const memoizedDelayTimes = new Map();
const MEMO_CACHE_SIZE = 100;

// Standard subdivisions configuration
const standardSubdivisions = {
    // Simple Subdivisions
    'Whole Note (1/1)': 4,
    'Half Note (1/2)': 2,
    'Quarter Note (1/4)': 1,
    'Eighth Note (1/8)': 0.5,
    'Sixteenth Note (1/16)': 0.25,
    'Thirty-Second Note (1/32)': 0.125,

    // Compound Subdivisions
    'Dotted Half Note (3/4)': 3,
    'Dotted Quarter Note (3/8)': 1.5,
    'Dotted Eighth Note (3/16)': 0.75,
    'Triplet Whole Note (2/3)': 2.6667,
    'Triplet Half Note (2/3)': 1.3333,
    'Triplet Quarter Note (2/3)': 0.6667,
    'Triplet Eighth Note (2/3)': 0.3333,
    'Triplet Sixteenth Note (2/3)': 0.1667
};

// Validation functions
function validateBPM(bpm) {
    if (typeof bpm !== 'number' || isNaN(bpm)) {
        throw new Error('BPM must be a valid number');
    }
    if (bpm < MIN_BPM || bpm > MAX_BPM) {
        throw new Error(`BPM must be between ${MIN_BPM} and ${MAX_BPM}`);
    }
}

function validateSubdivisionFactor(factor) {
    if (typeof factor !== 'number' || isNaN(factor)) {
        throw new Error('Subdivision factor must be a valid number');
    }
    if (factor < MIN_SUBDIVISION_FACTOR || factor > MAX_SUBDIVISION_FACTOR) {
        throw new Error(`Subdivision factor must be between ${MIN_SUBDIVISION_FACTOR} and ${MAX_SUBDIVISION_FACTOR}`);
    }
}

function validateSubdivisionName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Subdivision name must be a non-empty string');
    }
    if (name.length > 50) {
        throw new Error('Subdivision name must be less than 50 characters');
    }
    if (standardSubdivisions.hasOwnProperty(name)) {
        throw new Error('Cannot use a standard subdivision name');
    }
}

// Memoization helper functions
function getMemoKey(bpm, subdivisions) {
    return `${bpm}-${JSON.stringify(subdivisions)}`;
}

function memoize(key, value) {
    if (memoizedDelayTimes.size >= MEMO_CACHE_SIZE) {
        const firstKey = memoizedDelayTimes.keys().next().value;
        memoizedDelayTimes.delete(firstKey);
    }
    memoizedDelayTimes.set(key, value);
}

// Function to calculate delay times based on BPM and subdivisions
function calculateDelayTimes(bpm) {
    try {
        validateBPM(bpm);

        // Get all subdivisions including custom ones
        const allSubdivisions = { ...standardSubdivisions };
        const customSubs = getCustomSubdivisionsFromPreset();
        customSubs.forEach(sub => {
            validateSubdivisionFactor(sub.factor);
            allSubdivisions[sub.name] = sub.factor;
        });

        // Check memoization cache
        const memoKey = getMemoKey(bpm, allSubdivisions);
        if (memoizedDelayTimes.has(memoKey)) {
            return memoizedDelayTimes.get(memoKey);
        }

        // Calculate delay times
        const beatDuration = 60000 / bpm; // Quarter note duration in ms
        const delayTimes = {};

        for (const [subdivision, factor] of Object.entries(allSubdivisions)) {
            validateSubdivisionFactor(factor);
            delayTimes[subdivision] = Number((beatDuration * factor).toFixed(2));
        }

        // Store in memoization cache
        memoize(memoKey, delayTimes);
        return delayTimes;
    } catch (error) {
        console.error('Error calculating delay times:', error);
        showNotification(error.message, 'error');
        return {};
    }
}

// Function to add a custom subdivision
function addCustomSubdivision(name, factor) {
    try {
        validateSubdivisionName(name);
        validateSubdivisionFactor(factor);

        if (customSubdivisions.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
            throw new Error('Subdivision name already exists.');
        }

        customSubdivisions.push({ name, factor });
        // Clear memoization cache when subdivisions change
        memoizedDelayTimes.clear();
    } catch (error) {
        console.error('Error adding custom subdivision:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Function to remove a custom subdivision
function removeCustomSubdivision(index) {
    try {
        if (index < 0 || index >= customSubdivisions.length) {
            throw new Error('Invalid subdivision index');
        }
        customSubdivisions.splice(index, 1);
        // Clear memoization cache when subdivisions change
        memoizedDelayTimes.clear();
    } catch (error) {
        console.error('Error removing custom subdivision:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Function to get all custom subdivisions
function getCustomSubdivisions() {
    return [...customSubdivisions]; // Return a copy to prevent direct state mutation
}

// Function to get default subdivisions
function getDefaultSubdivisions() {
    return { ...standardSubdivisions }; // Return a copy to prevent direct state mutation
}

// Clear memoization cache
function clearMemoizationCache() {
    memoizedDelayTimes.clear();
}

// Initialize the module
function init() {
    customSubdivisions = [];
    memoizedDelayTimes.clear();
}

// Export functions and variables to be used in other modules
export {
    calculateDelayTimes,
    addCustomSubdivision,
    removeCustomSubdivision,
    getCustomSubdivisions,
    getDefaultSubdivisions,
    clearMemoizationCache,
    init
};