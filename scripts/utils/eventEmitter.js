export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(listener);
        return () => this.off(event, listener);
    }

    off(event, listener) {
        if (this.events.has(event)) {
            this.events.get(event).delete(listener);
            if (this.events.get(event).size === 0) {
                this.events.delete(event);
            }
        }
    }

    emit(event, ...args) {
        if (this.events.has(event)) {
            for (const listener of this.events.get(event)) {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }
    }

    once(event, listener) {
        const remove = this.on(event, (...args) => {
            remove();
            listener(...args);
        });
    }

    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
} 