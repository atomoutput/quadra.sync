const { Logger } = require('./logger.js');

const logger = new Logger('Store');

class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Set();
        this.reducers = new Map();
        
        // Create a proxy to track state changes
        this.state = new Proxy(this.state, {
            set: (target, property, value) => {
                const oldValue = target[property];
                target[property] = value;
                
                if (oldValue !== value) {
                    this.notify({
                        type: 'state.change',
                        property,
                        oldValue,
                        newValue: value
                    });
                }
                return true;
            }
        });
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Notify all listeners
    notify(event) {
        logger.debug('State changed', { event });
        this.listeners.forEach(listener => listener(event));
    }

    // Register a reducer
    registerReducer(type, reducer) {
        this.reducers.set(type, reducer);
    }

    // Dispatch an action
    dispatch(action) {
        logger.debug('Dispatching action', { action });
        
        try {
            const reducer = this.reducers.get(action.type);
            if (!reducer) {
                logger.warn('No reducer found for action', { action });
                return;
            }

            const newState = reducer(this.state, action);
            Object.entries(newState).forEach(([key, value]) => {
                this.state[key] = value;
            });
        } catch (error) {
            logger.error('Error in dispatch', error, { action });
            throw error;
        }
    }

    // Get current state
    getState() {
        return { ...this.state };
    }
}

// Create application store with initial state
const store = new Store({
    bpm: 120,
    midiInput: null,
    midiOutput: null,
    customSubdivisions: [],
    presets: [],
    theme: 'light',
    audioEnabled: false,
    midiEnabled: false,
    isPlaying: false,
    error: null
});

// Register reducers
store.registerReducer('SET_BPM', (state, action) => ({
    ...state,
    bpm: action.payload
}));

store.registerReducer('SET_MIDI_INPUT', (state, action) => ({
    ...state,
    midiInput: action.payload
}));

store.registerReducer('SET_MIDI_OUTPUT', (state, action) => ({
    ...state,
    midiOutput: action.payload
}));

store.registerReducer('ADD_SUBDIVISION', (state, action) => ({
    ...state,
    customSubdivisions: [...state.customSubdivisions, action.payload]
}));

store.registerReducer('REMOVE_SUBDIVISION', (state, action) => ({
    ...state,
    customSubdivisions: state.customSubdivisions.filter((_, index) => index !== action.payload)
}));

store.registerReducer('SET_THEME', (state, action) => ({
    ...state,
    theme: action.payload
}));

store.registerReducer('SET_AUDIO_ENABLED', (state, action) => ({
    ...state,
    audioEnabled: action.payload
}));

store.registerReducer('SET_MIDI_ENABLED', (state, action) => ({
    ...state,
    midiEnabled: action.payload
}));

store.registerReducer('SET_IS_PLAYING', (state, action) => ({
    ...state,
    isPlaying: action.payload
}));

store.registerReducer('SET_ERROR', (state, action) => ({
    ...state,
    error: action.payload
}));

store.registerReducer('ADD_PRESET', (state, action) => ({
    ...state,
    presets: [...state.presets, action.payload]
}));

store.registerReducer('REMOVE_PRESET', (state, action) => ({
    ...state,
    presets: state.presets.filter((_, index) => index !== action.payload)
}));

// Action creators
const actions = {
    setBPM: (bpm) => ({ type: 'SET_BPM', payload: bpm }),
    setMIDIInput: (input) => ({ type: 'SET_MIDI_INPUT', payload: input }),
    setMIDIOutput: (output) => ({ type: 'SET_MIDI_OUTPUT', payload: output }),
    addSubdivision: (subdivision) => ({ type: 'ADD_SUBDIVISION', payload: subdivision }),
    removeSubdivision: (index) => ({ type: 'REMOVE_SUBDIVISION', payload: index }),
    setTheme: (theme) => ({ type: 'SET_THEME', payload: theme }),
    setAudioEnabled: (enabled) => ({ type: 'SET_AUDIO_ENABLED', payload: enabled }),
    setMIDIEnabled: (enabled) => ({ type: 'SET_MIDI_ENABLED', payload: enabled }),
    setIsPlaying: (isPlaying) => ({ type: 'SET_IS_PLAYING', payload: isPlaying }),
    setError: (error) => ({ type: 'SET_ERROR', payload: error }),
    addPreset: (preset) => ({ type: 'ADD_PRESET', payload: preset }),
    removePreset: (index) => ({ type: 'REMOVE_PRESET', payload: index })
};

module.exports = { store, actions }; 