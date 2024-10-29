import { logger } from '../utils/logger.js';

let inactivityTimeout = null;

/**
 * Sets a timer to automatically end the scrying session after a period of inactivity.
 * @param {Function} onTimeout - The function to execute if the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function setInactivityTimer(onTimeout, timeoutDuration) {
  clearInactivityTimer();
  inactivityTimeout = setTimeout(() => {
    logger(`Inactivity limit reached: Ending session after ${timeoutDuration / 60000} minutes.`, 'info');
    onTimeout(); // Execute the provided callback function when the timer expires
  }, timeoutDuration);
}

/**
 * Resets the inactivity timer, allowing it to be restarted each time audio activity is detected.
 * @param {Function} onTimeout - The function to execute if the timer expires.
 * @param {number} timeoutDuration - Duration in milliseconds before the timer expires.
 */
export function resetInactivityTimer(onTimeout, timeoutDuration) {
  logger('Resetting inactivity timer due to audio activity.', 'info');
  setInactivityTimer(onTimeout, timeoutDuration);
}

/**
 * Clears the inactivity timer, preventing the onTimeout function from being executed.
 */
export function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
    logger('Inactivity timer cleared.', 'info');
  }
}