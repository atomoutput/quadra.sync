// Animation utility for UI feedback and transitions
export const animations = {
    // BPM visualization
    updateBPMVisualization(bpm) {
        const tempoIndicator = document.querySelector('.tempo-indicator');
        if (tempoIndicator) {
            const interval = 60000 / bpm; // Convert BPM to milliseconds
            tempoIndicator.style.animation = `pulse ${interval}ms infinite`;
        }
    },

    // Loading states
    showLoadingState(element, isLoading) {
        if (element) {
            element.classList.toggle('loading', isLoading);
            element.disabled = isLoading;
        }
    },

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification notification--${type}`;
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    },

    // Status indicator
    pulseStatusDot(element) {
        if (element) {
            element.classList.add('pulse');
            setTimeout(() => element.classList.remove('pulse'), 1000);
        }
    },

    // Delay time cards
    animateDelayTimeCard(card) {
        if (card) {
            card.classList.add('fade-in');
            card.addEventListener('animationend', () => {
                card.classList.remove('fade-in');
            }, { once: true });
        }
    },

    // Modal transitions
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    },

    // Theme transition
    applyTheme(theme) {
        document.body.classList.add('theme-transition');
        document.body.dataset.theme = theme;
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    },

    // Copy feedback
    showCopyFeedback(element) {
        if (element) {
            const originalText = element.textContent;
            element.textContent = 'Copied!';
            element.classList.add('copied');
            
            setTimeout(() => {
                element.textContent = originalText;
                element.classList.remove('copied');
            }, 1500);
        }
    }
}; 