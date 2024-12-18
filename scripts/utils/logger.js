module.exports = class Logger {
    constructor(module) {
        this.module = module;
        this.timeLabels = new Map();
    }

    _formatMessage(level, message) {
        return `[${level}][${this.module}] ${message}`;
    }

    debug(message) {
        console.debug(this._formatMessage('DEBUG', message));
    }

    info(message) {
        console.info(this._formatMessage('INFO', message));
    }

    warn(message) {
        console.warn(this._formatMessage('WARN', message));
    }

    error(message, error = null) {
        const errorMessage = error ? `${message}: ${error.message}` : message;
        console.error(this._formatMessage('ERROR', errorMessage));
        if (error?.stack) {
            console.error(error.stack);
        }
    }

    time(label) {
        const timeLabel = `${this.module}:${label}`;
        this.timeLabels.set(label, performance.now());
        console.time(timeLabel);
    }

    timeEnd(label) {
        const timeLabel = `${this.module}:${label}`;
        const startTime = this.timeLabels.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.timeLabels.delete(label);
            console.timeEnd(timeLabel);
            return duration;
        }
        return 0;
    }

    group(label) {
        console.group(this._formatMessage('GROUP', label));
    }

    groupEnd() {
        console.groupEnd();
    }

    table(data) {
        console.table(data);
    }
}; 