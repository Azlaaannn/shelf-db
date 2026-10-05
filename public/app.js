// ---------- API client (talks to netlify/functions/books.mjs) ----------
const API = "/api/books";
async function call(path, opts = {}) {
  const res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    let msg = "Request failed (" + res.status + ").";
    try { msg = (await res.json()).error || msg; } catch (e) {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}
const Books = {
  all: () => call(""),
  add: b => call("", { method: "POST", body: JSON.stringify(b) }),
  put: b => call("/" + b.id, { method: "PUT", body: JSON.stringify(b) }),
  remove: id => call("/" + id, { method: "DELETE" }),
  get: async id => books.find(b => b.id === id),
};

// ---------- UI ----------
const $ = id => document.getElementById(id);
const LABELS = { want: "Want to read", reading: "Reading", read: "Read" };
let books = [], editingId = null;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.forEach(k => e.append(k));
  return e;
}
function showError(msg) {
  $("error").replaceChildren(msg ? el("div", { class: "error", role: "alert" }, msg) : "");
}
async function guard(fn) {
  try { showError(""); await fn(); }
  catch (e) { showError("The database couldn't complete that action. " + (e && e.message ? e.message : "Try again.")); }
}

async function refresh() {
  books = (await Books.all()).sort((a, b) => b.id - a.id);
  render();
}

function renderStats() {
  const count = s => books.filter(b => b.status === s).length;
  const rated = books.filter(b => b.rating > 0);
  const avg = rated.length ? (rated.reduce((n, b) => n + b.rating, 0) / rated.length).toFixed(1) : "–";
  const items = [["Books", books.length], ["Read", count("read")], ["Reading", count("reading")], ["Avg rating", avg]];
  $("stats").replaceChildren(...items.map(([l, v]) => el("div", { class: "stat" }, el("b", {}, String(v)), el("span", {}, l))));
}

function render() {
  renderStats();
  const q = $("q").value.trim().toLowerCase(), f = $("filter").value;
  const shown = books.filter(b =>
    (f === "all" || b.status === f) &&
    (!q || [b.title, b.author, b.notes].join(" ").toLowerCase().includes(q)));
  const list = $("list");
  if (!books.length) {
    list.replaceChildren(el("div", { class: "empty panel" },
      el("p", {}, "Your shelf is empty. Add your first book, or start with a few examples."),
      el("button", { onclick: () => guard(loadSamples) }, "Load sample books")));
    return;
  }
  if (!shown.length) { list.replaceChildren(el("div", { class: "empty" }, "No books match that search.")); return; }
  list.replaceChildren(...shown.map(b => {
    const stars = b.rating ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating) : "Not rated";
    return el("article", { class: "book " + b.status },
      el("h3", {}, b.title),
      el("p", { class: "meta" }, b.author || "Unknown author"),
      b.notes ? el("p", { class: "notes" }, b.notes) : "",
      el("div", { class: "bookfoot" },
        el("div", {}, el("span", { class: "badge " + b.status }, LABELS[b.status]), el("span", { class: "meta", "aria-label": "Rating" }, stars)),
        el("div", { class: "btns" },
          el("button", { onclick: () => startEdit(b.id) }, "Edit"),
          el("button", { class: "danger", onclick: () => guard(() => del(b.id)) }, "Delete"))));
  }));
}

function resetForm() {
  editingId = null;
  ["title", "author", "notes"].forEach(i => $(i).value = "");
  $("status").value = "want"; $("rating").value = "0";
  $("formTitle").textContent = "Add a book";
  $("save").textContent = "Save book"; $("cancel").hidden = true;
}
async function startEdit(id) {
  const b = await Books.get(id);
  if (!b) return;
  editingId = id;
  $("title").value = b.title; $("author").value = b.author || ""; $("notes").value = b.notes || "";
  $("status").value = b.status; $("rating").value = String(b.rating || 0);
  $("formTitle").textContent = "Edit book";
  $("save").textContent = "Update book"; $("cancel").hidden = false;
  $("title").focus();
  $("formBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
async function save() {
  const title = $("title").value.trim();
  if (!title) { showError("Enter a title before saving."); $("title").focus(); return; }
  const data = {
    title, author: $("author").value.trim(), notes: $("notes").value.trim(),
    status: $("status").value, rating: Number($("rating").value),
  };
  if (editingId != null) {
    const old = await Books.get(editingId);
    await Books.put({ ...old, ...data });
  } else await Books.add(data);
  resetForm();
  await refresh();
}
async function del(id) {
  if (!confirm("Delete this book from your shelf?")) return;
  await Books.remove(id);
  if (editingId === id) resetForm();
  await refresh();
}
async function loadSamples() {
  const s = [
    { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", status: "read", rating: 5, notes: "" },
    { title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", status: "reading", rating: 0, notes: "" },
    { title: "The Pragmatic Programmer", author: "Andrew Hunt, David Thomas", status: "want", rating: 0, notes: "" },
  ];
  for (const b of s) await Books.add(b);
  await refresh();
}

$("save").addEventListener("click", () => guard(save));
$("cancel").addEventListener("click", resetForm);
$("q").addEventListener("input", render);
$("filter").addEventListener("change", render);

guard(refresh);
