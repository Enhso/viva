function makeCounter(start = 0) {
  let count = start;
  return function () {
    count++;
    return count;
  };
}
