/* scripts/utils/performance.js */

import { Logger } from './logger.js';

const logger = new Logger('Performance');

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.marks = new Map();
        this.observers = new Set();
        this.isEnabled = true;

        // Initialize Performance Observer
        if (typeof PerformanceObserver !== 'undefined') {
            const observer = new PerformanceObserver(this.handlePerformanceEntries.bind(this));
            observer.observe({ entryTypes: ['measure', 'mark', 'longtask', 'paint'] });
            this.observer = observer;
        }
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    // Start timing an operation
    startOperation(name) {
        if (!this.isEnabled) return;

        const markName = `${name}-start`;
        performance.mark(markName);
        this.marks.set(name, markName);
    }

    // End timing an operation
    endOperation(name) {
        if (!this.isEnabled) return;

        const startMark = this.marks.get(name);
        if (!startMark) {
            logger.warn('No start mark found for operation', { name });
            return;
        }

        const endMark = `${name}-end`;
        performance.mark(endMark);
        
        try {
            performance.measure(name, startMark, endMark);
            this.marks.delete(name);
            
            // Cleanup marks
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
        } catch (error) {
            logger.error('Error measuring performance', error, { name });
        }
    }

    // Track a metric
    trackMetric(name, value) {
        if (!this.isEnabled) return;

        const metrics = this.metrics.get(name) || [];
        metrics.push({
            value,
            timestamp: Date.now()
        });

        // Keep only last 100 measurements
        if (metrics.length > 100) {
            metrics.shift();
        }

        this.metrics.set(name, metrics);
        this.notifyObservers({ type: 'metric', name, value });
    }

    // Get metrics for a specific operation
    getMetrics(name) {
        return this.metrics.get(name) || [];
    }

    // Get average metric value
    getAverageMetric(name) {
        const metrics = this.getMetrics(name);
        if (metrics.length === 0) return 0;

        const sum = metrics.reduce((acc, curr) => acc + curr.value, 0);
        return sum / metrics.length;
    }

    // Subscribe to performance updates
    subscribe(callback) {
        this.observers.add(callback);
        return () => this.observers.delete(callback);
    }

    // Notify observers of performance events
    notifyObservers(event) {
        this.observers.forEach(observer => observer(event));
    }

    // Handle performance entries from PerformanceObserver
    handlePerformanceEntries(list) {
        list.getEntries().forEach(entry => {
            switch (entry.entryType) {
                case 'measure':
                    this.trackMetric(entry.name, entry.duration);
                    break;
                case 'longtask':
                    logger.warn('Long task detected', {
                        duration: entry.duration,
                        startTime: entry.startTime
                    });
                    break;
                case 'paint':
                    this.trackMetric(`paint-${entry.name}`, entry.startTime);
                    break;
            }
        });
    }

    // Get performance report
    getReport() {
        const report = {
            metrics: {},
            averages: {},
            timestamp: Date.now()
        };

        this.metrics.forEach((values, name) => {
            report.metrics[name] = values;
            report.averages[name] = this.getAverageMetric(name);
        });

        return report;
    }

    // Clear all metrics
    clearMetrics() {
        this.metrics.clear();
        this.marks.clear();
        performance.clearMarks();
        performance.clearMeasures();
    }

    // Measure function execution time
    measureFunction(func, name) {
        return (...args) => {
            if (!this.isEnabled) return func(...args);

            this.startOperation(name);
            try {
                const result = func(...args);
                if (result instanceof Promise) {
                    return result.finally(() => this.endOperation(name));
                }
                this.endOperation(name);
                return result;
            } catch (error) {
                this.endOperation(name);
                throw error;
            }
        };
    }

    // Create a decorator for measuring method execution time
    measureMethod(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const methodName = propertyKey;

        descriptor.value = this.measureFunction(originalMethod, methodName);
        return descriptor;
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Performance measurement decorator
function measure(target, propertyKey, descriptor) {
    return performanceMonitor.measureMethod(target, propertyKey, descriptor);
}

export { performanceMonitor, measure }; 