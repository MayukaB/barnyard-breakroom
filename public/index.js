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
  const d = document.createElement("span"); d.textContent = fmtDate(s.published); meta.appendChild(d);
  const src = document.createElement("span"); src.textContent = s.source || "National Geographic"; meta.appendChild(src);
  if (/^https:\/\//.test(s.url||"")) $("read").href = s.url;
  $("note").textContent = "";
  renderGrid();
}

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
  const d=document.createElement("small"); d.textContent=(s.animal? s.animal+" · ":"")+fmtDate(s.published); btn.appendChild(d);
  btn.onclick = () => { show(s.id); window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); };
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

/* Hen Pecks teaser + menu dot: reads the game's saved progress for today */
(() => {
  const p2 = n => String(n).padStart(2,"0"), d = new Date();
  const today = `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  let day = null;
  const { MAX_PECKS, STORE } = window.PECKS_CONFIG;
  $("teaserSub").textContent = `Crack today’s animal-related expression in ${MAX_PECKS} pecks.`;
  try { const db = JSON.parse(localStorage.getItem(STORE)) || {}; day = (db.days && db.days[today]) || null; } catch {}
  const used = day ? day.pecks.length : 0;
  const eggs = $("teaserEggs");
  for (let i = 0; i < MAX_PECKS; i++){ const e = document.createElement("i"); if (i < used) e.className = "on"; eggs.appendChild(e); }
  if (!day || day.phase === "peck" || day.phase === "solve"){
    // A dot on the menu button and on the Hen Pecks entry inside the menu.
    const menuBtn = $("menuBtn"), pecksLink = document.querySelector('.menu-page[href="pecks.html"]');
    for (const el of [menuBtn, pecksLink]){
      const dot = document.createElement("span"); dot.className = "dot"; dot.title = "Today's puzzle is waiting";
      el.appendChild(dot);
    }
    menuBtn.setAttribute("aria-label", "Open menu (today's Hen Pecks isn't finished)");
    pecksLink.setAttribute("aria-label", "Hen Pecks, today's puzzle not finished");
  }
  if (!day || !used) return;
  if (day.phase === "won"){ $("teaserTitle").textContent = "You cracked today’s Hen Pecks!"; $("teaserSub").textContent = "A new phrase arrives at midnight."; $("teaserGo").textContent = "See the answer →"; }
  else if (day.phase === "lost"){ $("teaserTitle").textContent = "Today’s phrase got away"; $("teaserSub").textContent = "A new one arrives at midnight."; $("teaserGo").textContent = "See the answer →"; }
  else { $("teaserTitle").textContent = "Your Hen Pecks game is waiting"; $("teaserSub").textContent = day.phase === "solve" ? "Out of pecks. Time to fill in the blanks!" : `${MAX_PECKS - used} peck${MAX_PECKS - used === 1 ? "" : "s"} left.`; $("teaserGo").textContent = "Keep going →"; }
})();

(async () => {
  try {
    const res = await fetch("stories.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    // Newest painting first: a source's top story can be days old when it's painted.
    const painted = s => s.addedAt || s.published || "";
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
})();
