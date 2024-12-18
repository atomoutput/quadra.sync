/* scripts/calculations.js */

// Constants
export const CONSTANTS = {
    BPM: {
        MIN: 20,
        MAX: 300
    },
    SUBDIVISION: {
        MIN_FACTOR: 0.0001,
        MAX_FACTOR: 10,
        MAX_NAME_LENGTH: 50
    },
    CACHE: {
        MAX_SIZE: 100,
        EXPIRY_TIME: 5 * 60 * 1000 // 5 minutes
    }
};

// Standard subdivisions configuration
export const STANDARD_SUBDIVISIONS = Object.freeze({
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
});

// Custom error class for calculation-related errors
export class CalculationError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'CalculationError';
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, CalculationError);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details
        };
    }
}

// Cache entry with expiration
class CacheEntry {
    constructor(value) {
        this.value = value;
        this.timestamp = Date.now();
    }

    isExpired() {
        return Date.now() - this.timestamp > CONSTANTS.CACHE.EXPIRY_TIME;
    }
}

export class Calculator {
    constructor() {
        this.customSubdivisions = new Map();
        this.cache = new Map();
        this.maxCacheSize = CONSTANTS.CACHE.MAX_SIZE;
        this.listeners = new Set();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners(event) {
        this.listeners.forEach(listener => listener(event));
    }

    validateBPM(bpm) {
        if (typeof bpm !== 'number' || isNaN(bpm)) {
            throw new CalculationError(
                'BPM must be a valid number',
                'INVALID_BPM_TYPE',
                { bpm }
            );
        }
        if (bpm < CONSTANTS.BPM.MIN || bpm > CONSTANTS.BPM.MAX) {
            throw new CalculationError(
                `BPM must be between ${CONSTANTS.BPM.MIN} and ${CONSTANTS.BPM.MAX}`,
                'BPM_OUT_OF_RANGE',
                { bpm, min: CONSTANTS.BPM.MIN, max: CONSTANTS.BPM.MAX }
            );
        }
    }

    validateSubdivision(name, factor) {
        // Validate name
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new CalculationError(
                'Subdivision name must be a non-empty string',
                'INVALID_SUBDIVISION_NAME',
                { name }
            );
        }
        if (name.length > CONSTANTS.SUBDIVISION.MAX_NAME_LENGTH) {
            throw new CalculationError(
                `Subdivision name must be less than ${CONSTANTS.SUBDIVISION.MAX_NAME_LENGTH} characters`,
                'SUBDIVISION_NAME_TOO_LONG',
                { name, maxLength: CONSTANTS.SUBDIVISION.MAX_NAME_LENGTH }
            );
        }
        if (name in STANDARD_SUBDIVISIONS) {
            throw new CalculationError(
                'Cannot use a standard subdivision name',
                'SUBDIVISION_NAME_RESERVED',
                { name }
            );
        }

        // Validate factor
        if (typeof factor !== 'number' || isNaN(factor)) {
            throw new CalculationError(
                'Subdivision factor must be a valid number',
                'INVALID_SUBDIVISION_FACTOR_TYPE',
                { factor }
            );
        }
        if (factor < CONSTANTS.SUBDIVISION.MIN_FACTOR || factor > CONSTANTS.SUBDIVISION.MAX_FACTOR) {
            throw new CalculationError(
                `Subdivision factor must be between ${CONSTANTS.SUBDIVISION.MIN_FACTOR} and ${CONSTANTS.SUBDIVISION.MAX_FACTOR}`,
                'SUBDIVISION_FACTOR_OUT_OF_RANGE',
                { factor, min: CONSTANTS.SUBDIVISION.MIN_FACTOR, max: CONSTANTS.SUBDIVISION.MAX_FACTOR }
            );
        }
    }

    addCustomSubdivision(name, factor) {
        this.validateSubdivision(name, factor);
        
        if (this.customSubdivisions.has(name)) {
            throw new CalculationError(
                'Subdivision name already exists',
                'SUBDIVISION_NAME_EXISTS',
                { name }
            );
        }

        this.customSubdivisions.set(name, factor);
        this.clearCache();
        this.notifyListeners({ type: 'subdivisionAdded', name, factor });
        
        return { name, factor };
    }

    removeCustomSubdivision(name) {
        if (!this.customSubdivisions.has(name)) {
            throw new CalculationError(
                'Subdivision not found',
                'SUBDIVISION_NOT_FOUND',
                { name }
            );
        }

        const factor = this.customSubdivisions.get(name);
        this.customSubdivisions.delete(name);
        this.clearCache();
        this.notifyListeners({ type: 'subdivisionRemoved', name, factor });
    }

    calculateDelayTime(bpm, factor) {
        this.validateBPM(bpm);
        
        if (typeof factor !== 'number' || isNaN(factor)) {
            throw new CalculationError(
                'Factor must be a valid number',
                'INVALID_FACTOR_TYPE',
                { factor }
            );
        }

        const beatDuration = 60000 / bpm; // Quarter note duration in ms
        return Number((beatDuration * factor).toFixed(2));
    }

    calculateAllDelayTimes(bpm) {
        this.validateBPM(bpm);

        // Check cache first
        const cacheKey = `bpm-${bpm}`;
        const cached = this.cache.get(cacheKey);
        if (cached && !cached.isExpired()) {
            return cached.value;
        }

        // Calculate delay times for all subdivisions
        const delayTimes = {
            standard: {},
            custom: {},
            timestamp: Date.now()
        };

        // Calculate standard subdivisions
        for (const [name, factor] of Object.entries(STANDARD_SUBDIVISIONS)) {
            delayTimes.standard[name] = this.calculateDelayTime(bpm, factor);
        }

        // Calculate custom subdivisions
        for (const [name, factor] of this.customSubdivisions) {
            delayTimes.custom[name] = this.calculateDelayTime(bpm, factor);
        }

        // Cache the results
        this.updateCache(cacheKey, delayTimes);

        return delayTimes;
    }

    updateCache(key, value) {
        // Remove expired entries first
        for (const [k, entry] of this.cache) {
            if (entry.isExpired()) {
                this.cache.delete(k);
            }
        }

        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = Array.from(this.cache.keys())[0];
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, new CacheEntry(value));
    }

    getCustomSubdivisions() {
        return Array.from(this.customSubdivisions.entries()).map(([name, factor]) => ({
            name,
            factor
        }));
    }

    clearCache() {
        this.cache.clear();
        this.notifyListeners({ type: 'cacheCleared' });
    }

    reset() {
        this.customSubdivisions.clear();
        this.clearCache();
        this.notifyListeners({ type: 'reset' });
    }

    // Performance monitoring
    getPerformanceMetrics() {
        return {
            cacheSize: this.cache.size,
            customSubdivisionsCount: this.customSubdivisions.size,
            listenersCount: this.listeners.size
        };
    }
}

// Create and export a default calculator instance
export const calculator = new Calculator();

/**
 * @typedef {Object} DelayTimes
 * @property {Object.<string, number>} standard - Standard delay times
 * @property {Object.<string, number>} custom - Custom delay times
 * @property {number} timestamp - Calculation timestamp
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} cacheSize - Current size of the cache
 * @property {number} customSubdivisionsCount - Number of custom subdivisions
 * @property {number} listenersCount - Number of active listeners
 */

export const Types = { DelayTimes: {}, PerformanceMetrics: {} };