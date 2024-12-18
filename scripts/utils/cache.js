/* scripts/utils/cache.js */

import { Logger } from './logger.js';

const logger = new Logger('Cache');

class Cache {
    constructor(options = {}) {
        this.storage = new Map();
        this.maxSize = options.maxSize || 100;
        this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default TTL
        this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute cleanup
        this.hits = 0;
        this.misses = 0;

        // Start cleanup interval
        this.startCleanup();
    }

    // Generate cache key
    generateKey(key, params = {}) {
        return typeof key === 'string' 
            ? `${key}:${JSON.stringify(params)}`
            : JSON.stringify(key);
    }

    // Set cache item
    set(key, value, ttl = this.ttl) {
        const cacheKey = this.generateKey(key);
        
        // Check cache size
        if (this.storage.size >= this.maxSize) {
            this.removeOldest();
        }

        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };

        this.storage.set(cacheKey, item);
        logger.debug('Cache item set', { key: cacheKey });
    }

    // Get cache item
    get(key) {
        const cacheKey = this.generateKey(key);
        const item = this.storage.get(cacheKey);

        if (!item) {
            this.misses++;
            logger.debug('Cache miss', { key: cacheKey });
            return null;
        }

        // Check if item is expired
        if (this.isExpired(item)) {
            this.storage.delete(cacheKey);
            this.misses++;
            logger.debug('Cache item expired', { key: cacheKey });
            return null;
        }

        this.hits++;
        logger.debug('Cache hit', { key: cacheKey });
        return item.value;
    }

    // Check if item exists and is valid
    has(key) {
        const cacheKey = this.generateKey(key);
        const item = this.storage.get(cacheKey);
        return item && !this.isExpired(item);
    }

    // Remove item from cache
    remove(key) {
        const cacheKey = this.generateKey(key);
        this.storage.delete(cacheKey);
        logger.debug('Cache item removed', { key: cacheKey });
    }

    // Clear entire cache
    clear() {
        this.storage.clear();
        this.hits = 0;
        this.misses = 0;
        logger.debug('Cache cleared');
    }

    // Get cache statistics
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total === 0 ? 0 : (this.hits / total) * 100;

        return {
            size: this.storage.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate.toFixed(2) + '%'
        };
    }

    // Check if item is expired
    isExpired(item) {
        return Date.now() - item.timestamp > item.ttl;
    }

    // Remove oldest items when cache is full
    removeOldest() {
        const entries = Array.from(this.storage.entries());
        const oldest = entries.reduce((oldest, current) => {
            return current[1].timestamp < oldest[1].timestamp ? current : oldest;
        });
        
        this.storage.delete(oldest[0]);
        logger.debug('Removed oldest cache item', { key: oldest[0] });
    }

    // Start cleanup interval
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    // Stop cleanup interval
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    // Cleanup expired items
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, item] of this.storage.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.storage.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('Cache cleanup complete', { itemsRemoved: cleaned });
        }
    }

    // Memoize a function
    memoize(fn, options = {}) {
        const cache = this;
        const ttl = options.ttl || this.ttl;

        return function (...args) {
            const key = options.keyFn 
                ? options.keyFn(...args)
                : JSON.stringify(args);

            const cached = cache.get(key);
            if (cached !== null) {
                return cached;
            }

            const result = fn.apply(this, args);

            // Handle promises
            if (result instanceof Promise) {
                return result.then(value => {
                    cache.set(key, value, ttl);
                    return value;
                });
            }

            cache.set(key, result, ttl);
            return result;
        };
    }
}

// Create singleton instance with default options
const cache = new Cache({
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000 // 1 minute
});

// Memoization decorator
function memoize(options = {}) {
    return function (target, propertyKey, descriptor) {
        if (descriptor.value) {
            descriptor.value = cache.memoize(descriptor.value, options);
        }
        return descriptor;
    };
}

export { cache, memoize }; 