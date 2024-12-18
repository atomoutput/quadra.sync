/* scripts/audio.js */

import { showNotification } from './ui.js';

// Constants
const DEFAULT_SAMPLE_PATH = './assets/audio/kick.wav';
const MAX_DELAY_TIME = 5.0;
const DEFAULT_GAIN = 0.8;
const MIN_GAIN = 0;
const MAX_GAIN = 1;

// Audio Context and Nodes
let audioContext = null;
let kickBuffer = null;
let activeNodes = new Set();

// Audio Node References
let nodes = {
    kickSource: null,
    delayNode: null,
    kickGainNode: null,
    delayGainNode: null,
    feedbackGainNode: null
};

// State tracking
let isInitialized = false;
let isPlaying = false;

/**
 * Creates and configures an audio node with cleanup registration
 * @template T
 * @param {string} type - The type of audio node to create
 * @param {Object} [config] - Configuration options for the node
 * @returns {T} The created audio node
 */
function createAudioNode(type, config = {}) {
    if (!audioContext) {
        throw new Error('Audio context not initialized');
    }

    let node;
    switch (type) {
        case 'gain':
            node = audioContext.createGain();
            if (typeof config.gain === 'number') {
                node.gain.value = Math.max(MIN_GAIN, Math.min(MAX_GAIN, config.gain));
            }
            break;
        case 'delay':
            node = audioContext.createDelay(config.maxDelayTime || MAX_DELAY_TIME);
            if (typeof config.delayTime === 'number') {
                node.delayTime.value = config.delayTime;
            }
            break;
        default:
            throw new Error(`Unsupported audio node type: ${type}`);
    }

    activeNodes.add(node);
    return node;
}

/**
 * Safely disconnects and cleans up an audio node
 * @param {AudioNode} node - The audio node to clean up
 */
function cleanupAudioNode(node) {
    try {
        if (node) {
            node.disconnect();
            activeNodes.delete(node);
        }
    } catch (error) {
        console.error('Error cleaning up audio node:', error);
    }
}

/**
 * Gets the audio context, creating it if necessary
 * @returns {AudioContext}
 */
export function getAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
            showNotification('Failed to initialize audio system', 'error');
            return null;
        }
    }
    return audioContext;
}

/**
 * Initializes the audio system
 * @returns {Promise<void>}
 */
export async function initializeAudio() {
    try {
        if (isInitialized) {
            return;
        }

        audioContext = getAudioContext();
        if (!audioContext) {
            throw new Error('Failed to create audio context');
        }

        // Load kick sample
        const response = await fetch(DEFAULT_SAMPLE_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load audio sample: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        kickBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create audio nodes
        nodes.delayNode = createAudioNode('delay', { maxDelayTime: MAX_DELAY_TIME });
        nodes.kickGainNode = createAudioNode('gain', { gain: DEFAULT_GAIN });
        nodes.delayGainNode = createAudioNode('gain', { gain: DEFAULT_GAIN });
        nodes.feedbackGainNode = createAudioNode('gain', { gain: MIN_GAIN });

        isInitialized = true;
        showNotification('Audio system initialized successfully');
    } catch (error) {
        console.error('Error initializing audio:', error);
        showNotification(`Failed to initialize audio: ${error.message}`, 'error');
        cleanup();
        throw error;
    }
}

/**
 * Sets up and starts the kick pulse with delay
 * @param {number} bpm - Beats per minute
 * @param {number} subdivisionFactor - The subdivision factor for timing
 * @param {boolean} delayActive - Whether delay effect is active
 */
export function setKickPulse(bpm, subdivisionFactor, delayActive) {
    try {
        if (!isInitialized || !audioContext || !kickBuffer) {
            throw new Error('Audio system not properly initialized');
        }

        if (isPlaying) {
            stopKickPulse();
        }

        const beatDuration = 60000 / bpm;
        const interval = beatDuration * subdivisionFactor / 1000; // Convert ms to seconds
        const delayTime = interval;

        // Create and configure source node
        nodes.kickSource = audioContext.createBufferSource();
        nodes.kickSource.buffer = kickBuffer;
        nodes.kickSource.loop = true;

        // Configure delay time
        nodes.delayNode.delayTime.value = delayTime;

        // Connect nodes
        nodes.kickSource.connect(nodes.kickGainNode);

        if (delayActive) {
            nodes.kickGainNode.connect(nodes.delayNode);
            nodes.delayNode.connect(nodes.feedbackGainNode);
            nodes.feedbackGainNode.connect(nodes.delayGainNode);
            nodes.delayGainNode.connect(audioContext.destination);
            nodes.feedbackGainNode.connect(nodes.delayNode);
        } else {
            nodes.kickGainNode.connect(audioContext.destination);
        }

        // Start playback
        nodes.kickSource.start(0);
        isPlaying = true;

        // Set up cleanup when source ends
        nodes.kickSource.onended = () => {
            cleanupAudioNode(nodes.kickSource);
            nodes.kickSource = null;
            isPlaying = false;
        };
    } catch (error) {
        console.error('Error setting kick pulse:', error);
        showNotification(`Failed to set kick pulse: ${error.message}`, 'error');
        stopKickPulse();
    }
}

/**
 * Stops the current kick pulse
 */
export function stopKickPulse() {
    try {
        if (nodes.kickSource) {
            nodes.kickSource.stop();
            cleanupAudioNode(nodes.kickSource);
            nodes.kickSource = null;
        }
        isPlaying = false;
    } catch (error) {
        console.error('Error stopping kick pulse:', error);
    }
}

/**
 * Sets the gain value for a specific audio node
 * @param {string} nodeType - The type of node to adjust ('kick', 'delay', or 'feedback')
 * @param {number} value - The gain value to set (0-1)
 */
export function setGain(nodeType, value) {
    try {
        const gainValue = Math.max(MIN_GAIN, Math.min(MAX_GAIN, value));
        switch (nodeType) {
            case 'kick':
                nodes.kickGainNode.gain.value = gainValue;
                break;
            case 'delay':
                nodes.delayGainNode.gain.value = gainValue;
                break;
            case 'feedback':
                nodes.feedbackGainNode.gain.value = gainValue;
                break;
            default:
                throw new Error(`Invalid node type: ${nodeType}`);
        }
    } catch (error) {
        console.error('Error setting gain:', error);
        showNotification(`Failed to set ${nodeType} gain`, 'error');
    }
}

/**
 * Cleans up audio resources
 */
export function cleanup() {
    try {
        stopKickPulse();

        // Clean up all active nodes
        for (const node of activeNodes) {
            cleanupAudioNode(node);
        }
        activeNodes.clear();

        // Reset node references
        nodes = {
            kickSource: null,
            delayNode: null,
            kickGainNode: null,
            delayGainNode: null,
            feedbackGainNode: null
        };

        // Close audio context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        isInitialized = false;
        isPlaying = false;
    } catch (error) {
        console.error('Error during audio cleanup:', error);
    }
}

// Export additional functions for testing
export const __testing = {
    createAudioNode,
    cleanupAudioNode,
    getNodes: () => nodes,
    getActiveNodes: () => activeNodes,
    isInitialized: () => isInitialized,
    isPlaying: () => isPlaying
};