/* Barnyard Breakroom: the top bar and menu, shared by index.html and pecks.html.
   Loaded in <head> without defer so a saved light/dark choice is applied before the page paints.
   - Theme: the choice is saved under THEME_KEY and set as data-theme on <html>, which site.css's tokens follow.
     With nothing saved, the page follows the system setting.
   - Menu: a modal <dialog> (#menu), opened by the menu button and the account chip.
   - How to play: a game page's pop-up (#howto), opened by the "?" by its title (#howtoBtn). It opens by
     itself the first time someone visits that game, unless they already have a game saved there
     (the dialog's data-saved names that game's storage key). A visit that arrives to sign in, where
     account.js may open its own dialog, saves the pop-up for the next visit instead.
   - Visit counts: each page view, and a few game moments the games report through window.Stats.event,
     go to GoatCounter (anonymous, no cookies). Nothing is sent until GOATCOUNTER below is filled in,
     and never from a local copy of the site or an automated browser (the tests).
     Open any page with #nocount on the end to stop counting your own visits on that browser
     (#count turns it back on).
   - Discord: inside a Discord Activity the page runs at <app id>.discordsays.com, where Discord's proxy
     only lets it reach the addresses in the app's URL mappings (README, Discord Activities). There this
     marks <html class="discord">, keeps the Activity on its game (no menu, and the site's name isn't a
     link), sends visit counts and Google Fonts through those mappings, and sends the Activity's first
     page (the story page) on to that app's game. discord.js does the rest.
   Signing in (the chip's contents, the menu's Account card and the sign-in dialog) is account.js. */
(() => {
  // Each game's Discord application ID (Developer Portal → General Information → Application ID).
  // Public, like the address of a page. Leave one empty until that game's app is set up.
  const DISCORD_APPS = { pecks: "1557552863746461736", biscuit: "" };
  // The URL mapping prefixes set in each Discord app (Activities → URL Mappings).
  const PROXY = { goatcounter: "/x/goatcounter", gfonts: "/x/gfonts", gstatic: "/x/gstatic" };
  // The site code from goatcounter.com, e.g. "barnyard" for barnyard.goatcounter.com. Each page's
  // Content-Security-Policy must allow https://<code>.goatcounter.com in connect-src and img-src.
  const GOATCOUNTER = "barnyardbreakroom";
  const NOCOUNT_KEY = "bb:nocount";
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

  /* ---------- Discord ---------- */
  const inDiscord = /\.discordsays\.com$/.test(location.hostname);
  if (inDiscord) {
    root.classList.add("discord");
    // An Activity always opens on "/", so send it on to its game, keeping Discord's launch details.
    const appId = location.hostname.split(".")[0];
    const game = Object.keys(DISCORD_APPS).find((g) => DISCORD_APPS[g] === appId);
    if (game && /^\/(index\.html)?$/.test(location.pathname)) location.replace(`/${game}.html${location.search}`);
    // Google Fonts' stylesheet (just above this script) can't load here, so fetch it through the proxy and
    // point its font files at the proxy too.
    const fonts = document.querySelector('link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]');
    if (fonts) {
      fetch(fonts.href.replace("https://fonts.googleapis.com", PROXY.gfonts))
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((css) => {
          const style = document.createElement("style");
          style.textContent = css.replaceAll("https://fonts.gstatic.com", PROXY.gstatic);
          document.head.append(style);
        })
        .catch(() => {});
    }
  }
  window.InDiscord = inDiscord;

  /* ---------- Visit counts ---------- */
  if (location.hash === "#nocount" || location.hash === "#count") {
    try {
      if (location.hash === "#nocount") localStorage.setItem(NOCOUNT_KEY, "1");
      else localStorage.removeItem(NOCOUNT_KEY);
    } catch {}
  }
  function counting() {
    if (!GOATCOUNTER || navigator.webdriver || location.protocol === "file:") return false;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(location.hostname)) return false;
    try {
      return !localStorage.getItem(NOCOUNT_KEY);
    } catch {
      return true;
    }
  }
  // `path` is the page's address, or for an event its name (GoatCounter shows events separately).
  function send(params) {
    if (!counting()) return;
    const url =
      (inDiscord ? `${PROXY.goatcounter}/count?` : `https://${GOATCOUNTER}.goatcounter.com/count?`) +
      new URLSearchParams({
        ...params,
        s: `${screen.width},${screen.height},${devicePixelRatio || 1}`,
        rnd: Math.random().toString(36).slice(2),
      });
    if (!(navigator.sendBeacon && navigator.sendBeacon(url))) new Image().src = url;
  }
  function countPage() {
    if (document.visibilityState === "prerender") return;
    // Plays inside Discord show up as /discord/pecks.html and so on.
    send({ p: (inDiscord ? "/discord" : "") + location.pathname, t: document.title, r: document.referrer });
  }
  function countEvent(name, title) {
    send({ p: name, t: title || name, e: "true" });
  }
  // Script errors in the site's own files, so a page that breaks on some phone shows up on the dashboard:
  // the page and the first line of the message as the event, where it happened as its title.
  // Up to 3 different ones a page view; other sites' scripts and browser extensions are left out.
  const errorsSent = new Set();
  function countError(message, file, line) {
    if (errorsSent.size >= 3 || (file && !file.startsWith(location.origin))) return;
    const text = String(message || "unknown error")
      .split("\n")[0]
      .replace(/^Uncaught /, "")
      .replace(/https?:\/\/\S+/g, "…")
      .slice(0, 100);
    if (errorsSent.has(text)) return;
    errorsSent.add(text);
    const page = location.pathname.replace(/^\/|\.html$/g, "") || "index";
    const where = file ? `${file.slice(location.origin.length + 1)}:${line || "?"}` : "an unknown file";
    countEvent(`error-${page}: ${text}`, `Script error in ${where}`);
  }
  addEventListener("error", (e) => {
    // Resource load failures (an image, a blocked script) arrive here too, without a message; skip those.
    if (e.message) countError(e.message, e.filename, e.lineno);
  });
  addEventListener("unhandledrejection", (e) => {
    // A rejected promise has no file of its own; the top of its stack says where it came from.
    const r = e.reason;
    const [, file, line] = String(r?.stack || "").match(/(https?:\/\/[^\s()]+?):(\d+):\d+/) || [];
    countError(r?.message ?? r, file, line);
  });

  /* ---------- Menu ---------- */
  function openMenu() {
    const menu = $("menu");
    if (menu.open || inDiscord) return; // an Activity stays on its game (the menu button is hidden there)
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
    $("howtoBtn").addEventListener("click", () => {
      countEvent(`${dialog.dataset.game}-howto-reopened`, "Reopened how to play");
      open(true);
    });
    dialog.addEventListener("click", (e) => {
      if (onBackdrop(dialog, e) || e.target.closest(".howto-x, .howto-go")) dialog.close();
    });
    // "full rules" in the pop-up: close it and open the page's How to play section instead.
    dialog.querySelector(".howto-more button").addEventListener("click", () => {
      dialog.close();
      countEvent(`${dialog.dataset.game}-howto-full-rules`, "Went to the full rules");
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
    countPage();
    // In Discord the site's name isn't a link either, so the Activity stays on its game.
    if (inDiscord) document.querySelector(".brand a")?.removeAttribute("href");
    // A click on anything marked data-count="name" counts as that event (it still sends as the page changes).
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-count]");
      if (el) countEvent(el.dataset.count, el.dataset.countTitle);
    });
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
  window.Stats = Object.freeze({ event: countEvent });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
