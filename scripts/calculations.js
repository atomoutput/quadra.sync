/* scripts/calculations.js */

import { showNotification } from './ui.js';
import { getCustomSubdivisions as getCustomSubdivisionsFromPreset } from './presets.js';

// State Variable for custom subdivisions
let customSubdivisions = [];

// Function to calculate delay times based on BPM and subdivisions
function calculateDelayTimes(bpm) {
    const beatDuration = 60000 / bpm; // Quarter note duration in ms
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
    let allSubdivisions = { ...standardSubdivisions };

    // Get custom subdivisions from presets module
    const customSubsFromPresets = getCustomSubdivisionsFromPreset();
    customSubsFromPresets.forEach(sub => {
        allSubdivisions[sub.name] = sub.factor;
    });

    const delayTimes = {};
    for (const [subdivision, factor] of Object.entries(allSubdivisions)) {
        delayTimes[subdivision] = beatDuration * factor;
    }
    return delayTimes;
}

// Function to add a custom subdivision
function addCustomSubdivision(name, factor) {
    if (customSubdivisions.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Subdivision name already exists.', 'error');
        return;
    }
    customSubdivisions.push({ name, factor });
}

// Function to remove a custom subdivision
function removeCustomSubdivision(index) {
    customSubdivisions.splice(index, 1);
}

// Function to get all custom subdivisions
function getCustomSubdivisions() {
    return customSubdivisions;
}

// Function to get default subdivisions
function getDefaultSubdivisions() {
  return {
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
}

// Initialize the module (if needed)
function init() {
  // You can add initialization logic here if necessary
}

// Export functions and variables to be used in other modules
export {
    calculateDelayTimes,
    addCustomSubdivision,
    removeCustomSubdivision,
    getCustomSubdivisions,
    getDefaultSubdivisions,
    init
};