
/**
 * Plays the audio element
 * @param {HTMLAudioElement} audio - The HTML audio element to be played
 */
export function playAudio(audio: HTMLAudioElement) {
  audio.play();
}

/**
 * Pauses the audio element
 * @param {HTMLAudioElement} audio - The HTML audio element to be paused
 */
export function pauseAudio(audio: HTMLAudioElement) {
  audio.pause();
}

/**
 * Sets the volume of an audio element
 * @param {HTMLAudioElement} audio - The audio element to set the volume for
 * @param {number} volume - The volume level to set (between 0 and 1)
 */
export function setAudioVolume(audio: HTMLAudioElement, volume: number) {
  audio.volume = volume;
}

/**
 * Mutes the volume of an audio element
 * @param {HTMLAudioElement} audio - The audio element to mute
 *
 */
export function muteAudio(audio: HTMLAudioElement) {
  audio.muted = true;
}

/**
 * Sets to a specific timestamp in an audio element
 * @param {HTMLAudioElement} audio - The audio element to seek
 * @param {number} time - The time to seek to (in seconds)
 */
export function setTimestampAudio(audio: HTMLAudioElement, time: number) {
  audio.currentTime = time;
}

/**
 * Returns the current time (in seconds) of an audio element
 * @param {HTMLAudioElement} audio - The audio element to get the current time from
 * @returns {number} The current time of the audio element (in seconds)
 */
export function getAudioCurrentTime(audio: HTMLAudioElement): number {
  return audio.currentTime;
}

/**
 * Gets the duration of an audio file in seconds
 *
 * @param {HTMLAudioElement} audio - The audio element to get the duration from
 * @returns {number} The duration of the audio file in seconds (returns 0 if it's not available)
 */
export function getAudioTotalTime(audio: HTMLAudioElement): number {
  return isNaN(audio.duration) ? -1 : audio.duration;
}

/**
 * Sets the playback speed of an audio element.
 *
 * @param {HTMLAudioElement} audio - The audio element.
 * @param {number} newPlaybackRate - The new playback rate to set for the audio.
 * A value of 1.0 represents normal speed. Values less than 1.0 slow down the playback,
 * while values greater than 1.0 speed it up.
 *
 * **The playback rate should be within the range of 0.5 to 2.0** for most browsers, but actual
 * limits may vary depending on the browser and audio codec support.
 * @returns {void}
 */
export function setAudioSpeed(
  audio: HTMLAudioElement,
  newPlaybackRate: number
): void {
  audio.playbackRate = newPlaybackRate;
}

/**
 * Checks if an audio element is paused
 * @param {HTMLAudioElement} audio - The HTMLAudioElement to check
 * @returns Boolean value telling whether or not the audio is paused
 */
export function checkIfAudioPaused(audio: HTMLAudioElement) {
  return audio.paused;
}

/**
 * Checks if an audio element has ended
 * @param {HTMLAudioElement} audio - The HTMLAudioElement to check
 * @returns Boolean value telling whether or not the audio has ended
 */
export function checkIfAudioEnded(audio: HTMLAudioElement) {
  return audio.ended;
}

/**
 * Formats a given amount of seconds into a time object containing formatted hours, minutes, and seconds
 * If the time is over an hour but under 10 minutes, the minutes are also formatted
 *
 * @param {number} seconds - The amount of seconds to format
 * @returns {{seconds: string, minutes: string, hours: string}} - A time object containing formatted hours, minutes, and seconds
 */
export function formatTimeValues(seconds: number): {
  seconds: string;
  minutes: string;
  hours: string;
} {
  // Calculate the unformatted minutes and seconds
  const unformattedSeconds = Math.trunc(seconds % 60);
  const unformattedMinutes = Math.trunc((seconds / 60) % 60);
  const unformattedHours = Math.trunc(seconds / 3600);

  // Format the seconds
  const formattedSeconds =
    unformattedSeconds >= 10
      ? unformattedSeconds.toString()
      : `0${unformattedSeconds}`;

  // Format the minutes
  let formattedMinutes = unformattedMinutes.toString();

  // Format the hours
  const formattedHours = unformattedHours.toString();

  // Check if the time is over an hour and has minutes under 10 minutes
  const isOverAnHour = unformattedHours > 0;
  const isUnderTenMinutes = unformattedMinutes < 10;

  // If the time is over an hour but under 10 minutes, format the minutes
  if (isOverAnHour && isUnderTenMinutes) {
    formattedMinutes =
      unformattedMinutes > 10
        ? unformattedMinutes.toString()
        : `0${unformattedMinutes}`;
  }
  // Return the formatted time object
  return {
    hours: formattedHours,
    minutes: formattedMinutes,
    seconds: formattedSeconds,
  };
}
