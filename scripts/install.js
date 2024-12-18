/* scripts/install.js */

import { EventEmitter } from './utils/eventEmitter.js';

// Install Constants
const INSTALL_CONSTANTS = {
    DISPLAY: {
        SHOW: 'flex',
        HIDE: 'none'
    },
    EVENTS: {
        BEFORE_INSTALL: 'beforeinstallprompt',
        APP_INSTALLED: 'appinstalled'
    },
    OUTCOMES: {
        ACCEPTED: 'accepted',
        DISMISSED: 'dismissed'
    },
    MESSAGES: {
        AVAILABLE: 'You can install quadra.sync as an app!',
        SUCCESS: 'App installed successfully!',
        CANCELED: 'App installation canceled.',
        NOT_AVAILABLE: 'App installation not available.',
        ERROR: 'Error during app installation:'
    }
};

// Install Manager Class
export class InstallManager extends EventEmitter {
    constructor() {
        super();
        this.state = {
            isInitialized: false,
            isInstallable: false,
            isInstalled: false,
            deferredPrompt: null
        };

        this.elements = {
            installBtn: null
        };

        // Bind methods
        this.handleBeforeInstallPrompt = this.handleBeforeInstallPrompt.bind(this);
        this.handleAppInstalled = this.handleAppInstalled.bind(this);
        this.handleInstallClick = this.handleInstallClick.bind(this);
    }

    // Initialization
    async initialize() {
        try {
            this.validateElements();
            this.setupEventListeners();
            
            // Check if already installed
            if (window.matchMedia('(display-mode: standalone)').matches) {
                this.state.isInstalled = true;
            }

            this.state.isInitialized = true;
            this.emit('initialized', this.state);
        } catch (error) {
            console.error('Failed to initialize install manager:', error);
            this.emit('error', error);
            throw error;
        }
    }

    validateElements() {
        this.elements.installBtn = document.getElementById('install-btn');
        if (!this.elements.installBtn) {
            throw new Error('Install button element not found');
        }
    }

    setupEventListeners() {
        window.addEventListener(INSTALL_CONSTANTS.EVENTS.BEFORE_INSTALL, this.handleBeforeInstallPrompt);
        window.addEventListener(INSTALL_CONSTANTS.EVENTS.APP_INSTALLED, this.handleAppInstalled);
        this.elements.installBtn.addEventListener('click', this.handleInstallClick);

        // Listen for display mode changes
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            this.state.isInstalled = e.matches;
            this.emit('displayModeChanged', { isStandalone: e.matches });
        });
    }

    // Event Handlers
    handleBeforeInstallPrompt(event) {
        // Prevent the default browser install prompt
        event.preventDefault();

        // Store the event for later use
        this.state.deferredPrompt = event;
        this.state.isInstallable = true;

        // Show the install button
        this.showInstallButton();

        this.emit('installAvailable', {
            platform: event.platforms,
            userChoice: event.userChoice
        });
    }

    handleAppInstalled(event) {
        this.state.isInstalled = true;
        this.state.isInstallable = false;
        this.state.deferredPrompt = null;

        // Hide the install button
        this.hideInstallButton();

        this.emit('installed', {
            timestamp: Date.now(),
            event
        });
    }

    async handleInstallClick() {
        if (!this.state.deferredPrompt) {
            this.emit('error', new Error(INSTALL_CONSTANTS.MESSAGES.NOT_AVAILABLE));
            return;
        }

        try {
            // Show the install prompt
            this.state.deferredPrompt.prompt();

            // Wait for the user's choice
            const { outcome } = await this.state.deferredPrompt.userChoice;
            
            // Handle the outcome
            if (outcome === INSTALL_CONSTANTS.OUTCOMES.ACCEPTED) {
                this.emit('installAccepted');
            } else {
                this.emit('installDismissed');
            }

            // Clear the deferred prompt
            this.state.deferredPrompt = null;
            this.state.isInstallable = false;

            // Hide the install button
            this.hideInstallButton();
        } catch (error) {
            console.error(INSTALL_CONSTANTS.MESSAGES.ERROR, error);
            this.emit('error', error);
        }
    }

    // UI Management
    showInstallButton() {
        this.elements.installBtn.style.display = INSTALL_CONSTANTS.DISPLAY.SHOW;
        this.emit('buttonShown');
    }

    hideInstallButton() {
        this.elements.installBtn.style.display = INSTALL_CONSTANTS.DISPLAY.HIDE;
        this.emit('buttonHidden');
    }

    // State Management
    getState() {
        return { ...this.state };
    }

    isInstallable() {
        return this.state.isInstallable;
    }

    isInstalled() {
        return this.state.isInstalled;
    }

    // Cleanup
    cleanup() {
        window.removeEventListener(INSTALL_CONSTANTS.EVENTS.BEFORE_INSTALL, this.handleBeforeInstallPrompt);
        window.removeEventListener(INSTALL_CONSTANTS.EVENTS.APP_INSTALLED, this.handleAppInstalled);
        this.elements.installBtn.removeEventListener('click', this.handleInstallClick);

        this.state.isInitialized = false;
        this.state.isInstallable = false;
        this.state.deferredPrompt = null;
        this.removeAllListeners();
    }
}

// Create and export Install Manager instance
export const installManager = new InstallManager();

// Initialize Install Manager
export async function initializeInstall() {
    await installManager.initialize();
    return installManager;
}