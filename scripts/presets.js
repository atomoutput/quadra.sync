/* scripts/presets.js */

import { showNotification } from './ui.js';
import { populateSuggestionsTable } from './ui.js';
import { calculateDelayTimes } from './calculations.js';

// State variable for presets
let presets = [];

// Function to save a preset
function savePreset(name, bpm, customSubdivisions) {
    if (!name || !bpm) {
        showNotification('Preset name and BPM are required.', 'error');
        return;
      }
      if (presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) {
        showNotification('A preset with this name already exists.', 'error');
        return;
      }
    const preset = { name, bpm, customSubdivisions };
    presets.push(preset);
    localStorage.setItem('delay_presets', JSON.stringify(presets));
    showNotification(`Preset "${name}" saved successfully!`, 'success');
}

// Function to load a preset
function loadPreset(name) {
    const preset = presets.find(p => p.name === name);
    if (preset) {
      // Update the BPM input field
      const bpmInput = document.getElementById('bpm-input');
      bpmInput.value = preset.bpm;
  
      // Recalculate delay times based on the loaded BPM
      const delayTimes = calculateDelayTimes(preset.bpm);
  
      // Update the delay suggestions table
      populateSuggestionsTable(delayTimes);
  
      // Update custom subdivisions if available
      if (preset.customSubdivisions) {
        // Assuming you have a function to update the custom subdivisions table
        updateCustomSubdivisionsTable(preset.customSubdivisions);
      }
  
      showNotification(`Preset "${name}" loaded!`, 'success');
    } else {
      showNotification(`Preset "${name}" not found.`, 'error');
    }
  }

// Function to delete a preset
function deletePreset(index) {
    const presetName = presets[index].name;
    if (confirm(`Are you sure you want to delete preset "${presetName}"?`)) {
        presets.splice(index, 1);
        localStorage.setItem('delay_presets', JSON.stringify(presets));
        showNotification(`Preset "${presetName}" deleted.`, 'success');
    }
}

// Function to get all presets
function getPresets() {
    return presets;
}

// Function to get custom subdivisions from a preset
function getCustomSubdivisions(presetName) {
    const preset = presets.find(p => p.name === presetName);
    return preset ? preset.customSubdivisions : [];
  }

// Initialize presets
function initializePresets() {
    presets = JSON.parse(localStorage.getItem('delay_presets')) || [];
}

// Export functions to be used in other modules
export {
    savePreset,
    loadPreset,
    deletePreset,
    getPresets,
    initializePresets,
    getCustomSubdivisions
};