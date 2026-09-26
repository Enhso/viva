/**
 * Formats a price given in cents, e.g. 1999 -> "$19.99".
 */
function formatPrice(cents) {
  if (!cents) {
    return "Free";
  }
  return "$" + (cents / 100).toFixed(2);
}
