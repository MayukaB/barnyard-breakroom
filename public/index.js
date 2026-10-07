/* Story page: paints the day's story, the archive and the Hen Pecks card. */
const SAFE_TAGS = new Set(["g","path","circle","ellipse","rect","line","polyline","polygon"]);
const SAFE_ATTRS = new Set(["d","cx","cy","r","rx","ry","x","y","x1","y1","x2","y2","width","height","points","fill","fill-opacity","stroke","stroke-width","stroke-opacity","stroke-linecap","stroke-linejoin","opacity","transform","filter","fill-rule"]);
const OK_FILTER = /^url\(#(wc|wash|line)\)$/;

function paint(svg, scene){
  svg.textContent = "";
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${scene||""}</svg>`, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg") return;
  const bg = document.createElementNS("http://www.w3.org/2000/svg","rect");
  bg.setAttribute("width","400"); bg.setAttribute("height","300"); bg.setAttribute("fill","#FBF7EE");
  svg.appendChild(bg);
  const clean = (node, parent) => {
    for (const child of [...node.children]) {
      const tag = child.localName;
      if (!SAFE_TAGS.has(tag)) continue;
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const a of child.attributes) {
        if (!SAFE_ATTRS.has(a.name)) continue;
        const v = a.value;
        if (a.name === "filter" && !OK_FILTER.test(v.trim())) continue;
        if (/url\(|javascript:/i.test(v) && a.name !== "filter") continue;
        el.setAttribute(a.name, v);
      }
      parent.appendChild(el);
      if (tag === "g") clean(child, el);
    }
  };
  clean(root, svg);
  const g = document.createElementNS("http://www.w3.org/2000/svg","rect");
  g.setAttribute("width","400"); g.setAttribute("height","300"); g.setAttribute("filter","url(#grain)");
  g.setAttribute("style","mix-blend-mode:multiply");
  svg.appendChild(g);
}

const $ = id => document.getElementById(id);
let stories = [], currentId = null;

function fmtDate(iso){
  try { return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}); }
  catch { return iso || ""; }
}

function show(id){
  if (history.replaceState && stories[0] && id !== stories[0].id) history.replaceState(null, "", "#" + id); else if (history.replaceState) history.replaceState(null, "", location.pathname);
  const s = stories.find(x => x.id === id) || stories[0];
  if (!s) return;
  currentId = s.id;
  paint($("hero"), s.scene);
  $("hero").setAttribute("aria-label", "Watercolor painting: " + (s.alt || s.animal || s.title));
  $("caption").textContent = s.caption || "";
  $("headline").textContent = s.title;
  $("summary").textContent = s.summary || "";
  $("summary").classList.remove("empty");
  const meta = $("meta"); meta.textContent = "";
  const b = document.createElement("b"); b.textContent = s.animal || "Animals"; meta.appendChild(b);
  // The same painted date as the archive cards; the article's own date goes with its source when they differ.
  const d = document.createElement("span"); d.textContent = "Painted " + fmtDate(painted(s)); meta.appendChild(d);
  // A story without a source name is credited to the site its link goes to.
  let from = s.source;
  if (!from) try { from = new URL(s.url).hostname.replace(/^www\./, ""); } catch {}
  const src = document.createElement("span"); src.textContent = from || "";
  if (s.published && s.published !== painted(s)) src.textContent += `${from ? " story" : "Story"} from ${fmtDate(s.published)}`;
  if (src.textContent) meta.appendChild(src);
  if (/^https:\/\//.test(s.url||"")) $("read").href = s.url;
  $("note").textContent = "";
  // An earlier story says so, with a way back to today's.
  const earlier = s.id !== stories[0].id;
  $("earlier").hidden = !earlier;
  if (earlier) $("earlierText").textContent = "This is an earlier page.";
  renderGrid();
}
// Paintings are dated by the day they were painted: a source's top story can be days old by then.
const painted = s => s.addedAt || s.published || "";
// After switching stories, put keyboard focus on the new headline (the card or button clicked is gone).
function focusHeadline(){ const h = $("headline"); h.tabIndex = -1; h.focus({preventScroll: true}); }
$("backToday").addEventListener("click", () => { show(stories[0].id); focusHeadline(); });

/* Earlier pages: the archive shows PAGE_SIZE paintings at first and PAGE_SIZE more per click,
   so the page stays quick however many stories pile up. */
const PAGE_SIZE = 12;
let gridShown = PAGE_SIZE;

function makeCard(s){
  const btn = document.createElement("button"); btn.className="card"; btn.type="button";
  const mini = document.createElement("div"); mini.className="mini";
  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 400 300");
  mini.appendChild(svg); btn.appendChild(mini); paint(svg, s.scene);
  const t=document.createElement("strong"); t.textContent=s.title; btn.appendChild(t);
  const d=document.createElement("small"); d.textContent=(s.animal? s.animal+" · ":"")+fmtDate(painted(s)); btn.appendChild(d);
  btn.onclick = () => { show(s.id); focusHeadline(); window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); };
  return btn;
}

function renderGrid(){
  const grid = $("grid"); grid.textContent = "";
  const rest = stories.filter(s => s.id !== currentId);
  if (!rest.length){ const p=document.createElement("p"); p.className="empty"; p.textContent="Older paintings collect here as new stories arrive."; grid.appendChild(p); $("more").hidden = true; return; }
  for (const s of rest.slice(0, gridShown)) grid.appendChild(makeCard(s));
  updateMore(rest.length);
}

function updateMore(total){
  const left = total - Math.min(gridShown, total), btn = $("more");
  btn.hidden = left <= 0;
  btn.textContent = `Show ${Math.min(PAGE_SIZE, left)} more`;
  btn.setAttribute("aria-label", `Show ${Math.min(PAGE_SIZE, left)} more earlier pages (${left} left)`);
}

// Adds the next page of cards without redrawing the ones already there,
// and moves keyboard focus to the first new card.
$("more").addEventListener("click", () => {
  const rest = stories.filter(s => s.id !== currentId);
  const next = rest.slice(gridShown, gridShown + PAGE_SIZE).map(makeCard);
  next.forEach(c => $("grid").appendChild(c));
  gridShown += PAGE_SIZE;
  updateMore(rest.length);
  if (next[0]) next[0].focus({preventScroll: true});
});

/* Game cards + menu dots: read each game's saved progress for today */
const p2 = n => String(n).padStart(2,"0"), now = new Date();
const today = `${now.getFullYear()}-${p2(now.getMonth()+1)}-${p2(now.getDate())}`;
// A dot on a game's menu entry while today's game isn't finished, and one on the menu button for them all.
const unfinished = [];
function markUnfinished(name, href){
  const link = document.querySelector(`.menu-page[href="${href}"]`);
  const dot = () => { const el = document.createElement("span"); el.className = "dot"; el.title = "Today's puzzle is waiting"; return el; };
  if (link){ link.appendChild(dot()); link.setAttribute("aria-label", `${name}, today's puzzle not finished`); }
  const menuBtn = $("menuBtn");
  if (!unfinished.length) menuBtn.appendChild(dot());
  unfinished.push(name);
  menuBtn.setAttribute("aria-label", `Open menu (today's ${unfinished.join(" and ")} ${unfinished.length === 1 ? "isn't" : "aren't"} finished)`);
}

/* Hen Pecks card */
(() => {
  let day = null;
  const { MAX_PECKS, STORE } = window.PECKS_CONFIG;
  $("teaserSub").textContent = `Crack today’s animal-related expression in ${MAX_PECKS} pecks.`;
  try { const db = JSON.parse(localStorage.getItem(STORE)) || {}; day = (db.days && db.days[today]) || null; } catch {}
  const used = day ? day.pecks.length : 0;
  const eggs = $("teaserEggs");
  for (let i = 0; i < MAX_PECKS; i++){ const e = document.createElement("i"); if (i < used) e.className = "on"; eggs.appendChild(e); }
  if (!day || day.phase === "peck" || day.phase === "solve") markUnfinished("Hen Pecks", "pecks.html");
  if (!day || !used) return;
  if (day.phase === "won"){ $("teaserTitle").textContent = "You cracked today’s Hen Pecks!"; $("teaserSub").textContent = "A new phrase arrives at midnight."; $("teaserGo").textContent = "See the answer →"; }
  else if (day.phase === "lost"){ $("teaserTitle").textContent = "Today’s phrase got away"; $("teaserSub").textContent = "A new one arrives at midnight."; $("teaserGo").textContent = "See the answer →"; }
  else { $("teaserTitle").textContent = "Your Hen Pecks game is waiting"; $("teaserSub").textContent = day.phase === "solve" ? "Out of pecks. Time to fill in the blanks!" : `${MAX_PECKS - used} peck${MAX_PECKS - used === 1 ? "" : "s"} left.`; $("teaserGo").textContent = "Keep going →"; }
})();

/* Biscuit and Marshmallow card (biscuit.js saves today's board under "biscuit:v1") */
(() => {
  let day = null;
  try { const db = JSON.parse(localStorage.getItem("biscuit:v1")) || {}; day = (db.days && db.days[today]) || null; } catch {}
  if (!day || !day.done) markUnfinished("Biscuit and Marshmallow", "biscuit.html");
  if (!day || !day.moves) return;
  const swaps = `${day.moves} swap${day.moves === 1 ? "" : "s"}`;
  if (day.done){
    $("bmTitle").textContent = "You reunited Biscuit and Marshmallow!";
    $("bmSub").textContent = `Solved in ${swaps}. A new board arrives at midnight.`;
    $("bmGo").textContent = "See your result →";
  } else {
    $("bmTitle").textContent = "Biscuit and Marshmallow are waiting";
    $("bmSub").textContent = `${swaps} so far. Keep swapping to bring them back together.`;
    $("bmGo").textContent = "Keep going →";
  }
})();

(async () => {
  try {
    const res = await fetch("stories.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    // Newest painting first.
    stories = (await res.json()).sort((a, b) => painted(b).localeCompare(painted(a)) || (b.published || "").localeCompare(a.published || ""));
  } catch {
    $("headline").textContent = "The storybook couldn't open";
    $("summary").textContent = "stories.json didn't load. If you opened index.html straight from disk, serve the folder instead (for example: npx serve .).";
    $("caption").textContent = "";
    return;
  }
  if (!stories.length) { $("headline").textContent = "No stories yet"; $("summary").textContent = "The first painting arrives with the next morning's story."; $("caption").textContent = ""; return; }
  const want = location.hash.slice(1);
  show(stories.some(s => s.id === want) ? want : stories[0].id);
  // A story link opened while the page is already up (show() itself uses replaceState, which doesn't fire this).
  addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id === currentId) return;
    show(stories.some(s => s.id === id) ? id : stories[0].id);
    focusHeadline();
    window.scrollTo({ top: 0 });
  });
})();
