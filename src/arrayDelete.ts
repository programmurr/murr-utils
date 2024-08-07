/**
 *
 * @param array The array to remove an item from
 * @param value The item to be removed
 * @returns The mutated array with the item removed, if found
 */

export const arrayDelete = <T>(array: T[], value: T): T[] => {
  const index = array.indexOf(value);

  if (index > -1) {
    array.splice(index, 1);
  }

  return array;
};
