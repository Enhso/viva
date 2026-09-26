function removeDuplicates(arr) {
  const result = [];
  arr.forEach((item) => {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  });
  return result;
}
