/**
 * Returns the user with the given id, or null if there isn't one.
 */
function findUser(users, id) {
  for (const user of users) {
    if (user.id == id) {
      return user;
    }
  }
  return null;
}
