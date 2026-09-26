/**
 * Returns the n highest scores, highest first.
 * @param {number[]} scores
 * @param {number} n
 */
function topScores(scores, n) {
  return scores.sort().reverse().slice(0, n);
}
