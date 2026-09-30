#!/usr/bin/env bash
# Runs at the end of the daily workflow.
# Opens a GitHub issue when the run breaks, or when the site stops getting new
# stories, and closes it again after the next run that works. GitHub emails the
# repo owner about new issues and comments, so problems don't go unnoticed.
#
# Expects: GH_TOKEN, UPDATE and DEPLOY (the two jobs' results), RUN_URL.
set -euo pipefail

LABEL="daily-story-alert"
STALE_DAYS=4

newest=$(node -e 'const s = require("./public/stories.json"); console.log(s.map(x => x.addedAt || x.published || "").sort().pop() || "")')
days=$(node -e 'const d = process.argv[1]; console.log(d ? Math.floor((Date.now() - Date.parse(d + "T12:00:00Z")) / 864e5) : 999)' "$newest")

problem=""
kind=""
if [ "$UPDATE" != "success" ]; then
  kind="broken"; problem="The daily update ended with **$UPDATE**. Open the run log to see the error."
elif [ "$DEPLOY" != "success" ]; then
  kind="broken"; problem="The story updated, but publishing the site ended with **$DEPLOY**."
elif [ "$days" -ge "$STALE_DAYS" ]; then
  kind="stale"; problem="No new story has been added for **$days days** (newest: $newest). The runs themselves are working, so either no source has posted a new animal story, or a news page's layout has changed or started blocking the fetch. The run log shows each source's reason."
fi

gh label create "$LABEL" --color D39A2F --description "The daily story run needs attention" --force >/dev/null
open=$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')

if [ -n "$problem" ]; then
  echo "::warning::$problem"
  body="$problem

Run: $RUN_URL"
  if [ -z "$open" ]; then
    gh issue create --title "Daily story needs attention" --label "$LABEL" --body "$body

This issue closes itself after the next run that works."
  elif [ "$kind" = "broken" ]; then
    # Already open: add today's failure. Stale days don't comment again, to avoid daily noise.
    gh issue comment "$open" --body "$body"
  fi
elif [ -n "$open" ]; then
  gh issue close "$open" --comment "Working again: today's run succeeded and the newest story is from $newest. $RUN_URL"
fi
