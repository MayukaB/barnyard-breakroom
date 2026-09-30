/* Barnyard Breakroom: the top bar and menu, shared by index.html and pecks.html.
   Loaded in <head> without defer so a saved light/dark choice is applied before the page paints.
   - Theme: the choice is saved under THEME_KEY and set as data-theme on <html>, which site.css's tokens follow.
     With nothing saved, the page follows the system setting.
   - Menu: a modal <dialog> (#menu), opened by the menu button and the account chip.
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

  function init() {
    const menu = $("menu");
    if (!menu) return;
    $("menuBtn").addEventListener("click", openMenu);
    $("acctChip").addEventListener("click", openMenu);
    $("menuClose").addEventListener("click", closeMenu);
    menu.addEventListener("close", () => $("menuBtn").setAttribute("aria-expanded", "false"));
    // A click on the backdrop lands on the dialog itself, outside its box.
    menu.addEventListener("click", (e) => {
      if (e.target !== menu) return;
      const r = menu.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeMenu();
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
