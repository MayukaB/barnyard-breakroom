# Barnyard Breakroom

The newest National Geographic animal story each morning, painted as a cute storybook watercolor.

- `index.html` is the whole site. It reads `stories.json` and draws each painting as SVG with shared watercolor filters.
- `stories.json` holds every story, newest first.
- `pecks.html` is **Hen Pecks**, a daily animal-expression puzzle. Seven pecks (one vowel or one consonant pair each), then a hint and three tries to fill in the rest. Puzzles live in the `PUZZLES` list at the top of its script, one per day from `START_DATE`; add more to the end.
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

## Run locally

```sh
npx serve .                                   # view the site at the printed address
ANTHROPIC_API_KEY=sk-... node scripts/update.mjs   # add today's story
```

Opening `index.html` directly from disk won't work, because browsers block `fetch` of local files. Serve the folder instead.

Stories link back to the original articles on National Geographic. The summaries are written in Claude's own words.
