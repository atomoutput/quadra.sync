/* scripts/install.js */

import { showNotification } from './ui.js';

// DOM Element
const installBtn = document.getElementById('install-btn');

// State Variable
let deferredPrompt;

// Function to handle the beforeinstallprompt event
function handleInstallPrompt(e) {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'flex'; // Show the install button
  showNotification('You can install quadra.calc as an app!', 'success');
}

// Function to handle the install button click
async function handleInstallClick() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showNotification('App installed successfully!', 'success');
    } else {
      showNotification('App installation canceled.', 'error');
    }
    deferredPrompt = null;
    installBtn.style.display = 'none';
  }
}

// Function to initialize install button functionality
function init() {
  window.addEventListener('beforeinstallprompt', handleInstallPrompt);
  installBtn.addEventListener('click', handleInstallClick);
}

// Export the init function
export { init };