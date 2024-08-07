/**
 *
 * @param array The array to remove an item from
 * @param value The item to be removed
 * @returns A new array with the item removed, if found
 */

export const arrayRemove = <T>(array: T[], value: T): T[] =>
  array.filter((item) => item !== value);

arrayRemove([1, 2, 3], 3);
