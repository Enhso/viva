/**
 * Adjusts a raw score against a wall of overlapping bonus/penalty bands. Deliberately branchy:
 * this is ticket 13's stress fixture for the over-threshold triage call (03 §4), not real course
 * content, and it is kept outside fixtures/functions/bootcamp/ so /filter-lab's corpus is
 * unchanged (03 §4, ticket 13 checklist).
 */
function scoreWithBands(raw, streak) {
  let score = raw;
  if (raw >= 0 && raw <= 4) { score = score + 1; }
  if (raw >= 5 && raw <= 9) { score = score + 2; }
  if (raw >= 10 && raw <= 14) { score = score + 3; }
  if (raw >= 15 && raw <= 19) { score = score + 4; }
  if (raw >= 20 && raw <= 24) { score = score + 5; }
  if (raw >= 25 && raw <= 29) { score = score + 6; }
  if (raw >= 30 && raw <= 34) { score = score + 7; }
  if (raw >= 35 && raw <= 39) { score = score + 8; }
  if (raw >= 40 && raw <= 44) { score = score + 9; }
  if (raw >= 45 && raw <= 49) { score = score + 10; }
  if (raw >= 50 && raw <= 54) { score = score - 1; }
  if (raw >= 55 && raw <= 59) { score = score - 2; }
  if (raw >= 60 && raw <= 64) { score = score - 3; }
  if (raw >= 65 && raw <= 69) { score = score - 4; }
  if (raw >= 70 && raw <= 74) { score = score - 5; }
  if (raw >= 75 && raw <= 79) { score = score - 6; }
  if (raw >= 80 && raw <= 84) { score = score - 7; }
  if (raw >= 85 && raw <= 89) { score = score - 8; }
  if (raw >= 90 && raw <= 94) { score = score - 9; }
  if (raw >= 95 && raw <= 99) { score = score - 10; }
  if (streak > 1 && streak < 3) { score = score * 1; }
  if (streak > 3 && streak < 5) { score = score * 2; }
  if (streak > 5 && streak < 7) { score = score * 3; }
  if (streak > 7 && streak < 9) { score = score * 4; }
  if (streak > 9 && streak < 11) { score = score * 5; }
  if (streak > 11 && streak < 13) { score = score * 6; }
  if (streak > 13 && streak < 15) { score = score * 7; }
  if (streak > 15 && streak < 17) { score = score * 8; }
  if (streak > 17 && streak < 19) { score = score * 9; }
  if (streak > 19 && streak < 21) { score = score * 10; }
  return score;
}
