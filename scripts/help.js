/* scripts/help.js */

// DOM Elements
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpModal = document.getElementById('close-help-modal');

// Function to open the help modal
function openHelpModal() {
  helpModal.style.display = 'block';
  helpModal.setAttribute('aria-hidden', 'false');
}

// Function to close the help modal
function closeHelpModal() {
  helpModal.style.display = 'none';
  helpModal.setAttribute('aria-hidden', 'true');
}

// Function to initialize help modal functionality
function init() {
  helpBtn.addEventListener('click', openHelpModal);
  closeHelpModal.addEventListener('click', closeHelpModal);

  // Close modal when clicking outside of the modal content
  window.addEventListener('click', (event) => {
    if (event.target === helpModal) {
      closeHelpModal();
    }
  });
}

// Export the init function
export { init };