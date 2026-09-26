/**
 * Adds up every whole number from start to end, inclusive.
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function sumRange(start, end) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += i;
  }
  return total;
}
