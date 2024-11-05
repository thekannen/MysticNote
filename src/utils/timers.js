import { logger, verboseLog } from '../utils/logger.js';

let inactivityTimeout = null;

/**
 * Sets or resets the inactivity timer to automatically end the session after a period of inactivity.
 * @param {Function} onTimeout - The function to execute when the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function setInactivityTimer(onTimeout, timeoutDuration) {
  if (typeof onTimeout !== 'function') {
    throw new TypeError('onTimeout must be a function.');
  }

  if (typeof timeoutDuration !== 'number' || timeoutDuration <= 0) {
    throw new TypeError('timeoutDuration must be a positive number.');
  }

  // Clear any existing timer
  clearInactivityTimer();

  verboseLog(`Setting inactivity timer to ${timeoutDuration} ms.`);

  inactivityTimeout = setTimeout(async () => {
    try {
      logger(
        `Inactivity limit reached: Ending session after ${timeoutDuration / 60000} minutes.`,
        'info'
      );
      await onTimeout();
    } catch (error) {
      logger(`Error in onTimeout function: ${error.message}`, 'error');
    } finally {
      inactivityTimeout = null;
    }
  }, timeoutDuration);
}

/**
 * Resets the inactivity timer. If no timer is active, it sets a new one.
 * @param {Function} onTimeout - The function to execute when the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function resetInactivityTimer(onTimeout, timeoutDuration) {
  verboseLog('Resetting inactivity timer.');

  setInactivityTimer(onTimeout, timeoutDuration);
}

/**
 * Clears the inactivity timer, preventing the onTimeout function from being executed.
 */
export function clearInactivityTimer() {
  if (inactivityTimeout !== null) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
    verboseLog('Inactivity timer cleared.');
  } else {
    verboseLog('No inactivity timer to clear.');
  }
}

/**
 * Checks if the inactivity timer is currently active.
 * @returns {boolean} True if the timer is active, false otherwise.
 */
export function isInactivityTimerActive() {
  return inactivityTimeout !== null;
}