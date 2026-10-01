/* Tremendous Platform Upgrade Gate Console (synthetic demo).
   Loads a synthetic platform backlog item, shows blast radius and a cited
   impact packet, then pauses at a human gate: Ship this week, Hold for
   compliance evidence, Split into safer milestones, or Escalate to the
   Head of Product. Data comes from data.json; nothing ships, nothing
   leaves the browser, and no model runs here. */

"use strict";

const state = {
  items: [],
  kpis: null,
  currentId: null,
  decisions: {} /* itemId -> gate name chosen */,
  lastDecidedId: null
};

const GATES = ["ship", "hold", "split", "escalate"];

const GATE_META = {
  ship: { label: "Ship this week", cls: "button-primary" },
  hold: { label: "Hold for compliance evidence", cls: "button-ghost" },
  split: { label: "Split into safer milestones", cls: "button-ghost" },
  escalate: { label: "Escalate to Head of Product", cls: "button-ghost" }
};

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function currentItem() {
  return state.items.find((item) => item.id === state.currentId);
}

/* ---------- load ---------- */

async function loadData() {
  const response = await fetch("data.json");
  if (!response.ok) {
    throw new Error("Failed to load platform data (HTTP " + response.status + ")");
  }
  const payload = await response.json();
  state.items = payload.items;
  state.kpis = payload.kpis;
}

/* ---------- item grid ---------- */

function renderItemGrid() {
  const grid = document.getElementById("item-grid");
  grid.textContent = "";

  for (const item of state.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item-tile";
    button.setAttribute("aria-pressed", "false");
    button.dataset.itemId = item.id;

    const top = document.createElement("div");
    top.className = "tile-top";
    const id = document.createElement("span");
    id.className = "tile-id";
    id.textContent = item.id;
    const chip = document.createElement("span");
    chip.className = "chip " + item.areaCls;
    chip.textContent = item.area;
    top.append(id, chip);

    const title = document.createElement("p");
    title.className = "tile-title";
    title.textContent = item.title;

    const meta = document.createElement("p");
    meta.className = "tile-meta";
    meta.textContent = "Touches " + item.blast.teams.join(", ");

    button.append(top, title, meta);
    button.addEventListener("click", () => selectItem(item.id));
    grid.append(button);
  }
}

function setActiveTile() {
  for (const tile of document.querySelectorAll(".item-tile")) {
    const active = tile.dataset.itemId === state.currentId;
    tile.classList.toggle("active", active);
    tile.setAttribute("aria-pressed", String(active));
  }
}

/* ---------- selection ---------- */

function selectItem(itemId) {
  state.currentId = itemId;
  setActiveTile();
  renderConsole(currentItem());
  const consoleEl = document.getElementById("console");
  consoleEl.classList.remove("hidden");
  consoleEl.focus();
  announce("Loaded " + itemId + ". Blast radius and cited impact packet are ready. Item is paused at the human gate.");
}

function resetDemo() {
  state.currentId = null;
  state.decisions = {};
  state.lastDecidedId = null;
  const consoleEl = document.getElementById("console");
  consoleEl.classList.add("hidden");
  for (const tile of document.querySelectorAll(".item-tile")) {
    tile.classList.remove("active");
    tile.setAttribute("aria-pressed", "false");
  }
  renderKpis();
  showToast("Demo reset. Choose a synthetic item to start.");
}

/* ---------- console render ---------- */

function renderConsole(item) {
  renderHeader(item);
  renderBlast(item);
  renderImpact(item);
  renderGate(item);
  renderResult(item);
  renderKpis();
}

function renderHeader(item) {
  const root = document.getElementById("item-header");
  root.className = "item-header";
  root.textContent = "";

  const left = document.createElement("div");
  left.className = "header-left";

  const id = document.createElement("p");
  id.className = "item-id";
  id.textContent = "Platform " + item.id;

  const title = document.createElement("h2");
  title.className = "item-title";
  title.id = "item-title";
  title.textContent = item.title;

  const problem = document.createElement("p");
  problem.className = "item-problem";
  problem.textContent = item.problem;

  const specs = document.createElement("div");
  specs.className = "specs";
  for (const [label, value] of [
    ["Area", item.area],
    ["Teams", item.blast.teams.join(", ")],
    ["Send paths", String(item.blast.paths.length) + " paths"]
  ]) {
    const spec = document.createElement("span");
    spec.className = "spec";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const text = document.createElement("span");
    text.textContent = value;
    spec.append(strong, text);
    specs.append(spec);
  }

  left.append(id, title, problem, specs);
  root.append(left);
}

function renderBlast(item) {
  const root = document.getElementById("blast");
  root.textContent = "";

  const box = document.createElement("div");
  box.className = "blast";

  const summary = document.createElement("p");
  summary.className = "blast-summary";
  summary.textContent = item.blast.summary;

  const row = document.createElement("div");
  row.className = "blast-row";

  const left = document.createElement("div");
  const label = document.createElement("p");
  label.className = "blast-label";
  label.textContent = "Payout send paths affected";
  const tags = document.createElement("div");
  tags.className = "blast-tags";
  for (const path of item.blast.paths) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = path;
    tags.append(pill);
  }
  left.append(label, tags);

  const right = document.createElement("div");
  const teamsLabel = document.createElement("p");
  teamsLabel.className = "blast-label";
  teamsLabel.textContent = "Teams in scope";
  const teams = document.createElement("div");
  teams.className = "blast-tags";
  for (const team of item.blast.teams) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = team;
    teams.append(pill);
  }
  right.append(teamsLabel, teams);

  row.append(left, right);
  box.append(summary, row);
  root.append(box);
}

function renderImpact(item) {
  const root = document.getElementById("impact");
  root.textContent = "";

  const list = document.createElement("div");
  list.className = "impact-list";

  for (const entry of item.impact) {
    const card = document.createElement("div");
    card.className = "impact-card";

    const head = document.createElement("div");
    head.className = "impact-head";
    const chip = document.createElement("span");
    chip.className = "chip " + entry.cls;
    chip.textContent = entry.kind;
    const label = document.createElement("span");
    label.className = "impact-label";
    label.textContent = entry.label;
    head.append(chip, label);

    const text = document.createElement("p");
    text.className = "impact-text";
    text.textContent = entry.text;

    const cite = document.createElement("span");
    cite.className = "impact-cite";
    cite.textContent = "Source: " + entry.cite;

    card.append(head, text, cite);
    list.append(card);
  }

  root.append(list);
}

/* ---------- human gate ---------- */

function renderGate(item) {
  const root = document.getElementById("gate");
  root.textContent = "";

  const decided = state.decisions[item.id];

  if (decided) {
    const box = document.createElement("div");
    box.className = "result-box";
    const head = document.createElement("div");
    head.className = "result-head";
    const t = document.createElement("p");
    t.className = "result-title";
    t.textContent = "Gate decided: " + GATE_META[decided].label;
    const chip = document.createElement("span");
    chip.className = "chip " + outcomeOf(item, decided).chip;
    chip.textContent = outcomeOf(item, decided).status;
    head.append(t, chip);

    const line = document.createElement("p");
    line.className = "result-line";
    line.textContent = outcomeOf(item, decided).oneLine;

    const change = document.createElement("button");
    change.type = "button";
    change.className = "button button-quiet";
    change.style.maxWidth = "280px";
    change.textContent = "Change decision";
    change.addEventListener("click", () => {
      delete state.decisions[item.id];
      renderGate(item);
      renderResult(item);
      renderKpis();
    });

    box.append(head, line, change);
    root.append(box);
    return;
  }

  const copy = document.createElement("p");
  copy.className = "gate-copy";
  copy.textContent =
    "Nothing changes on the payout platform until a human picks a gate. The item stays open; the packet travels with the decision in the async thread.";

  const buttons = document.createElement("div");
  buttons.className = "gate-buttons";

  for (const gate of GATES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button " + GATE_META[gate].cls;
    button.textContent = GATE_META[gate].label;
    button.addEventListener("click", () => decide(item.id, gate));
    buttons.append(button);
  }

  const hint = document.createElement("p");
  hint.className = "gate-hint";
  hint.textContent =
    "This demo lets any gate be chosen to show each path. In the real flow the packet would flag which gate fits: evidence complete, evidence missing, too large, or blocked on people.";

  root.append(copy, buttons, hint);
}

function decide(itemId, gate) {
  state.decisions[itemId] = gate;
  state.lastDecidedId = itemId;
  const item = currentItem();
  renderGate(item);
  renderResult(item);
  renderKpis();
  showToast(GATE_META[gate].label + " recorded for " + itemId + ".");
  announce(
    GATE_META[gate].label + " recorded for " + itemId + ". " +
    outcomeOf(item, gate).oneLine
  );
}

/* ---------- result ---------- */

function outcomeOf(item, gate) {
  const key = {
    ship: "shipOutcome",
    hold: "holdOutcome",
    split: "splitOutcome",
    escalate: "escalateOutcome"
  }[gate];
  return item[key];
}

function renderResult(item) {
  const block = document.getElementById("result-block");
  const root = document.getElementById("result");
  root.textContent = "";

  const gate = state.decisions[item.id];
  if (!gate) {
    block.classList.add("hidden");
    return;
  }

  const outcome = outcomeOf(item, gate);
  block.classList.remove("hidden");

  const box = document.createElement("div");
  box.className = "result-box";

  const head = document.createElement("div");
  head.className = "result-head";
  const title = document.createElement("p");
  title.className = "result-title";
  title.textContent = outcome.status;
  const chip = document.createElement("span");
  chip.className = "chip " + outcome.chip;
  chip.textContent = item.id + " " + outcome.status.split(" ")[0].toLowerCase();
  head.append(title, chip);

  const line = document.createElement("p");
  line.className = "result-line";
  line.textContent = outcome.oneLine;

  box.append(head, line);

  if (gate === "hold") {
    const docsTitle = document.createElement("p");
    docsTitle.className = "blast-label";
    docsTitle.textContent = "Missing compliance evidence";
    const docs = document.createElement("ul");
    docs.className = "result-list";
    for (const doc of item.holdDocs) {
      const li = document.createElement("li");
      li.textContent = doc;
      docs.append(li);
    }
    box.append(docsTitle, docs);
  }

  if (gate === "split") {
    const msTitle = document.createElement("p");
    msTitle.className = "blast-label";
    msTitle.textContent = "Safer milestones";
    const ms = document.createElement("ul");
    ms.className = "result-list";
    for (const m of item.milestones) {
      const li = document.createElement("li");
      li.textContent = m;
      ms.append(li);
    }
    box.append(msTitle, ms);
  }

  if (gate === "escalate") {
    const handoff = document.createElement("p");
    handoff.className = "result-line";
    handoff.textContent = item.escalateNote;
    box.append(handoff);
  }

  const notesTitle = document.createElement("p");
  notesTitle.className = "blast-label";
  notesTitle.textContent = "What happens next";
  const notes = document.createElement("ul");
  notes.className = "result-list";
  for (const note of outcome.notes) {
    const li = document.createElement("li");
    li.textContent = note;
    notes.append(li);
  }
  box.append(notesTitle, notes);

  root.append(box);
}

/* ---------- platform KPIs ---------- */

function renderKpis() {
  const root = document.getElementById("kpis");
  root.textContent = "";

  const deltas = (state.lastDecidedId && state.decisions[state.lastDecidedId])
    ? outcomeOf(
        state.items.find((item) => item.id === state.lastDecidedId),
        state.decisions[state.lastDecidedId]
      ).kpis
    : null;

  const tiles = [
    ["sev", "sev"],
    ["reliability", "reliability"],
    ["cycle", "cycle"]
  ];

  for (const [key, kpiKey] of tiles) {
    const kpi = state.kpis[kpiKey];
    const tile = document.createElement("div");
    tile.className = "kpi";

    const label = document.createElement("p");
    label.className = "kpi-label";
    label.textContent = kpi.label;

    const value = document.createElement("p");
    value.className = "kpi-value";
    value.textContent = kpi.value;

    tile.append(label, value);

    if (deltas && deltas[key]) {
      const delta = document.createElement("p");
      delta.className = "kpi-delta";
      const flat = deltas[key].includes("unchanged") || deltas[key].includes("holds") || deltas[key].includes("protected");
      delta.classList.add(flat ? "delta-flat" : "delta-good");
      delta.textContent = "After gate: " + deltas[key];
      tile.append(delta);
    }

    root.append(tile);
  }
}

/* ---------- toast and a11y ---------- */

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function announce(message) {
  const region = document.getElementById("live-region");
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/* ---------- init ---------- */

const resetButton = document.getElementById("reset");
resetButton.addEventListener("click", resetDemo);

async function init() {
  try {
    await loadData();
    renderItemGrid();
    renderKpis();
  } catch (error) {
    document.querySelector(".hero .tagline").textContent =
      "Failed to load demo data. Check that data.json sits next to index.html.";
    showToast("Demo data failed to load: " + error.message);
  }
}

init();
