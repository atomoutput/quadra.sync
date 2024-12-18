/* scripts/sysex.js */

import { EventEmitter } from './utils/eventEmitter.js';

// Sysex Constants
const SYSEX_CONSTANTS = {
    MESSAGES: {
        START: 0xF0,
        END: 0xF7
    },
    MANUFACTURER: {
        ALESIS: [0x00, 0x00, 0x0E]
    },
    DEVICE: {
        QUADRAVERB: 0x02
    },
    COMMANDS: {
        CHANGE_PARAMETER: 0x01,
        REQUEST_PARAMETER: 0x02,
        DUMP_REQUEST: 0x03,
        DUMP_RESPONSE: 0x04
    },
    PARAMETER_GROUPS: {
        GLOBAL: 0x00,
        ROUTING: 0x01,
        DELAY: 0x02,
        REVERB: 0x03,
        EQ: 0x04
    }
};

// Parameter Definitions
const PARAMETER_MAP = {
    // Delay Parameters
    leftDelay: { 
        group: SYSEX_CONSTANTS.PARAMETER_GROUPS.DELAY, 
        msb: 0x2A, 
        lsb: 0x2B,
        range: [0, 2000],
        type: 'msb_lsb'
    },
    rightDelay: { 
        group: SYSEX_CONSTANTS.PARAMETER_GROUPS.DELAY, 
        msb: 0x2C, 
        lsb: 0x2D,
        range: [0, 2000],
        type: 'msb_lsb'
    },
    
    // Reverb Parameters
    reverbType: { 
        group: SYSEX_CONSTANTS.PARAMETER_GROUPS.REVERB, 
        parameter: 0x50,
        range: [0, 7],
        type: 'single',
        values: {
            ROOM: 0,
            HALL: 1,
            PLATE: 2,
            CHAMBER: 3,
            GATED: 4,
            REVERSE: 5,
            SPRING: 6,
            NONLINEAR: 7
        }
    },
    
    // EQ Parameters
    lowEQFrequency: { 
        group: SYSEX_CONSTANTS.PARAMETER_GROUPS.EQ, 
        msb: 0x00, 
        lsb: 0x01,
        range: [20, 20000],
        type: 'msb_lsb'
    }
};

// Sysex Manager Class
export class SysexManager extends EventEmitter {
    constructor() {
        super();
        this.state = {
            outputDevice: null,
            isConnected: false,
            lastSentMessage: null,
            messageQueue: [],
            isProcessingQueue: false
        };
    }

    // Connection Management
    async connect(outputDevice) {
        if (!outputDevice) {
            throw new Error('No MIDI output device provided');
        }

        this.state.outputDevice = outputDevice;
        this.state.isConnected = true;
        this.emit('connected', outputDevice);
    }

    disconnect() {
        this.state.outputDevice = null;
        this.state.isConnected = false;
        this.emit('disconnected');
    }

    // Parameter Validation
    validateParameter(parameter, value) {
        const paramInfo = PARAMETER_MAP[parameter];
        if (!paramInfo) {
            throw new Error(`Invalid parameter: ${parameter}`);
        }

        const [min, max] = paramInfo.range;
        if (value < min || value > max) {
            throw new Error(`Value ${value} is out of range [${min}, ${max}] for parameter ${parameter}`);
        }

        if (paramInfo.type === 'single' && paramInfo.values) {
            const validValues = Object.values(paramInfo.values);
            if (!validValues.includes(value)) {
                throw new Error(`Invalid value for ${parameter}. Must be one of: ${validValues.join(', ')}`);
            }
        }

        return paramInfo;
    }

    // Message Generation
    generateSysexMessage(parameter, value) {
        const paramInfo = this.validateParameter(parameter, value);
        
        if (paramInfo.type === 'msb_lsb') {
            return this.generateMSBLSBMessage(paramInfo, value);
        } else {
            return this.generateSingleMessage(paramInfo, value);
        }
    }

    generateMSBLSBMessage(paramInfo, value) {
        const msb = (value >> 8) & 0x7F;
        const lsb = value & 0x7F;

        // MSB Message
        const msbMessage = [
            SYSEX_CONSTANTS.MESSAGES.START,
            ...SYSEX_CONSTANTS.MANUFACTURER.ALESIS,
            SYSEX_CONSTANTS.DEVICE.QUADRAVERB,
            SYSEX_CONSTANTS.COMMANDS.CHANGE_PARAMETER,
            paramInfo.group,
            paramInfo.msb,
            msb,
            SYSEX_CONSTANTS.MESSAGES.END
        ];

        // LSB Message
        const lsbMessage = [
            SYSEX_CONSTANTS.MESSAGES.START,
            ...SYSEX_CONSTANTS.MANUFACTURER.ALESIS,
            SYSEX_CONSTANTS.DEVICE.QUADRAVERB,
            SYSEX_CONSTANTS.COMMANDS.CHANGE_PARAMETER,
            paramInfo.group,
            paramInfo.lsb,
            lsb,
            SYSEX_CONSTANTS.MESSAGES.END
        ];

        return [this.encode7bit(msbMessage), this.encode7bit(lsbMessage)];
    }

    generateSingleMessage(paramInfo, value) {
        const message = [
            SYSEX_CONSTANTS.MESSAGES.START,
            ...SYSEX_CONSTANTS.MANUFACTURER.ALESIS,
            SYSEX_CONSTANTS.DEVICE.QUADRAVERB,
            SYSEX_CONSTANTS.COMMANDS.CHANGE_PARAMETER,
            paramInfo.group,
            paramInfo.parameter,
            value & 0x7F,
            SYSEX_CONSTANTS.MESSAGES.END
        ];

        return [this.encode7bit(message)];
    }

    // Message Encoding
    encode7bit(data) {
        const result = [];
        let buffer = 0;
        let bits = 0;

        for (const byte of data) {
            buffer |= (byte & 0x7F) << bits;
            bits += 7;

            while (bits >= 8) {
                result.push(buffer & 0x7F);
                buffer >>= 7;
                bits -= 7;
            }
        }

        if (bits > 0) {
            result.push(buffer & 0x7F);
        }

        return result;
    }

    // Message Sending
    async sendMessage(parameter, value) {
        if (!this.state.isConnected) {
            throw new Error('Not connected to any MIDI output device');
        }

        try {
            const messages = this.generateSysexMessage(parameter, value);
            await this.sendMessages(messages);
            
            this.state.lastSentMessage = {
                parameter,
                value,
                timestamp: Date.now()
            };
            
            this.emit('messageSent', { parameter, value });
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async sendMessages(messages) {
        for (const message of messages) {
            await this.state.outputDevice.send(message);
            // Small delay between messages to ensure proper processing
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    // Message Queue Management
    async queueMessage(parameter, value) {
        this.state.messageQueue.push({ parameter, value });
        if (!this.state.isProcessingQueue) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.state.isProcessingQueue || this.state.messageQueue.length === 0) {
            return;
        }

        this.state.isProcessingQueue = true;
        
        try {
            while (this.state.messageQueue.length > 0) {
                const { parameter, value } = this.state.messageQueue.shift();
                await this.sendMessage(parameter, value);
            }
        } finally {
            this.state.isProcessingQueue = false;
        }
    }

    // Utility Methods
    getParameterInfo(parameter) {
        return PARAMETER_MAP[parameter];
    }

    getAllParameters() {
        return Object.keys(PARAMETER_MAP).map(key => ({
            name: key,
            ...PARAMETER_MAP[key]
        }));
    }

    // Cleanup
    cleanup() {
        this.disconnect();
        this.state.messageQueue = [];
        this.removeAllListeners();
    }
}

// Create and export Sysex instance
export const sysex = new SysexManager();

// Initialize Sysex
export async function initializeSysex() {
    return sysex;
}