/* Hen Pecks settings shared by the game (pecks.html) and the Hen Pecks card
   on the story page (index.html). Change them here so both pages agree. */
window.PECKS_CONFIG = Object.freeze({
  MAX_PECKS: 7,          // pecks before the hint
  MAX_TRIES: 3,          // tries to fill in the blanks
  STORE: "henpecks:v1",  // localStorage key for saved games and stats
});
