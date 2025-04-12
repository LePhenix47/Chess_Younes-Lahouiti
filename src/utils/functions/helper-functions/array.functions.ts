import {
  areObjectsEqual,
  getPrototypeOf,
  isExactlyAnObject,
} from "./object.functions";

/**
 * Creates a new deep copied array or set of the provided value using `Array.from()`
 *
 * @param {any} arrayToCopy - The array or list to copy
 *
 * @returns {any[]} - The new array containing the copied elements
 */
export function copyArray<DataType>(
  arrayToCopy: ArrayLike<DataType>
): Array<DataType> {
  // Arrays or sets are copyable with `Array.from()`
  return Array.from(arrayToCopy);
}

/**
 * Checks if the provided argument value is an array using `Array.isArray()`
 *
 * @param {any} value - The value to check.
 *
 * @returns {boolean} - True if the value is an array, false otherwise.
 */
export function isExactlyAnArray<DataType>(value: DataType): boolean {
  return Array.isArray(value);
}

/**
 * Checks if two arrays are exactly the same, including nested arrays and objects.
 *
 * **⚠ WARNING:** The arrays must be sorted beforehand in order for the results to be accurate
 *
 * @param {any[]} arr1 - The first array to compare.
 * @param {any[]} arr2 - The second array to compare.
 * @returns {boolean} - Returns true if the arrays are exactly the same, otherwise false.
 */
export function areArraysEqual<DataType>(
  arr1: DataType[],
  arr2: DataType[]
): boolean {
  const hasInvalidArguments: boolean =
    !arr1 || !arr2 || !isExactlyAnArray(arr1) || !isExactlyAnArray(arr2);
  // Check if either argument is falsy or not an array
  if (hasInvalidArguments) {
    const arr1Prototype = `[${typeof arr1} ${getPrototypeOf(arr1)}]`;
    const arr2Prototype = `[${typeof arr2} ${getPrototypeOf(arr2)}]`;
    throw new TypeError(
      `Invalid input, expected both arguments to be non-null arrays, instead got: \n
     arr1: ${arr1Prototype}, arr2: ${arr2Prototype}`
    );
  }

  const haveDifferentLengths: boolean = arr1.length !== arr2.length;
  // Check if arrays have the same length
  if (haveDifferentLengths) {
    return false;
  }

  // Compare array elements
  for (let i = 0; i < arr1.length; i++) {
    const element1: any = arr1[i];
    const element2: any = arr2[i];

    // Check if elements are objects or arrays
    const areBothArrays: boolean =
      isExactlyAnArray(element1) && isExactlyAnArray(element2);
    if (areBothArrays) {
      const haveDifferentArrayValues = !areArraysEqual(element1, element2);
      if (haveDifferentArrayValues) {
        return false;
      }

      continue;
    }

    const areBothObjects: boolean =
      isExactlyAnObject(element1) && isExactlyAnObject(element2);
    if (areBothObjects) {
      const haveDifferentObjectValues = !areObjectsEqual(element1, element2);
      if (haveDifferentObjectValues) {
        return false;
      }

      continue;
    }

    const haveDifferentValues: boolean = element1 !== element2;
    if (haveDifferentValues) {
      return false;
    }
  }

  return true;
}

/**
 * Removes elements from an array and optionally inserts new elements in their place using the `.splice()` method.
 *
 * @param {any[]} originalArray - The array to modify.
 * @param {number} startIndex - The index to start removing elements from.
 * @param {number} deleteCount - The number of elements to remove.
 * @param {...any} [items] - The elements to insert into the array.
 *
 * @returns {any[]} - The updated array after the modifications.
 */
export function toSpliced<DataType>(
  originalArray: DataType[],
  startIndex: number,
  deleteCount: number,
  ...items: any[]
): any[] {
  // @ts-ignore, will need to be changed from `.splice()` to a `.toSpliced()`
  return originalArray.splice(startIndex, deleteCount, ...items);
}

/**
 * Joins the elements of an array into a string using the specified character as the separator using the `.join()` method
 * @param {any[]} array - The array to join.
 * @param {string} [char=""] - The character used as the separator. Defaults to an empty string.
 * @returns {string} The joined string.
 */
export function joinArrayOnChar<DataType>(
  array: DataType[],
  char: string = ""
): string {
  return array.join(char);
}

/**
 * IMPORTANT: As of 31/05/2023, JS will have new NON-MUTABLE array methods:
 *
 * toSorted() for sort()
 * toSpliced() for splice()
 * toReversed() for reverse()
 *
 * So we won't need to make a copy of the array before performing the mutation
 *
 * Source:
 * "I Waited 15 Years For These New Array Methods" by Web Dev Simplified:
 * @link https://www.youtube.com/watch?v=3CBD5JZJJKw
 */
