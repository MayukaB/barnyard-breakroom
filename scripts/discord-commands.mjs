// Sets up a game's Discord commands: the App Launcher's entry point ("Launch") and a slash command
// (/pecks or /biscuit). Both are sent to the discord-interactions function (handler 1, APP_HANDLER), which
// opens the Activity and posts "<name> is playing …", instead of Discord opening it by itself.
// Run once per app, and again after changing the commands below:
//   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/discord-commands.mjs pecks
// (PowerShell: $env:DISCORD_APP_ID="..."; $env:DISCORD_BOT_TOKEN="..."; node scripts/discord-commands.mjs pecks)
// It replaces the app's whole command list with these two.
const GAMES = {
  pecks: "Play today’s Hen Pecks, the daily animal-expression puzzle",
  biscuit: "Play today’s Biscuit and Marshmallow, the daily word grid puzzle",
};

const game = process.argv[2];
const { DISCORD_APP_ID: appId, DISCORD_BOT_TOKEN: botToken } = process.env;
if (!GAMES[game] || !appId || !botToken) {
  console.error("Usage: DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/discord-commands.mjs pecks|biscuit");
  process.exit(1);
}

// Usable in servers (0), and as a user-installed app (1); in servers, DMs with the bot (1) and other DMs (2).
const where = { integration_types: [0, 1], contexts: [0, 1, 2] };
const commands = [
  { name: "launch", description: GAMES[game], type: 4, handler: 1, ...where },
  { name: game, description: GAMES[game], type: 1, ...where },
];

const r = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
const body = await r.json().catch(() => null);
if (!r.ok) {
  console.error(`Discord said ${r.status}:`, JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log(`Set ${body.map((c) => (c.type === 4 ? "the entry point" : "/" + c.name)).join(" and ")} for ${game}.`);
