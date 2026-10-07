/* Barnyard Breakroom: the top bar and menu, shared by index.html and pecks.html.
   Loaded in <head> without defer so a saved light/dark choice is applied before the page paints.
   - Theme: the choice is saved under THEME_KEY and set as data-theme on <html>, which site.css's tokens follow.
     With nothing saved, the page follows the system setting.
   - Menu: a modal <dialog> (#menu), opened by the menu button and the account chip.
   - How to play: a game page's pop-up (#howto), opened by the "?" by its title (#howtoBtn). It opens by
     itself the first time someone visits that game, unless they already have a game saved there
     (the dialog's data-saved names that game's storage key). A visit that arrives to sign in, where
     account.js may open its own dialog, saves the pop-up for the next visit instead.
   Signing in (the chip's contents, the menu's Account card and the sign-in dialog) is account.js. */
(() => {
  const THEME_KEY = "bb:theme";
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const $ = (id) => document.getElementById(id);

  /* ---------- Theme ---------- */
  function savedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === "light" || t === "dark" ? t : null;
    } catch {
      return null;
    }
  }
  function applyTheme(theme) {
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
  }
  function renderThemeButtons() {
    const current = savedTheme() || (systemDark.matches ? "dark" : "light");
    for (const b of document.querySelectorAll("[data-theme-set]")) {
      b.setAttribute("aria-pressed", String(b.dataset.themeSet === current));
    }
  }
  function setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    applyTheme(theme);
    renderThemeButtons();
  }
  applyTheme(savedTheme());

  /* ---------- Menu ---------- */
  function openMenu() {
    const menu = $("menu");
    if (menu.open) return;
    menu.showModal();
    $("menuBtn").setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    const menu = $("menu");
    if (menu.open) menu.close();
  }

  /* ---------- How to play ---------- */
  // The games save as soon as they load, so note which saves were already here before they ran.
  let savedBefore = [];
  try {
    savedBefore = Object.keys(localStorage);
  } catch {}
  // The same for the address: account.js tidies away a sign-in link's details once it has read them.
  const signingIn =
    /^#(account$|.*(access_token|error_description)=)/.test(location.hash) || /[?&]code=/.test(location.search);
  // A click on a dialog's backdrop lands on the dialog itself, outside its box.
  const onBackdrop = (dialog, e) => {
    if (e.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  function initHowto() {
    const dialog = $("howto");
    if (!dialog) return;
    const seenKey = "bb:howto:" + dialog.dataset.game;
    const go = dialog.querySelector(".howto-go");
    // Reopened from the "?" mid-game, the button goes back to the game rather than starting it.
    const open = (reopened) => {
      if (dialog.open) return;
      go.textContent = reopened ? "Back to the game" : "Let’s play";
      dialog.showModal();
      // Start on the main button, without scrolling the steps away on a short screen.
      go.focus({ preventScroll: true });
      try {
        localStorage.setItem(seenKey, "1");
      } catch {}
    };
    $("howtoBtn").addEventListener("click", () => open(true));
    dialog.addEventListener("click", (e) => {
      if (onBackdrop(dialog, e) || e.target.closest(".howto-x, .howto-go")) dialog.close();
    });
    // "full rules" in the pop-up: close it and open the page's How to play section instead.
    dialog.querySelector(".howto-more button").addEventListener("click", () => {
      dialog.close();
      const how = $("how");
      how.open = true;
      how.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      how.querySelector("summary").focus({ preventScroll: true });
    });
    // "later" marks a first visit that arrived to sign in.
    let show = false;
    try {
      const seen = localStorage.getItem(seenKey);
      const firstVisit = !seen && !savedBefore.includes(dialog.dataset.saved);
      if (firstVisit && signingIn) localStorage.setItem(seenKey, "later");
      show = seen === "later" ? !signingIn : firstVisit && !signingIn;
    } catch {}
    if (show) open(false);
  }

  function init() {
    initHowto();
    const menu = $("menu");
    if (!menu) return;
    $("menuBtn").addEventListener("click", openMenu);
    $("acctChip").addEventListener("click", openMenu);
    $("menuClose").addEventListener("click", closeMenu);
    menu.addEventListener("close", () => $("menuBtn").setAttribute("aria-expanded", "false"));
    menu.addEventListener("click", (e) => {
      if (onBackdrop(menu, e)) closeMenu();
    });
    // The page you're already on just closes the menu instead of reloading.
    for (const a of menu.querySelectorAll('.menu-page[aria-current="page"]')) {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        closeMenu();
      });
    }
    for (const b of document.querySelectorAll("[data-theme-set]")) {
      b.addEventListener("click", () => setTheme(b.dataset.themeSet));
    }
    systemDark.addEventListener("change", renderThemeButtons);
    // Keep other open tabs in step when the theme changes in one of them.
    addEventListener("storage", (e) => {
      if (e.key !== THEME_KEY) return;
      applyTheme(savedTheme());
      renderThemeButtons();
    });
    renderThemeButtons();
  }

  window.SiteMenu = Object.freeze({ open: openMenu, close: closeMenu });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
