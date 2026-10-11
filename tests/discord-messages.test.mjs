// Tests for the wording the Discord functions share (supabase/functions/_shared/messages.ts): the recaps posted
// each morning and shown by /recap, and the date /recap takes. Node runs the TypeScript file as it is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { recap, recapDate } from "../supabase/functions/_shared/messages.ts";

const pecks = (outcome, extra = {}) => ({
  game: "pecks",
  date: "2026-10-05",
  no: 9,
  outcome,
  hits: [true, false, true],
  hard: false,
  ...extra,
});
const row = (id, result, created_at = "2026-10-05T10:00:00Z") => ({
  user_id: id,
  display_name: `name${id}`,
  result,
  created_at,
});
const ID = (n) => String(100000000000000000n + BigInt(n)); // a Discord-style user id

test("a recap lists a channel's players best first, with medals and ties", () => {
  const text = recap(
    "pecks",
    "2026-10-05",
    [
      row(ID(1), pecks("t2")),
      row(ID(2), pecks("t1"), "2026-10-05T09:00:00Z"),
      row(ID(3), pecks("t1"), "2026-10-05T11:00:00Z"),
      row(ID(4), pecks("miss")),
    ],
    "2026-10-08",
  );
  const lines = text.split("\n");
  assert.equal(lines[0], "🐔 **Hen Pecks** · #9 · Mon, Oct 5");
  assert.match(lines[2], new RegExp(`^1\\\\\\. 🥇 <@${ID(2)}> cracked it on try 1 of 3`));
  assert.match(lines[3], new RegExp(`^1\\\\\\. 🥇 <@${ID(3)}> `), "a tie shares the place");
  assert.match(lines[4], new RegExp(`^3\\\\\\. 🥉 <@${ID(1)}> cracked it on try 2 of 3`));
  assert.match(lines[5], new RegExp(`^4\\\\\\. <@${ID(4)}> the phrase got away`), "no medal for a miss");
  assert.equal(lines.at(-1), "4 players · Today's puzzle is ready, press **Play**!");
});

test("the heading says today so far, yesterday, or just the game", () => {
  const one = [row(ID(1), pecks("t1"))];
  assert.match(
    recap("pecks", "2026-10-05", one, "2026-10-05"),
    /^🐔 \*\*Today's Hen Pecks so far\*\* · #9 · Mon, Oct 5/,
  );
  assert.match(recap("pecks", "2026-10-05", one, "2026-10-06"), /^🐔 \*\*Yesterday's Hen Pecks\*\*/);
  assert.match(recap("pecks", "2026-10-05", one, "2026-10-20"), /^🐔 \*\*Hen Pecks\*\* · #9/);
  // /recap passes null: results are filed under each player's own date, so it just names the game.
  assert.match(recap("pecks", "2026-10-05", one, null), /^🐔 \*\*Hen Pecks\*\* · #9 · Mon, Oct 5/);
  // Across a month's end.
  assert.match(
    recap("pecks", "2026-09-30", [row(ID(1), pecks("t1", { date: "2026-09-30" }))], "2026-10-01"),
    /Yesterday's/,
  );
});

test("a Biscuit and Marshmallow recap ranks by swaps and names the board", () => {
  const b = (moves) => ({ game: "biscuit", date: "2026-10-05", no: 4, shape: "Zig-zag", moves, par: 20 });
  const text = recap("biscuit", "2026-10-05", [row(ID(1), b(25)), row(ID(2), b(18))], "2026-10-09");
  assert.match(text, /^🐱 \*\*Biscuit and Marshmallow\*\* · #4 Zig-zag · Mon, Oct 5/);
  assert.match(text, new RegExp(`1\\\\\\. 🥇 <@${ID(2)}> 18 swaps, 2 under par  ⭐⭐⭐`));
  assert.match(text, new RegExp(`2\\\\\\. 🥈 <@${ID(1)}> 25 swaps, 5 over par  ⭐⭐☆`));
});

test("a player without a Discord-style id is named instead, with formatting characters escaped", () => {
  const text = recap("pecks", "2026-10-05", [{ ...row("x", pecks("t1")), display_name: "**bold**" }], "2026-10-09");
  assert.match(text, /\*\*\\\*\\\*bold\\\*\\\*\*\* cracked it/);
});

test("a very busy day stays under Discord's message limit", () => {
  const players = Array.from({ length: 200 }, (_, n) => row(ID(n), pecks("t1")));
  const text = recap("pecks", "2026-10-05", players, "2026-10-09");
  assert.ok(text.length <= 2000, `${text.length} characters`);
  assert.match(text, /…and \d+ more\n/);
  assert.match(text, /200 players · /);
});

test("/recap takes a real date like 2026-10-05, or nothing for the latest", () => {
  assert.equal(recapDate("2026-10-05"), "2026-10-05");
  assert.equal(recapDate(" 2026-10-05 "), "2026-10-05");
  assert.equal(recapDate(undefined), undefined);
  assert.equal(recapDate(""), undefined);
  for (const bad of ["2026-02-30", "2026-13-01", "5 Oct", "2026/10/05", "yesterday"])
    assert.equal(recapDate(bad), null, bad);
});
