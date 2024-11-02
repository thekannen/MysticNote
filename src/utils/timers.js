import { logger, verboseLog } from '../utils/logger.js';

let inactivityTimeout = null;
let isInactivityTimerActive = false;

/**
 * Sets a timer to automatically end the scrying session after a period of inactivity.
 * @param {Function} onTimeout - The function to execute if the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function setInactivityTimer(onTimeout, timeoutDuration) {
  // Ensure any existing timer is cleared
  clearInactivityTimer();

  verboseLog(`Setting inactivity timer to ${timeoutDuration} ms.`);

  inactivityTimeout = setTimeout(() => {
    logger(`Inactivity limit reached: Ending session after ${timeoutDuration / 60000} minutes.`, 'info');
    onTimeout();
    isInactivityTimerActive = false; // Reset flag after timeout is reached
  }, timeoutDuration);

  isInactivityTimerActive = true;
  verboseLog(`Inactivity timer set. isInactivityTimerActive=${isInactivityTimerActive}`);
}

/**
 * Resets the inactivity timer. Starts a new timer if no timer is currently active.
 * @param {Function} onTimeout - The function to execute if the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function resetInactivityTimer(onTimeout, timeoutDuration) {
  if (!isInactivityTimerActive) {
    verboseLog('No active inactivity timer found. Setting a new timer.');
    setInactivityTimer(onTimeout, timeoutDuration);
  } else {
    // verboseLog('Resetting existing inactivity timer due to audio activity.');
    clearTimeout(inactivityTimeout); // Clear existing timer without altering the active state
    inactivityTimeout = setTimeout(() => {
      logger(`Inactivity limit reached: Ending session after ${timeoutDuration / 60000} minutes.`, 'info');
      onTimeout();
      isInactivityTimerActive = false;
    }, timeoutDuration);
  }
}

/**
 * Clears the inactivity timer, preventing the onTimeout function from being executed.
 */
export function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
    isInactivityTimerActive = false;
    // verboseLog('Inactivity timer cleared.');
  } else {
    verboseLog('Attempted to clear inactivity timer, but no timer was active.');
  }
}
