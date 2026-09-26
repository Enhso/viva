function groupByLength(words) {
  const groups = {};
  for (let i = 0; i < words.length; i++) {
    const len = words[i].length;
    if (groups[len]) {
      groups[len].push(words[i]);
    } else {
      groups[len] = [words[i]];
    }
  }
  return groups;
}
