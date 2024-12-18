import { ValidationError } from './logger.js';

// Constants for validation
const VALIDATION_RULES = {
    BPM: {
        min: 20,
        max: 300,
        type: 'number',
        required: true
    },
    SUBDIVISION_FACTOR: {
        min: 0.0001,
        max: 10,
        type: 'number',
        required: true
    },
    SUBDIVISION_NAME: {
        minLength: 1,
        maxLength: 50,
        type: 'string',
        required: true,
        pattern: /^[a-zA-Z0-9\s\-()/.]+$/
    },
    PRESET_NAME: {
        minLength: 1,
        maxLength: 50,
        type: 'string',
        required: true,
        pattern: /^[a-zA-Z0-9\s\-]+$/
    },
    SYSEX_VALUE: {
        min: 0,
        max: 127,
        type: 'number',
        required: true
    }
};

export class Validator {
    // Validate a single value against a rule
    static validateValue(value, rule, fieldName) {
        const errors = [];

        // Check if required
        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${fieldName} is required`);
            return errors;
        }

        // Skip further validation if value is empty and not required
        if (!rule.required && (value === undefined || value === null || value === '')) {
            return errors;
        }

        // Type validation
        if (rule.type === 'number') {
            const num = Number(value);
            if (isNaN(num)) {
                errors.push(`${fieldName} must be a number`);
            } else {
                if (rule.min !== undefined && num < rule.min) {
                    errors.push(`${fieldName} must be at least ${rule.min}`);
                }
                if (rule.max !== undefined && num > rule.max) {
                    errors.push(`${fieldName} must be at most ${rule.max}`);
                }
            }
        } else if (rule.type === 'string') {
            if (typeof value !== 'string') {
                errors.push(`${fieldName} must be a string`);
            } else {
                if (rule.minLength !== undefined && value.length < rule.minLength) {
                    errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
                }
                if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                    errors.push(`${fieldName} must be at most ${rule.maxLength} characters`);
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${fieldName} contains invalid characters`);
                }
            }
        }

        return errors;
    }

    // Validate BPM
    static validateBPM(bpm) {
        const errors = this.validateValue(bpm, VALIDATION_RULES.BPM, 'BPM');
        if (errors.length > 0) {
            throw new ValidationError('Invalid BPM', { errors, value: bpm });
        }
        return true;
    }

    // Validate subdivision
    static validateSubdivision(name, factor) {
        const errors = [
            ...this.validateValue(name, VALIDATION_RULES.SUBDIVISION_NAME, 'Subdivision name'),
            ...this.validateValue(factor, VALIDATION_RULES.SUBDIVISION_FACTOR, 'Subdivision factor')
        ];

        if (errors.length > 0) {
            throw new ValidationError('Invalid subdivision', { errors, values: { name, factor } });
        }
        return true;
    }

    // Validate preset
    static validatePreset(name, bpm, subdivisions = []) {
        const errors = [
            ...this.validateValue(name, VALIDATION_RULES.PRESET_NAME, 'Preset name'),
            ...this.validateValue(bpm, VALIDATION_RULES.BPM, 'BPM')
        ];

        // Validate each subdivision in the preset
        subdivisions.forEach((sub, index) => {
            try {
                this.validateSubdivision(sub.name, sub.factor);
            } catch (error) {
                errors.push(`Subdivision ${index + 1}: ${error.message}`);
            }
        });

        if (errors.length > 0) {
            throw new ValidationError('Invalid preset', { 
                errors, 
                values: { name, bpm, subdivisions } 
            });
        }
        return true;
    }

    // Validate MIDI device
    static validateMIDIDevice(device) {
        if (!device || typeof device.id !== 'string' || typeof device.name !== 'string') {
            throw new ValidationError('Invalid MIDI device', {
                errors: ['Device must have valid id and name properties'],
                value: device
            });
        }
        return true;
    }

    // Validate Sysex parameter
    static validateSysexParameter(parameter, value) {
        const errors = this.validateValue(value, VALIDATION_RULES.SYSEX_VALUE, 'Parameter value');

        if (!['leftDelay', 'rightDelay', 'feedback'].includes(parameter)) {
            errors.push('Invalid parameter type');
        }

        if (errors.length > 0) {
            throw new ValidationError('Invalid Sysex parameter', {
                errors,
                values: { parameter, value }
            });
        }
        return true;
    }

    // Validate theme
    static validateTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            throw new ValidationError('Invalid theme', {
                errors: ['Theme must be either "light" or "dark"'],
                value: theme
            });
        }
        return true;
    }
}

export { VALIDATION_RULES }; 