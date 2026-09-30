# Barnyard Breakroom

A new animal news story each morning, painted as a cute storybook watercolor.

## Project layout

```
public/      the website: exactly what gets published to GitHub Pages
scripts/     the daily story update, its failure alert, the phrase check and the link-preview card source
tests/       browser tests (*.spec.js, Playwright), the daily script's tests (*.test.mjs) and a tiny local server
supabase/    the database setup for Hen Pecks accounts
.github/     the daily story workflow and the checks that run on every push
```

Everything in `public/` goes live as it is, so a new page, script or image only has to be put there. The files below are in `public/` unless their path says otherwise.

- `index.html` is **Wild Watercolors**, the story page, and `index.js` runs it. It reads `stories.json` and draws each painting as SVG with shared watercolor filters.
- `stories.json` holds every story, newest first.
- `site.css` holds the styles both pages share: colors (light and dark), the top bar, the menu, the sign-in dialog and the footer. Page-only styles stay in `index.html` and `pecks.css`.
- `site.js` runs the top bar on every page: the menu (switch between Wild Watercolors and Hen Pecks) and the light/dark switch. A visitor's light/dark choice is saved in their browser; with none saved, the site follows their device.
- `account.js` is sign-in for the whole site: it loads Supabase and Google's button, runs the sign-in dialog, and fills in the account chip and the menu's Account card. Games use its `window.Account` (who is signed in, the Supabase client, and `Account.onChange` to hear when a player signs in or out); a new game that saves to Supabase needs no sign-in code of its own.
- `pecks.html` is **Hen Pecks**, a daily animal-expression puzzle. Seven pecks (one vowel or one consonant pair each), then a hint and three tries to fill in the rest. Players can switch on hard mode, which hides the hint unless they choose to peek. Its files: `pecks.html` (markup), `pecks.css` (styles), `pecks.js` (the game), `phrases.js` (the phrase list, one per day from `startDate`; add more to the end), `pecks-config.js` (peck count, tries and save key, shared with the story page) and `pecks-art.js` (the pictures).
- Hen Pecks stats are saved in the browser. Players can also sign in (Supabase: email link, optionally Google) so their stats follow them to any device. Sign-in lives in `account.js`; `pecks.js` only syncs the game's stats once someone is signed in. `supabase/schema.sql` sets up the database; see **Hen Pecks accounts** below. Until `CLOUD` in `account.js` is filled in, there's no sign-in anywhere and nothing changes.
- `scripts/check-pecks.mjs` checks the phrase list: duplicates, stray characters, missing hints, meanings or origin notes, hints that give away a word of the answer, and phrases without a picture. `.github/workflows/checks.yml` runs it with the other checks (see **Tests**). Run it yourself with `node scripts/check-pecks.mjs` after adding phrases.
- `og-story.png` and `og-pecks.png` are the link preview images (what shows up when someone shares a link). Their source is `scripts/og-cards.html`. The preview tags point at barnyardbreakroom.com, so update them if the domain changes.
- `pecks-art.js` draws the Hen Pecks pictures: a small kit of watercolor animals and props, one scene per phrase (shown on a win) and a sad hen (shown on a loss). A new phrase without a scene falls back to the happy hen.
- `scripts/update.mjs` asks Claude (Anthropic API, with its web fetch tool) for the newest animal story from the sources below (currently just Mongabay), gets a painting, and adds it to `stories.json`. With more than one source, each day starts with a different one; if that one has nothing new or can't be read, the next one gets a turn. Only stories mainly about an animal count, and only from the last 14 days. Sad stories (deaths, disease, culls) are included and painted cute but gently sad, never graphic.
- `404.html` is the page GitHub Pages shows for any address that doesn't exist. Its links start with `/` so it works at any depth.
- `.github/workflows/daily.yml` runs the update every morning, commits the new story, and deploys `public/` to GitHub Pages. It also redeploys on every push to `main`.
- `scripts/alert.sh` runs at the end of each daily run. If the run fails, or no new story has arrived for 4 days, it opens a GitHub issue labelled `daily-story-alert` (GitHub emails you about it). The issue closes itself after the next run that works.

## Setup

1. **Pages:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. **API key:** Settings → Secrets and variables → Actions → New repository secret named `ANTHROPIC_API_KEY`.
3. Optional: add a repository **variable** `ANTHROPIC_MODEL` to change the model (default `claude-sonnet-5`).
4. Actions → "Paint today's story" → **Run workflow** to test it once.

Each run is one API call with a couple of page fetches. On days when the top story hasn't changed, nothing gets committed.

## Hen Pecks accounts (Supabase)

1. **Database:** in your Supabase project, open SQL Editor → New query, paste all of `supabase/schema.sql`, and run it. It creates the `pecks_players` table (each player can only read and change their own row) and the `pecks_sync` function the game calls.
2. **Keys:** Project Settings → API. Copy the Project URL and the `anon` public key into `CLOUD` at the top of `account.js`. The anon key is safe to publish; never put the `service_role` key in the site.
3. **Redirects:** Authentication → URL Configuration. Set Site URL to `https://barnyardbreakroom.com/pecks.html`. Sign-in links bring players back to the page they signed in from, so add every page to Redirect URLs: `https://barnyardbreakroom.com/`, `https://barnyardbreakroom.com/pecks.html`, and the same two on `http://localhost:3000` (for `npx serve`). A page that isn't listed falls back to the Site URL.
4. **Emails:** Supabase's built-in email sender only allows a few emails an hour and is meant for testing. Before sharing widely, add your own sender under Authentication → Emails → SMTP Settings (Resend, Postmark and Brevo all have free tiers). You can reword the "Magic Link" email under Authentication → Emails → Templates.
5. **Google (optional):** in Google Cloud Console, set up the consent screen (Google Auth Platform → Branding and Audience, then **Publish app**) and create an OAuth client of type "Web application". Add `https://barnyardbreakroom.com`, `http://localhost` and `http://localhost:3000` to **Authorized JavaScript origins**, and the callback URL Supabase shows under Authentication → Sign In / Providers → Google to **Authorized redirect URIs**. In that Supabase page, switch Google on, paste the client ID and secret, and also add the client ID to **Authorized Client IDs**. Then in `CLOUD` (in `account.js`) set `google: true` and `googleClientId` to the client ID. The page then shows Google's own "Sign in with Google" button, so Google names barnyardbreakroom.com rather than the Supabase address. If Google's button can't load, a plain button falls back to Supabase's Google sign-in.

Free Supabase projects pause after about a week without any requests. If that happens, sign-in stops working (the game itself keeps going) until you restore the project from the dashboard.

## Security policy

Both pages set a Content-Security-Policy in a `<meta>` tag (GitHub Pages can't send headers). It lists what each page may load, so an injected script can't run. Inline scripts are blocked; that's why the story page's code lives in `index.js`. Inline styles are allowed because the pages and paintings use `style` attributes.

Both policies also allow the sign-in services (every page can sign in): Supabase's script (from cdn.jsdelivr.net) and API, and Google's sign-in button. Supabase's script is pinned to an exact version with an integrity hash (`SUPABASE_JS` and `SUPABASE_SRI` in `account.js`), so the browser refuses it if the CDN ever serves a different file; the comment above them says how to upgrade. Google's script can't be pinned this way, because Google changes it in place. If you move Supabase to a new project, update the `connect-src` address in `index.html` and `pecks.html` to match `CLOUD.url` in `account.js`. If something stops loading after a change, the browser console (F12) says which directive blocked it.

## Tests

```sh
npm install                       # once: installs the test runner
npx playwright install chromium   # once: the browser the tests drive
npm test                          # plays Hen Pecks in a browser (desktop and phone sizes)
npm run test:scripts              # tests the daily story script (no API key needed)
npm run check                     # checks the phrase list and pictures
npm run lint                      # ESLint: catches mistakes like undefined names
npm run format                    # Prettier: formats the scripts, tests and config files
```

`tests/pecks.spec.js` covers pecking, winning, losing, wrong tries, hard mode and peeking, reloading mid-game, the story page's Hen Pecks card and upgrading old saved data. `tests/site.spec.js` covers the top bar: the menu, the light/dark switch, opening sign-in from every page, and the 404 page. The tests pin the date, so they always play the same puzzle, and they block the sign-in services so they run offline. If port 4173 is busy, run them on another port: `PORT=4180 npm test` in Git Bash or macOS/Linux, or `$env:PORT=4180; npm test` in PowerShell.

`tests/update.test.mjs` runs `scripts/update.mjs` on a copy of a small story list, with the Anthropic API replaced by `tests/fixtures/fake-anthropic.mjs`. It checks that a good story is added, that quiet days and repeats change nothing, and that bad replies (not JSON, links to other sites, missing fields, paintings too small or too big, API errors) are refused without touching the list.

`.github/workflows/checks.yml` runs the phrase check, the lint and formatting checks, the daily script's tests, a syntax check of the Node scripts, and the browser tests on every push and pull request that touches the site, its scripts or its workflows.

## Run locally

```sh
npm start                                     # view the site at the printed address (4173, or the next free port)
ANTHROPIC_API_KEY=sk-... node scripts/update.mjs   # add today's story
```

`npx serve public` works too, and uses port 3000, the one listed in Supabase's redirect URLs, so use it to test signing in. Opening `public/index.html` directly from disk won't work, because browsers block `fetch` of local files. Serve the folder instead.

The scripts need Node 22 or newer.

## Story sources

| Key        | Source   | News page                      | Why it's allowed                                                          |
| ---------- | -------- | ------------------------------ | ------------------------------------------------------------------------- |
| `mongabay` | Mongabay | news.mongabay.com/list/animals | CC BY-ND: summary in our own words plus a link, article text never copied |

Stories link back to the original articles. The summaries are written in Claude's own words.

**National Geographic is no longer a source.** The site's first stories came from nationalgeographic.com/animals, but National Geographic's site runs under the [Disney Terms of Use](https://disneytermsofuse.com/english/), which forbid transforming its content with AI tools, including by prompting them (section 2A), and accessing it with scripts or other automated means (section 2B(x)). The daily run did both, so it was removed. The earlier National Geographic paintings are still in `stories.json` and link to the original articles.

To try one source on its own: Actions → "Paint today's story" → **Run workflow**, and type its key in the source box. Locally: `node scripts/update.mjs mongabay`.

Before adding a source, check its terms and its robots.txt, not just robots.txt: National Geographic's robots.txt allowed Claude even though its terms don't. The Guardian's API terms forbid using its articles with AI, and The Conversation and the BBC block Claude in robots.txt. Mongabay sits behind bot protection that turns away plain requests; if Claude's fetch is turned away too, the run log says so and that source is skipped.
