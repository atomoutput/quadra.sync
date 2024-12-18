/* scripts/audio.js */

import { EventEmitter } from './utils/eventEmitter.js';

// Audio Constants
const AUDIO_CONSTANTS = {
    PATHS: {
        DEFAULT_SAMPLE: './assets/audio/kick.wav'
    },
    TIMING: {
        MAX_DELAY_TIME: 5.0,
        MIN_BPM: 20,
        MAX_BPM: 300
    },
    GAIN: {
        DEFAULT: 0.8,
        MIN: 0,
        MAX: 1
    },
    NODE_TYPES: {
        GAIN: 'gain',
        DELAY: 'delay',
        SOURCE: 'source'
    }
};

// Audio Manager Class
export class AudioManager extends EventEmitter {
    constructor() {
        super();
        this.state = {
            isInitialized: false,
            isPlaying: false,
            currentBPM: 120,
            currentSubdivision: 1,
            delayActive: false
        };

        this.context = null;
        this.samples = new Map();
        this.activeNodes = new Set();
        this.nodes = {
            source: null,
            delay: null,
            kickGain: null,
            delayGain: null,
            feedbackGain: null
        };
    }

    // Initialization
    async initialize() {
        try {
            if (this.state.isInitialized) {
                return;
            }

            await this.initializeContext();
            await this.loadDefaultSamples();
            await this.createAudioGraph();

            this.state.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.emit('error', error);
            await this.cleanup();
            throw error;
        }
    }

    async initializeContext() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.emit('contextCreated', this.context);
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
            throw new Error('Failed to initialize audio system');
        }
    }

    async loadDefaultSamples() {
        try {
            const kickBuffer = await this.loadSample(AUDIO_CONSTANTS.PATHS.DEFAULT_SAMPLE);
            this.samples.set('kick', kickBuffer);
        } catch (error) {
            console.error('Failed to load default samples:', error);
            throw error;
        }
    }

    async loadSample(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load audio sample: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return await this.context.decodeAudioData(arrayBuffer);
    }

    // Audio Graph Management
    async createAudioGraph() {
        // Create nodes
        this.nodes.delay = this.createAudioNode(AUDIO_CONSTANTS.NODE_TYPES.DELAY, {
            maxDelayTime: AUDIO_CONSTANTS.TIMING.MAX_DELAY_TIME
        });

        this.nodes.kickGain = this.createAudioNode(AUDIO_CONSTANTS.NODE_TYPES.GAIN, {
            gain: AUDIO_CONSTANTS.GAIN.DEFAULT
        });

        this.nodes.delayGain = this.createAudioNode(AUDIO_CONSTANTS.NODE_TYPES.GAIN, {
            gain: AUDIO_CONSTANTS.GAIN.DEFAULT
        });

        this.nodes.feedbackGain = this.createAudioNode(AUDIO_CONSTANTS.NODE_TYPES.GAIN, {
            gain: AUDIO_CONSTANTS.GAIN.MIN
        });

        this.emit('graphCreated', this.nodes);
    }

    createAudioNode(type, config = {}) {
        if (!this.context) {
            throw new Error('Audio context not initialized');
        }

        let node;
        switch (type) {
            case AUDIO_CONSTANTS.NODE_TYPES.GAIN:
                node = this.context.createGain();
                if (typeof config.gain === 'number') {
                    node.gain.value = this.clampGain(config.gain);
                }
                break;

            case AUDIO_CONSTANTS.NODE_TYPES.DELAY:
                node = this.context.createDelay(config.maxDelayTime || AUDIO_CONSTANTS.TIMING.MAX_DELAY_TIME);
                if (typeof config.delayTime === 'number') {
                    node.delayTime.value = config.delayTime;
                }
                break;

            default:
                throw new Error(`Unsupported audio node type: ${type}`);
        }

        this.activeNodes.add(node);
        return node;
    }

    // Playback Control
    async setKickPulse(bpm, subdivisionFactor, delayActive = false) {
        try {
            this.validatePlaybackParameters(bpm, subdivisionFactor);

            if (this.state.isPlaying) {
                await this.stopKickPulse();
            }

            const beatDuration = 60000 / bpm;
            const interval = (beatDuration * subdivisionFactor) / 1000; // Convert to seconds

            // Create and configure source
            this.nodes.source = this.context.createBufferSource();
            this.nodes.source.buffer = this.samples.get('kick');
            this.nodes.source.loop = true;

            // Configure delay
            this.nodes.delay.delayTime.value = interval;

            // Connect nodes
            this.connectNodes(delayActive);

            // Start playback
            this.nodes.source.start(0);
            this.state.isPlaying = true;
            this.state.currentBPM = bpm;
            this.state.currentSubdivision = subdivisionFactor;
            this.state.delayActive = delayActive;

            // Set up cleanup
            this.nodes.source.onended = () => this.handleSourceEnded();

            this.emit('playbackStarted', {
                bpm,
                subdivisionFactor,
                delayActive
            });
        } catch (error) {
            console.error('Error setting kick pulse:', error);
            this.emit('error', error);
            await this.stopKickPulse();
            throw error;
        }
    }

    connectNodes(delayActive) {
        // Reset all connections
        this.disconnectNodes();

        // Basic connection
        this.nodes.source.connect(this.nodes.kickGain);

        if (delayActive) {
            // Delay path
            this.nodes.kickGain.connect(this.nodes.delay);
            this.nodes.delay.connect(this.nodes.feedbackGain);
            this.nodes.feedbackGain.connect(this.nodes.delayGain);
            this.nodes.delayGain.connect(this.context.destination);
            this.nodes.feedbackGain.connect(this.nodes.delay);
        } else {
            // Direct path
            this.nodes.kickGain.connect(this.context.destination);
        }
    }

    disconnectNodes() {
        Object.values(this.nodes).forEach(node => {
            if (node) {
                try {
                    node.disconnect();
                } catch (error) {
                    // Ignore disconnection errors
                }
            }
        });
    }

    async stopKickPulse() {
        if (this.nodes.source) {
            this.nodes.source.stop();
            this.cleanupAudioNode(this.nodes.source);
            this.nodes.source = null;
        }

        this.state.isPlaying = false;
        this.emit('playbackStopped');
    }

    // Parameter Control
    setGain(nodeType, value) {
        const gainValue = this.clampGain(value);
        let node;

        switch (nodeType) {
            case 'kick':
                node = this.nodes.kickGain;
                break;
            case 'delay':
                node = this.nodes.delayGain;
                break;
            case 'feedback':
                node = this.nodes.feedbackGain;
                break;
            default:
                throw new Error(`Invalid node type: ${nodeType}`);
        }

        if (node) {
            node.gain.value = gainValue;
            this.emit('gainChanged', { nodeType, value: gainValue });
        }
    }

    // Utility Methods
    validatePlaybackParameters(bpm, subdivisionFactor) {
        if (!this.state.isInitialized || !this.context || !this.samples.get('kick')) {
            throw new Error('Audio system not properly initialized');
        }

        if (bpm < AUDIO_CONSTANTS.TIMING.MIN_BPM || bpm > AUDIO_CONSTANTS.TIMING.MAX_BPM) {
            throw new Error(`BPM must be between ${AUDIO_CONSTANTS.TIMING.MIN_BPM} and ${AUDIO_CONSTANTS.TIMING.MAX_BPM}`);
        }

        if (subdivisionFactor <= 0) {
            throw new Error('Subdivision factor must be positive');
        }
    }

    clampGain(value) {
        return Math.max(AUDIO_CONSTANTS.GAIN.MIN, 
                       Math.min(AUDIO_CONSTANTS.GAIN.MAX, value));
    }

    handleSourceEnded() {
        this.cleanupAudioNode(this.nodes.source);
        this.nodes.source = null;
        this.state.isPlaying = false;
        this.emit('sourceEnded');
    }

    cleanupAudioNode(node) {
        try {
            if (node) {
                node.disconnect();
                this.activeNodes.delete(node);
            }
        } catch (error) {
            console.error('Error cleaning up audio node:', error);
        }
    }

    // Cleanup
    async cleanup() {
        try {
            await this.stopKickPulse();

            // Clean up all active nodes
            for (const node of this.activeNodes) {
                this.cleanupAudioNode(node);
            }
            this.activeNodes.clear();

            // Reset node references
            Object.keys(this.nodes).forEach(key => {
                this.nodes[key] = null;
            });

            // Clear samples
            this.samples.clear();

            // Reset state
            this.state.isInitialized = false;
            this.state.isPlaying = false;

            // Close context
            if (this.context?.state !== 'closed') {
                await this.context?.close();
            }
            this.context = null;

            this.emit('cleanup');
        } catch (error) {
            console.error('Error during cleanup:', error);
            this.emit('error', error);
        }
    }

    // State Getters
    getState() {
        return { ...this.state };
    }

    isInitialized() {
        return this.state.isInitialized;
    }

    isPlaying() {
        return this.state.isPlaying;
    }
}

// Create and export Audio instance
export const audio = new AudioManager();

// Initialize Audio
export async function initializeAudio() {
    await audio.initialize();
    return audio;
}