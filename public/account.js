/* Barnyard Breakroom accounts: sign in (Supabase: email link, optionally Google) so game stats follow
   players to any device. Shared by every page; it runs the account dialog (#acct), the top bar's account
   chip and the menu's Account card. Load it after the page's markup and before any game script.

   Games use window.Account:
     Account.enabled      false when CLOUD below isn't filled in (no sign-in anywhere)
     Account.user         the signed-in Supabase user, or null
     Account.client       the Supabase client, or null until it has loaded
     Account.onChange(fn) fn(user or null) once the first check is done, then whenever a different
                          player signs in or out. Returns a function that stops listening.
     Account.open()       show the sign-in dialog
     Account.message(text, warn)  a line in the dialog, e.g. whether stats were saved
     Account.signOut()

   CLOUD: url and anonKey come from Supabase → Project Settings → API. The anon key is meant to be
   public: row-level security in supabase/schema.sql keeps each player to their own row.
   Leave url empty and every page works as before, with no sign-in.
   Set google to true once Google is switched on under Authentication → Providers.
   googleClientId: the OAuth client ID from Google Cloud. With it, the dialog shows Google's own
   "Sign in with Google" button, so Google names barnyardbreakroom.com rather than the Supabase
   address. Without it, the plain button sends players through Supabase's Google sign-in instead.
   Each page's Content-Security-Policy must allow these addresses (see pecks.html and index.html). */
(() => {
  const CLOUD = {
    url: "https://tgqwamamqcbrwpheldpi.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncXdhbWFtcWNicndwaGVsZHBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODc4ODcsImV4cCI6MjEwNjE2Mzg4N30.aNfjzKbuOArjBqcpLZkjRVjoUTrkJZqWFzfefs8vPE8",
    google: true,
    googleClientId: "818572636423-k4772kddhhhvq4b07l94peeegtu4hqkp.apps.googleusercontent.com",
  };
  // An exact version plus its hash, so the browser refuses the script if the CDN ever serves anything else.
  // To upgrade: change the version, then run
  //   curl -s <new URL> | openssl dgst -sha384 -binary | openssl base64 -A
  // and put "sha384-" plus the output in SUPABASE_SRI.
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js";
  const SUPABASE_SRI = "sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok";
  const GOOGLE_GSI = "https://accounts.google.com/gsi/client";
  // Who was signed in last ({ id, email }), so the top bar is right before Supabase has loaded.
  const CACHE_KEY = "bb:account";
  const enabled = !!(CLOUD.url && CLOUD.anonKey);
  const $ = (id) => document.getElementById(id);

  let sb = null,
    user = null,
    known = false; // known: Supabase has made its first check
  const listeners = new Set();

  function cachedUser() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY));
    } catch {
      return null;
    }
  }
  function cacheUser(u) {
    try {
      if (u) localStorage.setItem(CACHE_KEY, JSON.stringify({ id: u.id, email: u.email || "" }));
      else localStorage.removeItem(CACHE_KEY);
    } catch {}
  }

  function message(text, warn = false) {
    const m = $("acctMsg");
    m.textContent = text;
    m.classList.toggle("warn", warn);
  }

  /* ---------- Drawing ---------- */
  function render() {
    $("acctChip").hidden = !enabled;
    $("menuAcct").hidden = !enabled;
    if (!enabled) return;
    const shown = known ? user : cachedUser();
    const signedIn = !!shown,
      email = (shown && shown.email) || "";
    const initial = (email || "?").charAt(0).toUpperCase();

    // Top bar chip: "Sign in", or the player's initial and name
    const chip = $("acctChip");
    chip.classList.toggle("in", signedIn);
    $("chipAvatar").hidden = !signedIn;
    $("chipAvatar").textContent = initial;
    $("chipIcon").hidden = signedIn;
    $("chipText").textContent = signedIn ? email.split("@")[0] || "Account" : "Sign in";
    if (signedIn) chip.setAttribute("aria-label", email ? `Account: ${email}` : "Account");
    else chip.removeAttribute("aria-label");

    // Menu card
    $("menuOut").hidden = signedIn;
    $("menuIn").hidden = !signedIn;
    $("menuAvatar").textContent = initial;
    $("menuEmail").textContent = email || "your account";

    // Dialog
    $("acctOut").hidden = signedIn;
    $("acctIn").hidden = !signedIn;
    $("acctEmail").textContent = email;
    $("orLine").hidden = !CLOUD.google;
    $("gsiBtn").hidden = !(CLOUD.google && gsiReady);
    $("gBtn").hidden = !CLOUD.google || gsiReady || gsiLoading;
    for (const b of [$("gBtn"), $("emailBtn"), $("signOut"), $("menuSignOut")]) b.disabled = !sb;
  }

  // Tells games when the player changes (and once at the start), after the first check.
  function setUser(u) {
    const changed = !known || (u && u.id) !== (user && user.id);
    user = u;
    known = true;
    cacheUser(u);
    render();
    if (changed) for (const fn of listeners) fn(user);
  }

  function open() {
    if (!enabled) return;
    window.SiteMenu?.close();
    if (!$("acct").open) $("acct").showModal();
    drawGsiButton();
  }

  async function signOut() {
    if (!sb) return;
    $("signOut").disabled = $("menuSignOut").disabled = true;
    await sb.auth.signOut().catch(() => {});
    setUser(null);
    if ($("acct").open) message("Signed out.");
  }

  /* ---------- Google's own sign-in button (Google Identity Services) ----------
     Google hands back a signed ID token and Supabase checks it (signInWithIdToken), so players never
     pass through the supabase.co address. A one-time random value (nonce) ties the token to this page:
     Google gets its SHA-256 hash, Supabase gets the original and checks they match. */
  let gsiReady = false,
    gsiLoading = false,
    gsiDrawn = false,
    gsiNonce = "";
  async function sha256hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function initGsi() {
    if (!CLOUD.google || !CLOUD.googleClientId || !window.crypto || !crypto.subtle) return;
    gsiLoading = true;
    const s = document.createElement("script");
    s.src = GOOGLE_GSI;
    s.async = true;
    s.onload = async () => {
      try {
        gsiNonce = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
        google.accounts.id.initialize({
          client_id: CLOUD.googleClientId,
          nonce: await sha256hex(gsiNonce),
          callback: onGoogleCredential,
        });
        gsiReady = true;
      } catch {}
      gsiLoading = false;
      render();
      drawGsiButton();
    };
    s.onerror = () => {
      gsiLoading = false;
      render();
    }; // fall back to the plain button
    document.head.appendChild(s);
  }
  function drawGsiButton() {
    // Google sizes its button when drawn, so wait until the dialog is open and the box has a width.
    if (!gsiReady || gsiDrawn || !$("acct").open || $("acctOut").hidden) return;
    const box = $("gsiBtn"),
      w = Math.max(200, Math.min(400, Math.floor(box.getBoundingClientRect().width)));
    google.accounts.id.renderButton(box, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "center",
      width: w,
    });
    gsiDrawn = true;
  }
  async function onGoogleCredential(res) {
    if (!sb) {
      message("Sign-in is still loading. Try again in a moment.", true);
      return;
    }
    message("Signing you in…");
    const { error } = await sb.auth.signInWithIdToken({ provider: "google", token: res.credential, nonce: gsiNonce });
    if (error) message("Google sign-in didn’t work. Try again, or use the email link.", true);
  }

  /* ---------- Start ---------- */
  function init() {
    render();
    if (!enabled) return;
    initGsi();
    // A sign-in link that failed (expired, already used) comes back with the reason in the address.
    const h = new URLSearchParams(location.hash.slice(1));
    const linkError = h.get("error_description");
    const wantsDialog = location.hash === "#account";
    if (linkError || wantsDialog) history.replaceState(null, "", location.pathname + location.search);

    const s = document.createElement("script");
    s.src = SUPABASE_JS;
    s.integrity = SUPABASE_SRI;
    s.crossOrigin = "anonymous";
    s.async = true;
    s.onload = () => {
      try {
        sb = window.supabase.createClient(CLOUD.url, CLOUD.anonKey);
      } catch {
        return;
      }
      sb.auth.onAuthStateChange((event, session) => {
        // Don't wait on Supabase inside this callback (it can deadlock); do the work just after.
        setTimeout(() => setUser(session ? session.user : null), 0);
      });
      render();
      if (linkError) {
        open();
        message(
          "That sign-in link didn’t work. It may have expired or already been used. Ask for a new one below.",
          true,
        );
      }
    };
    s.onerror = () => message("Sign-in couldn’t load right now. Your stats are still saved in this browser.", true);
    document.head.appendChild(s);

    const dialog = $("acct");
    $("acctClose").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    }); // click on the backdrop
    dialog.addEventListener("close", () => message(""));
    $("menuSignIn").addEventListener("click", open);
    $("signOut").addEventListener("click", signOut);
    $("menuSignOut").addEventListener("click", signOut);

    // Links come back to the page the player signed in from.
    const redirectTo = location.origin + location.pathname;
    $("emailForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!sb) return;
      const email = $("email").value.trim();
      $("emailBtn").disabled = true;
      message("Sending…");
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      $("emailBtn").disabled = false;
      if (!error) message(`Check ${email} for a sign-in link. It brings you back here, signed in.`);
      else
        message(
          error.status === 429
            ? "Too many sign-in emails just now. Try again in a few minutes."
            : "Couldn’t send the link. Check the email address and try again.",
          true,
        );
    });
    $("gBtn").addEventListener("click", async () => {
      if (!sb) return;
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) message("Couldn’t start Google sign-in. Try the email link instead.", true);
    });

    if (wantsDialog) open();
  }

  window.Account = Object.freeze({
    enabled,
    get user() {
      return user;
    },
    get client() {
      return sb;
    },
    onChange(fn) {
      listeners.add(fn);
      if (known)
        queueMicrotask(() => {
          if (listeners.has(fn)) fn(user);
        });
      return () => listeners.delete(fn);
    },
    open,
    message,
    signOut,
  });
  init();
})();
