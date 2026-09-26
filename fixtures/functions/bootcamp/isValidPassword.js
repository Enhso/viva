/**
 * A valid password has at least 8 characters, one digit, and no spaces.
 */
function isValidPassword(password) {
  if (password.length < 8 || password.includes(" ")) {
    return false;
  }
  return /\d/.test(password);
}
