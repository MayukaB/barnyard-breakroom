# Barnyard Breakroom

A new animal news story each morning, painted as a cute storybook watercolor.

## Project layout

```
public/      the website: exactly what gets published to GitHub Pages
scripts/     the daily story update, its failure alert, the phrase check and the link-preview card source
tests/       browser tests (*.spec.js, Playwright), the daily script's tests (*.test.mjs) and a tiny local server
supabase/    the database setup for accounts (Hen Pecks and Biscuit and Marshmallow stats), and the Discord functions
.github/     the daily story workflow and the checks that run on every push
```

Everything in `public/` goes live as it is, so a new page, script or image only has to be put there. The files below are in `public/` unless their path says otherwise.

- `index.html` is **Wild Watercolors**, the story page, and `index.js` runs it. It reads `stories.json` and draws each painting as SVG with shared watercolor filters. Under the painting are two game cards, one for Hen Pecks and one for Biscuit and Marshmallow. Each shows how far along today's game is, and the menu gets a dot while either game is unfinished.
- `stories.json` holds every story, newest first.
- `site.css` holds the styles both pages share: colors (light and dark), the top bar, the menu, the sign-in dialog and the footer. Page-only styles stay in `index.html` and `pecks.css`.
- `site.js` runs the top bar on every page: the menu (switch between Wild Watercolors and Hen Pecks) and the light/dark switch. A visitor's light/dark choice is saved in their browser; with none saved, the site follows their device. It also runs each game's how-to-play pop-up (`#howto` in `pecks.html` and `biscuit.html`): a short version of the rules with a picture for each step. It opens by itself on a player's first visit to that game (not for players who already have a game saved there, and not while a sign-in link is opening, when it waits for the next visit), and from the "?" by the game's title after that. The full rules stay in the page's "How to play" section, which the pop-up links to.
- `account.js` is sign-in for the whole site: it loads Supabase and Google's button, runs the sign-in dialog, and fills in the account chip and the menu's Account card. Games use its `window.Account` (who is signed in, the Supabase client, and `Account.onChange` to hear when a player signs in or out); a new game that saves to Supabase needs no sign-in code of its own.
- `pecks.html` is **Hen Pecks**, a daily animal-expression puzzle. Seven pecks (one vowel or one consonant pair each), then a hint and three tries to fill in the rest. Players can switch on hard mode, which hides the hint unless they choose to peek. Its files: `pecks.html` (markup), `pecks.css` (styles), `pecks.js` (the game), `phrases.js` (the phrase list, one per day from `startDate`; add more to the end), `pecks-config.js` (peck count, tries and save key, shared with the story page) and `pecks-art.js` (the pictures).
- Hen Pecks stats are saved in the browser. Players can also sign in (Supabase: email link, optionally Google) so their stats follow them to any device. Sign-in lives in `account.js`; `pecks.js` only syncs the game's stats once someone is signed in. `supabase/schema.sql` sets up the database; see **Hen Pecks accounts** below. Until `CLOUD` in `account.js` is filled in, there's no sign-in anywhere and nothing changes.
- `biscuit.html` is **Biscuit and Marshmallow**, a daily word grid puzzle. The board's shape changes with the day of the week: Mini waffle (Monday, 5×5), Signpost (Tuesday, a 9-tall pole crossed by three signs), Classic (Wednesday, 5×7), Zig-zag (Thursday, 7 wide and 9 tall, stepping down one way and then back), Wide meadow (Friday, 7×5), Barn (Saturday) and Big weekend (Sunday, 7×7). Par scales with the size of the board. Players swap tiles (drag, tap two, or use the arrow keys and Enter) until every row and column spells its word and Biscuit the orange kitten ends up side by side or corner to corner with both Marshmallow the fluffy sheep and her ball of yarn. The three special tiles never change color and can be swapped with each other too. If every letter is green but Biscuit isn't home yet, a callout under the board says one more swap is needed, and the three special tiles get a ring and a little bob. Green letters are in place and locked; yellow ones belong elsewhere in their line of tiles, across or down, up to a gap in the board. Finishing in par swaps or fewer earns 3 stars, up to 10 over earns 2, and more earns 1. The game tells a little story in six storybook panels: Biscuit wakes up early in the barn while Marshmallow sleeps, chases a ball of yarn, ends up lost and scared in the woods, Marshmallow searches the meadow for her and puts up MISSING posters, and the last panel asks the player to lead her home. On wide screens the panels sit beside the game, three on each side; on narrower screens they're in a "The story so far" fold-out under the title, which starts folded so the board is in view, and then remembers whether the player left it open. Its files: `biscuit.html` (markup), `biscuit.css` (styles), `biscuit.js` (the game), `biscuit-art.js` (the kitten and sheep, and the story scenes) and `biscuit-puzzles.js` (one board per day from `startDate`). Stats are saved in the browser under `biscuit:v1`, and once a player signs in, `biscuit.js` syncs the solved boards to their account (the `biscuit_sync` function in `supabase/schema.sql`). The end screen links to today's story.
- `scripts/make-biscuit.mjs` makes the Biscuit and Marshmallow boards from the word list in `scripts/biscuit-words.mjs`: it picks that day's shape (`SHAPES`), puts Biscuit next to both Marshmallow and the ball of yarn, fills every row and column with real words, then scrambles the tiles and works out par (the swaps it takes to solve, plus `PAR_LEEWAY`, 3, to spare). Boards already in `biscuit-puzzles.js` never change, so it only ever adds to the end. `node scripts/make-biscuit.mjs 500` tops the list up to 500 boards; `node scripts/make-biscuit.mjs --check` checks every board (every word is in the list, the animals touch, par is right) and runs with the other checks.
- `scripts/check-pecks.mjs` checks the phrase list: duplicates, stray characters, missing hints, meanings or origin notes, hints that give away a word of the answer, and phrases without a picture. `.github/workflows/checks.yml` runs it with the other checks (see **Tests**). Run it yourself with `node scripts/check-pecks.mjs` after adding phrases.
- `og-story.png`, `og-pecks.png` and `og-biscuit.png` are the link preview images (what shows up when someone shares a link). Their source is `scripts/og-cards.html`. The preview tags point at barnyardbreakroom.com, so update them if the domain changes.
- `pecks-art.js` draws the Hen Pecks pictures: a small kit of watercolor animals and props, one scene per phrase (shown on a win) and a sad hen (shown on a loss). A new phrase without a scene falls back to the happy hen.
- `scripts/update.mjs` reads the animals feed of each source below (currently just Mongabay), gives Claude (Anthropic API) the recent articles that aren't on the site yet, and asks it to pick the newest one about an animal and paint it. Claude opens the chosen article with its web fetch tool for the whole story, and works from the feed's opening paragraphs if the page is blocked. The script then and adds it to `stories.json`. With more than one source, each day starts with a different one; if that one has nothing new or can't be read, the next one gets a turn. Only stories mainly about an animal count, and only from the last 14 days. Sad stories (deaths, disease, culls) are included and painted cute but gently sad, never graphic. It adds at most one story a day (by UTC date): if one was already added today, it stops before calling Claude, so starting the workflow more than once a day is safe. To add a second story anyway, tick **Add a story even if today's is already up** when running the workflow by hand.
- `discord.js` runs the games inside Discord (see **Discord Activities**), using Discord's SDK from `vendor/discord-sdk.js`. On the website it does nothing.
- `404.html` is the page GitHub Pages shows for any address that doesn't exist. Its links start with `/` so it works at any depth.
- `.github/workflows/daily.yml` runs the update every morning, commits the new story, and deploys `public/` to GitHub Pages. It also redeploys on every push to `main`.
- `scripts/alert.sh` runs at the end of each daily run. If the run fails, or no new story has arrived for 4 days, it opens a GitHub issue labelled `daily-story-alert` (GitHub emails you about it). The issue closes itself after the next run that works.

## Setup

1. **Pages:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. **API key:** Settings → Secrets and variables → Actions → New repository secret named `ANTHROPIC_API_KEY`.
3. Optional: add a repository **variable** `ANTHROPIC_MODEL` to change the model (default `claude-sonnet-5`).
4. Actions → "Paint today's story" → **Run workflow** to test it once.

Each run is one feed download and one API call with one page fetch. On days when the top story hasn't changed, nothing gets committed.

## Accounts (Supabase)

1. **Database:** in your Supabase project, open SQL Editor → New query, paste all of `supabase/schema.sql`, and run it. It creates the `pecks_players` and `biscuit_players` tables (each player can only read and change their own row) and the `pecks_sync` and `biscuit_sync` functions the games call. It also creates the Discord Activities' tables (`discord_launches`, `discord_results`, `discord_recaps`), which only the Discord functions can use. After pulling a change to it, run the whole file again; it's safe to re-run.
2. **Keys:** Project Settings → API. Copy the Project URL and the `anon` public key into `CLOUD` at the top of `account.js`. The anon key is safe to publish; never put the `service_role` key in the site.
3. **Redirects:** Authentication → URL Configuration. Set Site URL to `https://barnyardbreakroom.com/pecks.html`. Sign-in links bring players back to the page they signed in from, so add every page to Redirect URLs: `https://barnyardbreakroom.com/`, `https://barnyardbreakroom.com/pecks.html`, `https://barnyardbreakroom.com/biscuit.html`, and the same three on `http://localhost:3000` (for `npx serve`). A page that isn't listed falls back to the Site URL.
4. **Emails:** Supabase's built-in email sender only allows a few emails an hour and is meant for testing. Before sharing widely, add your own sender under Authentication → Emails → SMTP Settings (Resend, Postmark and Brevo all have free tiers). You can reword the "Magic Link" email under Authentication → Emails → Templates.
5. **Google (optional):** in Google Cloud Console, set up the consent screen (Google Auth Platform → Branding and Audience, then **Publish app**) and create an OAuth client of type "Web application". Add `https://barnyardbreakroom.com`, `http://localhost` and `http://localhost:3000` to **Authorized JavaScript origins**, and the callback URL Supabase shows under Authentication → Sign In / Providers → Google to **Authorized redirect URIs**. In that Supabase page, switch Google on, paste the client ID and secret, and also add the client ID to **Authorized Client IDs**. Then in `CLOUD` (in `account.js`) set `google: true` and `googleClientId` to the client ID. The page then shows Google's own "Sign in with Google" button, so Google names barnyardbreakroom.com rather than the Supabase address. If Google's button can't load, a plain button falls back to Supabase's Google sign-in.

Free Supabase projects pause after about a week without any requests. If that happens, sign-in stops working (the game itself keeps going) until you restore the project from the dashboard.

## Visit counts (GoatCounter)

`site.js` counts page views and a few game moments with [GoatCounter](https://www.goatcounter.com): anonymous, no cookies, so no consent banner. It sends a plain request to GoatCounter itself rather than loading GoatCounter's script, so the pages' script list stays the same. Nothing is counted until `GOATCOUNTER` at the top of `site.js` has a site code, and never on `localhost` or in the browser tests.

1. Sign up at goatcounter.com and choose a site code (the `<code>` in `<code>.goatcounter.com`). Put it in `GOATCOUNTER`.
2. Add `https://<code>.goatcounter.com` to `connect-src` and `img-src` in the Content-Security-Policy of `index.html`, `pecks.html`, `biscuit.html` and `404.html` (404.html has no `connect-src` yet; add one).
3. To leave your own visits out, open any page with `#nocount` on the end, once per browser (`#count` undoes it).

Besides page views, the dashboard lists these events:

- `pecks-started`, `biscuit-started`: the first peck or swap of a day's game.
- `pecks-won-pecks` (solved by pecks alone), `pecks-won-t1` to `-t3` (on that try), `pecks-lost`; `-hard` on the end when hard mode's hint stayed hidden. `pecks-hard-peeked`: peeked at the hint in hard mode.
- `biscuit-solved-<stars>-star(s)-<shape>`, e.g. `biscuit-solved-2-stars-zig-zag`.
- `pecks-shared`, `biscuit-shared`: copied a result.
- `pecks-howto-reopened`, `biscuit-howto-reopened`: opened how-to-play from the "?"; `…-howto-full-rules`: went from the pop-up to the full rules.
- `story-<id>`: a story shown on the story page (today's, or an earlier one from the archive or a story link; the title says which). The page view is just `/` for every story. `story-read-source`: clicked "Read the story" through to the article (the title names the story).
- Links between pages: `story-to-pecks`, `story-to-biscuit` (the story page's game cards), `pecks-to-story`, `biscuit-to-story`, `pecks-to-biscuit`, `biscuit-to-pecks` (the end screens). Any link or button with `data-count="name"` is counted the same way.
- Signing in (`account.js`), never who: `signin-opened`; `signin-email-sent`, or `signin-email-failed` / `signin-email-too-many`; `signin-google-redirect` (the fallback Google button); `signed-in-email`, `signed-in-google` once the player is back and signed in; `signin-link-failed` (an expired or used link); `signin-failed-google`.
- `error-<page>: <message>`: a script error in the site's own files (up to 3 different ones a page view; the title says which file and line). Worth a look whenever one shows up.

## Discord Activities

Each game is also a Discord Activity, like Wordle on Discord: players start it in a channel, and when they finish, their result is posted there. Each day, every channel also gets a recap of the day before. There are two Discord apps, one per game. Each app shows the same page as the website, through Discord's proxy.

**How it works**

1. A player starts the game: from the App Launcher, by typing `/pecks` or `/biscuit`, or by pressing **Play** on one of the game's messages. Discord sends that to the `discord-interactions` function. The function tells Discord to open the Activity, then posts "**Name** is playing Hen Pecks…" with a Play button. It keeps the interaction's token, which can edit that message for 15 minutes.
2. The Activity opens at `<app id>.discordsays.com/`, which Discord's proxy fetches from barnyardbreakroom.com. `site.js` recognises the address, sends the page on to that app's game (`DISCORD_APPS` at the top of `site.js`), and fetches visit counts and fonts through the proxy. Sign-in is hidden, because players are already signed in to Discord.
3. `discord.js` connects to Discord, and the player allows the game to know who they are (the `identify` scope, asked once). When the game ends, it sends the result (`window.GameResult` in `pecks.js` and `biscuit.js`) to the `discord-activity` function.
4. The function checks the player with Discord and saves their first result of the day. It then edits their "is playing" message into the result, like "🐔 **Name** played Hen Pecks #12 / 🐣🥚🐣 cracked on try 2/3". After 15 minutes the token has expired, so it posts a new message as the app's bot instead. That only works where the bot has been added to the server. The function only ever posts in a channel where that player started the game. If it can't post, the game says so, and **Share in Discord** (which replaces "Copy my result") opens Discord's own share dialog.
5. Each day at 4:00 UTC, `.github/workflows/discord-recap.yml` runs the `discord-recap` function. For each game and channel, it posts everyone's results for the day before, best first, with a 🏆 for the best. Results go under the player's own date, the same day the game showed them. At 4:00 UTC it's still that day in the Americas (8pm to midnight across the US), so results finished there after the recap runs aren't in it. Recaps need the bot in the server too.

Inside Discord, links to other pages open in the player's browser, on barnyardbreakroom.com. The other game's button is hidden, because it's a separate Activity. Visit counts show up under `/discord/pecks.html` and `/discord/biscuit.html`, and Share in Discord counts as `pecks-shared-discord` or `biscuit-shared-discord`.

Results are whatever the game sends. The function checks that they're believable, but someone could still send a made-up score for their own name. Nothing is won, so that's accepted.

Files: `public/discord.js`, `public/vendor/discord-sdk.js` (how to upgrade it is at its top), `supabase/functions/` (`discord-interactions`, `discord-activity`, `discord-recap`, and `_shared/discord.ts` with the message wording), the Discord tables at the end of `supabase/schema.sql`, `scripts/discord-commands.mjs`, and `.github/workflows/discord-recap.yml`.

**Setup** (once per game, except steps 1, 5 and 8). Below, `<ref>` is the Supabase project reference, `tgqwamamqcbrwpheldpi`, and `<game>` is `pecks` or `biscuit`.

1. **Database:** run all of `supabase/schema.sql` again (see **Accounts**).
2. **The app:** at [discord.com/developers/applications](https://discord.com/developers/applications), **New Application**, named after the game.
   - **General Information:** copy the **Application ID** into `DISCORD_APPS` at the top of `public/site.js`, and note the **Public Key**.
   - **OAuth2:** **Reset Secret** and note the client secret. Under Redirects, add `https://127.0.0.1`. Discord asks for one, though Activities don't use it.
   - **Bot:** **Reset Token** and note the bot token.
   - **Installation:** tick **User Install** and **Guild Install**. For Guild Install, choose the scopes `applications.commands` and `bot`, and the permissions **View Channels**, **Send Messages** and **Send Messages in Threads**.
   - **Activities → Settings:** turn on **Enable Activities**.
   - **Activities → URL Mappings:** add these, in this order (the root, `/`, has to be last):

     | Prefix           | Target                              |
     | ---------------- | ----------------------------------- |
     | `/x/supabase`    | `<ref>.supabase.co`                 |
     | `/x/goatcounter` | `barnyardbreakroom.goatcounter.com` |
     | `/x/gfonts`      | `fonts.googleapis.com`              |
     | `/x/gstatic`     | `fonts.gstatic.com`                 |
     | `/`              | `barnyardbreakroom.com`             |

3. **Secrets:** in Supabase → Edge Functions → Secrets, add `DISCORD_PECKS_APP_ID`, `DISCORD_PECKS_PUBLIC_KEY`, `DISCORD_PECKS_CLIENT_SECRET` and `DISCORD_PECKS_BOT_TOKEN`, or the same with `BISCUIT`. Never put these in the site.
4. **Functions:** deploy them with the Supabase CLI. The first time, run `npx supabase login`. Then:
   ```sh
   npx supabase functions deploy discord-interactions --no-verify-jwt --project-ref <ref>
   npx supabase functions deploy discord-activity --no-verify-jwt --project-ref <ref>
   npx supabase functions deploy discord-recap --no-verify-jwt --project-ref <ref>
   ```
   `--no-verify-jwt` is needed because these functions are called by Discord, and by players who aren't signed in to the site. Discord's signature, the player's Discord token and the recap secret protect them instead. Redeploy after changing anything in `supabase/functions/`.
5. **Recap secret:** make up a long random string. Add it as `RECAP_SECRET` in Supabase's Edge Function secrets and in GitHub (Settings → Secrets and variables → Actions). In GitHub, also add `DISCORD_RECAP_URL` with the value `https://<ref>.supabase.co/functions/v1/discord-recap`.
6. **Interactions:** in the app's **General Information**, set **Interactions Endpoint URL** to `https://<ref>.supabase.co/functions/v1/discord-interactions?game=<game>` and save. Discord checks it straight away.
7. **Commands:** `DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/discord-commands.mjs <game>` (the PowerShell form is at the top of the script). This sets up the App Launcher entry and `/pecks` or `/biscuit`, both handled by the function.
8. **Publish** the `DISCORD_APPS` change in `site.js`, then add the app to a server with the **Install Link** from **Installation**, choosing a server. Type `/pecks` in a channel to try it.

Until a game's ID is in `DISCORD_APPS`, its Activity opens on the story page instead of the game. To open an Activity that's still in development, turn on Developer Mode in Discord first (User Settings → Advanced).

## Security policy

Both pages set a Content-Security-Policy in a `<meta>` tag (GitHub Pages can't send headers). It lists what each page may load, so an injected script can't run. Inline scripts are blocked; that's why the story page's code lives in `index.js`. Inline styles are allowed because the pages and paintings use `style` attributes.

Both policies also allow the sign-in services (every page can sign in): Supabase's script (from cdn.jsdelivr.net) and API, and Google's sign-in button. Supabase's script is pinned to an exact version with an integrity hash (`SUPABASE_JS` and `SUPABASE_SRI` in `account.js`), so the browser refuses it if the CDN ever serves a different file; the comment above them says how to upgrade. Google's script can't be pinned this way, because Google changes it in place. If you move Supabase to a new project, update the `connect-src` address in `index.html` and `pecks.html` to match `CLOUD.url` in `account.js`. If something stops loading after a change, the browser console (F12) says which directive blocked it.

## Tests

```sh
npm install                       # once: installs the test runner
npx playwright install chromium   # once: the browser the tests drive
npm test                          # plays Hen Pecks and Biscuit and Marshmallow in a browser (desktop and phone sizes)
npm run test:scripts              # tests the daily story script (no API key needed)
npm run check                     # checks the Hen Pecks phrase list and pictures, and the Biscuit and Marshmallow boards
npm run lint                      # ESLint: catches mistakes like undefined names
npm run format                    # Prettier: formats the scripts, tests and config files
```

`tests/pecks.spec.js` covers pecking, winning, losing, wrong tries, hard mode and peeking, reloading mid-game, the story page's Hen Pecks card and upgrading old saved data. `tests/biscuit.spec.js` plays Biscuit and Marshmallow: tapping, dragging and keyboard swaps, green tiles staying put, solving the board and reloading mid-game. `tests/discord.spec.js` plays both games as a Discord Activity, with stand-ins for Discord and the server: signing in with Discord, sending the result, Share, links opening in the browser and the first page going on to its game. `tests/site.spec.js` covers the top bar: the menu, the light/dark switch, opening sign-in from every page, and the 404 page. The tests pin the date, so they always play the same puzzle, and they block the sign-in services so they run offline. If port 4173 is busy, run them on another port: `PORT=4180 npm test` in Git Bash or macOS/Linux, or `$env:PORT=4180; npm test` in PowerShell.

`tests/update.test.mjs` runs `scripts/update.mjs` on a copy of a small story list, with the Anthropic API and the feed replaced by `tests/fixtures/fake-anthropic.mjs`. It checks that a good story is added with its title, link and date from the feed, that old articles, repeats and links to other sites are left out, that quiet days change nothing, and that blocked feeds and bad replies (not JSON, cut off, an article not in the list, missing fields, paintings too small or too big, API errors) are refused without touching the list.

`.github/workflows/checks.yml` runs the phrase check, the lint and formatting checks, the daily script's tests, a syntax check of the Node scripts, and the browser tests on every push and pull request that touches the site, its scripts or its workflows.

## Run locally

```sh
npm start                                     # view the site at the printed address (4173, or the next free port)
ANTHROPIC_API_KEY=sk-... node scripts/update.mjs   # add today's story
```

`npx serve public` works too, and uses port 3000, the one listed in Supabase's redirect URLs, so use it to test signing in. Opening `public/index.html` directly from disk won't work, because browsers block `fetch` of local files. Serve the folder instead.

The scripts need Node 22 or newer.

## Story sources

| Key        | Source   | Feed                                  | Why it's allowed                                                          |
| ---------- | -------- | ------------------------------------- | ------------------------------------------------------------------------- |
| `mongabay` | Mongabay | news.mongabay.com/topic/animals/feed/ | CC BY-ND: summary in our own words plus a link, article text never copied |

Stories link back to the original articles. The summaries are written in Claude's own words.

**National Geographic is no longer a source.** The site's first stories came from nationalgeographic.com/animals, but National Geographic's site runs under the [Disney Terms of Use](https://disneytermsofuse.com/english/), which forbid transforming its content with AI tools, including by prompting them (section 2A), and accessing it with scripts or other automated means (section 2B(x)). The daily run did both, so it was removed. The earlier National Geographic paintings are still in `stories.json` and link to the original articles.

To try one source on its own: Actions → "Paint today's story" → **Run workflow**, and type its key in the source box. Locally: `node scripts/update.mjs mongabay`.

Before adding a source, check its terms and its robots.txt, not just robots.txt: National Geographic's robots.txt allowed Claude even though its terms don't. The Guardian's API terms forbid using its articles with AI, and The Conversation and the BBC block Claude in robots.txt. Mongabay sits behind bot protection that often turns away scripted page loads, but not its feed. That's why the list of articles comes from the feed, and why Claude falls back to the feed's opening paragraphs when it can't open an article. If the feed itself is ever turned away, the run fails with `Feed 403` and the alert issue opens.
