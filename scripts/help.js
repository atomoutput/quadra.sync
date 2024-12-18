/* scripts/help.js */

import { animations } from './animations.js';

const HELP_CONTENT = {
    sections: [
        {
            title: 'Getting Started',
            content: `
                <h3>Welcome to quadra.sync</h3>
                <p>A modern MIDI delay calculator designed for the Alesis Quadraverb.</p>
                
                <h4>Key Features:</h4>
                <ul>
                    <li>Real-time BPM calculation</li>
                    <li>MIDI clock sync</li>
                    <li>Custom delay subdivisions</li>
                    <li>Direct Quadraverb control via MIDI sysex</li>
                    <li>Preset management</li>
                </ul>
            `
        },
        {
            title: 'BPM Control',
            content: `
                <h4>Setting the BPM</h4>
                <ul>
                    <li>Manual input: Enter BPM value (20-300)</li>
                    <li>Tap tempo: Tap the button in rhythm</li>
                    <li>MIDI clock: Connect a MIDI device</li>
                </ul>
            `
        },
        {
            title: 'Delay Times',
            content: `
                <h4>Understanding Delay Times</h4>
                <ul>
                    <li>Standard subdivisions (whole note to 32nd note)</li>
                    <li>Dotted and triplet variations</li>
                    <li>Custom subdivisions with user-defined ratios</li>
                    <li>Click any delay time to copy to clipboard</li>
                </ul>
            `
        },
        {
            title: 'MIDI Control',
            content: `
                <h4>MIDI Setup</h4>
                <ul>
                    <li>Select MIDI input for clock sync</li>
                    <li>Select MIDI output for Quadraverb control</li>
                    <li>Automatic BPM detection from MIDI clock</li>
                    <li>Direct parameter control via sysex</li>
                </ul>
            `
        },
        {
            title: 'Custom Subdivisions',
            content: `
                <h4>Creating Custom Subdivisions</h4>
                <ul>
                    <li>Name: Choose a descriptive name</li>
                    <li>Factor: Relative to quarter note (1.0)</li>
                    <li>Example: Dotted eighth = 0.75</li>
                    <li>Custom subdivisions are saved automatically</li>
                </ul>
            `
        },
        {
            title: 'Presets',
            content: `
                <h4>Managing Presets</h4>
                <ul>
                    <li>Save current settings with a name</li>
                    <li>Load presets with a single click</li>
                    <li>Delete unwanted presets</li>
                    <li>Presets include BPM and custom subdivisions</li>
                </ul>
            `
        }
    ]
};

export function initializeHelp() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeBtn = document.getElementById('close-help-modal');
    const modalBody = helpModal.querySelector('.modal-body');

    // Generate help content
    const content = HELP_CONTENT.sections.map(section => `
        <section class="help-section">
            <h2>${section.title}</h2>
            ${section.content}
        </section>
    `).join('');

    modalBody.innerHTML = content;

    // Event handlers
    helpBtn.addEventListener('click', () => {
        animations.showModal('help-modal');
    });

    closeBtn.addEventListener('click', () => {
        animations.hideModal('help-modal');
    });

    // Close modal when clicking outside
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            animations.hideModal('help-modal');
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !helpModal.getAttribute('aria-hidden')) {
            animations.hideModal('help-modal');
        }
    });
}