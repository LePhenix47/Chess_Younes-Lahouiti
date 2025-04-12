import { splitString } from "./string.functions";

/**
 * Checks if a given file has the expected type.
 *
 * @param {File} fileUploaded - The file to check its type.
 * @param {string} typeExpected - The expected type of the file.
 *
 * @returns {boolean} - A Promise that resolves to a boolean indicating whether the file has the expected type or not.
 */
export function checkFileType(
  fileUploaded: File,
  typeExpected: string
): boolean {
  const { lastModified, name, type, size }: File = fileUploaded;

  const fileType: string = splitString(type, "/")[0];

  return fileType === typeExpected;
}

/**
 * Converts a File object to a base64 string.
 *
 * @param {File} fileToConvert - The File object to convert.
 *
 * @returns {Promise<string>} - A Promise that resolves with the base64 string representation of the file.
 */
export function fileToBase64String(fileToConvert: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    //Allows the conversion of binary data, in this case audio files, into a text format
    reader.readAsDataURL(fileToConvert);

    // When the audio file is loaded, extract the base64 string and resolve the promise with it
    reader.addEventListener("load", () => {
      const base64MediaString: string | ArrayBuffer = reader.result;

      const isNotString: boolean = typeof base64MediaString !== "string";
      if (isNotString) {
        reject("Error: Base64 string not found.");
        return;
      }

      //@ts-ignore
      resolve(base64MediaString);
    });

    // If there's an error while reading the audio file, reject the promise with an error message
    reader.addEventListener("error", () => {
      reject("Error: Failed to read audio file.");
    });
  });
}

/**
 * Converts a File object to a Blob URL.
 *
 * @param {File} fileToConvert - The File object to convert to a Blob URL.
 *
 * @returns {string} The Blob URL representing the File object.
 */
export function fileToBlobUrl(fileToConvert: File): string {
  return URL.createObjectURL(fileToConvert);
}

/**
 * Invalidates a Blob URL by revoking the object URL, freeing cache memory
 *
 * @param {string} videoSource - The Blob URL to be invalidated.
 * @returns {void}
 */
export function invalidateBlobUrl(videoSource: string): void {
  URL.revokeObjectURL(videoSource);
}
