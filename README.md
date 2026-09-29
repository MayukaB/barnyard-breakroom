# Barnyard Breakroom

The newest National Geographic animal story each morning, painted as a cute storybook watercolor.

- `index.html` is the whole site. It reads `stories.json` and draws each painting as SVG with shared watercolor filters.
- `stories.json` holds every story, newest first.
- `site.css` holds the styles both pages share: colors (light and dark), the header, the page switch and the footer. Page-only styles stay in `index.html` and `pecks.css`.
- `pecks.html` is **Hen Pecks**, a daily animal-expression puzzle. Seven pecks (one vowel or one consonant pair each), then a hint and three tries to fill in the rest. Players can switch on hard mode, which hides the hint unless they choose to peek. Its files: `pecks.html` (markup), `pecks.css` (styles), `pecks.js` (the game), `phrases.js` (the phrase list, one per day from `startDate`; add more to the end), `pecks-config.js` (peck count, tries and save key, shared with the story page) and `pecks-art.js` (the pictures).
- Hen Pecks stats are saved in the browser. Players can also sign in (Supabase: email link, optionally Google) so their stats follow them to any device. `supabase/schema.sql` sets up the database; see **Hen Pecks accounts** below. Until `CLOUD` in `pecks.js` is filled in, there's no sign-in button and nothing changes.
- `scripts/check-pecks.mjs` checks the phrase list: duplicates, stray characters, missing hints, meanings or origin notes, hints that give away a word of the answer, and phrases without a picture. `.github/workflows/checks.yml` runs it on every push that touches the game. Run it yourself with `node scripts/check-pecks.mjs` after adding phrases.
- `og-story.png` and `og-pecks.png` are the link preview images (what shows up when someone shares a link). Their source is `scripts/og-cards.html`. The preview tags point at barnyardbreakroom.com, so update them if the domain changes.
- `pecks-art.js` draws the Hen Pecks pictures: a small kit of watercolor animals and props, one scene per phrase (shown on a win) and a sad hen (shown on a loss). A new phrase without a scene falls back to the happy hen.
- `scripts/update.mjs` asks Claude (Anthropic API, with its web fetch tool) for the top story on nationalgeographic.com/animals, gets a painting, and adds it to `stories.json`.
- `.github/workflows/daily.yml` runs the update every morning, commits the new story, and deploys the site to GitHub Pages.
- `scripts/alert.sh` runs at the end of each daily run. If the run fails, or no new story has arrived for 4 days, it opens a GitHub issue labelled `daily-story-alert` (GitHub emails you about it). The issue closes itself after the next run that works.

## Setup

1. **Pages:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. **API key:** Settings → Secrets and variables → Actions → New repository secret named `ANTHROPIC_API_KEY`.
3. Optional: add a repository **variable** `ANTHROPIC_MODEL` to change the model (default `claude-sonnet-5`).
4. Actions → "Paint today's story" → **Run workflow** to test it once.

Each run is one API call with a couple of page fetches. On days when the top story hasn't changed, nothing gets committed.

## Hen Pecks accounts (Supabase)

1. **Database:** in your Supabase project, open SQL Editor → New query, paste all of `supabase/schema.sql`, and run it. It creates the `pecks_players` table (each player can only read and change their own row) and the `pecks_sync` function the game calls.
2. **Keys:** Project Settings → API. Copy the Project URL and the `anon` public key into `CLOUD` near the bottom of `pecks.js`. The anon key is safe to publish; never put the `service_role` key in the site.
3. **Redirects:** Authentication → URL Configuration. Set Site URL to `https://barnyardbreakroom.com/pecks.html` and add `https://barnyardbreakroom.com/pecks.html` and `http://localhost:3000/pecks.html` (for `npx serve`) to Redirect URLs.
4. **Emails:** Supabase's built-in email sender only allows a few emails an hour and is meant for testing. Before sharing widely, add your own sender under Authentication → Emails → SMTP Settings (Resend, Postmark and Brevo all have free tiers). You can reword the "Magic Link" email under Authentication → Emails → Templates.
5. **Google (optional):** in Google Cloud Console, set up the consent screen (Google Auth Platform → Branding and Audience, then **Publish app**) and create an OAuth client of type "Web application". Add `https://barnyardbreakroom.com`, `http://localhost` and `http://localhost:3000` to **Authorized JavaScript origins**, and the callback URL Supabase shows under Authentication → Sign In / Providers → Google to **Authorized redirect URIs**. In that Supabase page, switch Google on, paste the client ID and secret, and also add the client ID to **Authorized Client IDs**. Then in `CLOUD` set `google: true` and `googleClientId` to the client ID. The page then shows Google's own "Sign in with Google" button, so Google names barnyardbreakroom.com rather than the Supabase address. If Google's button can't load, a plain button falls back to Supabase's Google sign-in.

Free Supabase projects pause after about a week without any requests. If that happens, sign-in stops working (the game itself keeps going) until you restore the project from the dashboard.

## Security policy

Both pages set a Content-Security-Policy in a `<meta>` tag (GitHub Pages can't send headers). It lists what each page may load, so an injected script can't run. Inline scripts are blocked; that's why the story page's code lives in `index.js`. Inline styles are allowed because the pages and paintings use `style` attributes.

`pecks.html`'s policy also allows the sign-in services: Supabase's script (from cdn.jsdelivr.net) and API, and Google's sign-in button. If you move Supabase to a new project, update the `connect-src` address in `pecks.html` to match `CLOUD.url` in `pecks.js`. If something stops loading after a change, the browser console (F12) says which directive blocked it.

## Tests

```sh
npm install                       # once: installs the test runner
npx playwright install chromium   # once: the browser the tests drive
npm test                          # plays Hen Pecks in a browser (desktop and phone sizes)
npm run check                     # checks the phrase list and pictures
npm run lint                      # ESLint: catches mistakes like undefined names
npm run format                    # Prettier: formats the scripts, tests and config files
```

`tests/pecks.spec.js` covers pecking, winning, losing, wrong tries, hard mode and peeking, reloading mid-game, the story page's Hen Pecks card and upgrading old saved data. The tests pin the date, so they always play the same puzzle, and they block the sign-in services so they run offline. `.github/workflows/checks.yml` runs the phrase check, the lint and formatting checks, a syntax check of the Node scripts, and the browser tests on every push and pull request that touches the site.

## Run locally

```sh
npx serve .                                   # view the site at the printed address
ANTHROPIC_API_KEY=sk-... node scripts/update.mjs   # add today's story
```

Opening `index.html` directly from disk won't work, because browsers block `fetch` of local files. Serve the folder instead.

Stories link back to the original articles on National Geographic. The summaries are written in Claude's own words.
