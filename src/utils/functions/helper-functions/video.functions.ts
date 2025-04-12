/**
 * Plays the video element
 * @param {HTMLVideoElement} video - The HTML video element to be played
 */
export function playVideo(video: HTMLVideoElement): void {
  video.play();
}

/**
 * Pauses the video element
 * @param {HTMLVideoElement} video - The HTML video element to be paused
 */
export function pauseVideo(video: HTMLVideoElement): void {
  video.pause();
}

/**
 * Sets the volume of a video element
 * @param {HTMLVideoElement} video - The video element to set the volume for
 * @param {number} volume - The volume level to set (between 0 and 1)
 */
export function setVideoVolume(video: HTMLVideoElement, volume: number): void {
  video.volume = volume;
}

/**
 * Mutes the volume of a video element
 * @param {HTMLVideoElement} video - The video element to set the volume for
 *
 */
export function muteVolume(video: HTMLVideoElement): void {
  video.muted = true;
}

/**
 * Sets to a specific timestamp in a video element
 * @param {HTMLVideoElement} video - The video element to seek
 * @param {number} time - The time to seek to (in seconds)
 */
export function setTimestampVideo(video: HTMLVideoElement, time: number): void {
  video.currentTime = time;
}

/**
 * Returns the current time (in seconds) of a video element
 * @param {HTMLVideoElement} video - The video element to get the current time from
 * @returns {number} The current time of the video element (in seconds)
 */
export function getVideoCurrentTime(video: HTMLVideoElement): number {
  return video.currentTime;
}

/**
 * Gets the duration of a video file in seconds
 *
 * @param {HTMLVideoElement} video - The video element to get the duration from
 * @returns {number} The duration of the video file in seconds (returns 0 if it's not available)
 */
export function getVideoTotalTime(video: HTMLVideoElement): number {
  return isNaN(video.duration) ? -1 : video.duration;
}
/**
 * Sets the playback speed of a video element.
 *
 * @param {HTMLVideoElement} video - The video element.
 * @param {number} newPlaybackRate - The new playback rate to set for the video.
 * A value of 1.0 represents normal speed. Values less than 1.0 slow down the playback,
 * while values greater than 1.0 speed it up.
 *
 * **The playback rate should be within the range of 0.5 to 2.0** for most browsers, but actual
 * limits may vary depending on the browser and video codec support.
 * @returns {void}
 */
export function setVideoSpeed(
  video: HTMLVideoElement,
  newPlaybackRate: number
): void {
  video.playbackRate = newPlaybackRate;
}

/**
 * Checks if a video element has paused
 * @param {HTMLVideoElement} video - The HTMLVideoElement to check
 * @returns Boolean value telling whether or not the video is paused
 */
export function checkIfVideoPaused(video: HTMLVideoElement): boolean {
  return video.paused;
}

/**
 * Checks if a video element has ended
 * @param {HTMLVideoElement} video - The HTMLVideoElement to check
 * @returns Boolean value telling whether or not the video has ended
 */
export function checkIfVideoEnded(video: HTMLVideoElement): boolean {
  return video.ended;
}

/**
 * Formats a given amount of seconds into a time object containing formatted hours, minutes and seconds
 * If the time is over an hour but under 10 minutes, the minutes are also formatted
 *
 * @param {number} seconds - The amount of seconds to format
 * @returns {{seconds: string, minutes: string, hours: string}} - A time object containing formatted hours, minutes and seconds
 */
export function formatTimeValues(seconds: number): {
  seconds: string;
  minutes: string;
  hours: string;
} {
  // Calculate the unformatted minutes and seconds
  const unformattedSeconds: number = Math.trunc(seconds % 60);
  const unformattedMinutes: number = Math.trunc((seconds / 60) % 60);
  const unformattedHours: number = Math.trunc(seconds / 3_600);

  // Format the seconds
  const formattedSeconds: string =
    unformattedSeconds >= 10
      ? unformattedSeconds.toString()
      : `0${unformattedSeconds}`;

  // Format the minutes
  let formattedMinutes: string = unformattedMinutes.toString();

  //Format the hours
  const formattedHours: string = unformattedHours.toString();

  // Check if the time's hour is over an hour and has minutes under 10 minutes
  const isOverAnHour: boolean = unformattedHours > 0;
  const isUnderTenMinutes: boolean = unformattedMinutes < 10;

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
