// ---------------------------
// Config (public, not secrets)
// ---------------------------
const CONFIG = window.APP_CONFIG || null;

// ---------------------------
// DOM selectors
// ---------------------------
const els = {
  authView: document.getElementById("auth-view"),
  dashView: document.getElementById("dashboard-view"),
  logoutBtn: document.getElementById("btn-logout"),

  loginForm: document.getElementById("login-form"),
  signupForm: document.getElementById("signup-form"),
  loginMsg: document.getElementById("login-msg"),
  signupMsg: document.getElementById("signup-msg"),

  userPill: document.getElementById("user-pill"),

  addStockForm: document.getElementById("add-stock-form"),
  symbolInput: document.getElementById("symbol-input"),
  stocksTbody: document.getElementById("stocks-tbody"),

  year: document.getElementById("year"),
};

// ---------------------------
// App state
// ---------------------------
const state = {
  user: null,          // later: Supabase user object
  watchlist: [],       // later: rows from DB
};

// ---------------------------
// Helpers
// ---------------------------
function setMessage(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}

function showAuth() {
  els.authView.hidden = false;
  els.dashView.hidden = true;
  if (els.logoutBtn) els.logoutBtn.hidden = true;
}

function showDashboard() {
  els.authView.hidden = true;
  els.dashView.hidden = false;
  if (els.logoutBtn) els.logoutBtn.hidden = false;
}

// Render table rows (placeholder stats for now)
function renderWatchlist() {
  const rows = state.watchlist;

  if (!rows.length) {
    els.stocksTbody.innerHTML = `<tr><td colspan="6" class="muted">No stocks yet.</td></tr>`;
    return;
  }

  els.stocksTbody.innerHTML = rows
    .map((r) => {
      return `
        <tr>
          <td>${r.symbol}</td>
          <td>${r.highClose ?? "-"}</td>
          <td>${r.lowClose ?? "-"}</td>
          <td>${r.highOpen ?? "-"}</td>
          <td>${r.lowOpen ?? "-"}</td>
          <td>${r.updatedAt ?? "-"}</td>
        </tr>
      `;
    })
    .join("");
}

// ---------------------------
// Placeholder "auth" for Phase 1
// ---------------------------
function fakeLogin(email) {
  state.user = { email };
  els.userPill.textContent = email;
  showDashboard();
}

function logout() {
  state.user = null;
  state.watchlist = [];
  els.userPill.textContent = "";
  renderWatchlist();
  showAuth();
}

// ---------------------------
// Event wiring
// ---------------------------
function bindEvents() {
  els.loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(els.loginForm);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    // Phase 1: fake
    if (!email || !password) return setMessage(els.loginMsg, "Email + password required.");
    setMessage(els.loginMsg, "");
    fakeLogin(email);
  });

  els.signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(els.signupForm);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    // Phase 1: fake
    if (!email || !password) return setMessage(els.signupMsg, "Email + password required.");
    setMessage(els.signupMsg, "");
    fakeLogin(email);
  });

  els.logoutBtn?.addEventListener("click", () => logout());

  els.addStockForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const symbol = (els.symbolInput.value || "").trim().toUpperCase();
    if (!symbol) return;

    // Phase 1: add locally (later: insert into Supabase)
    if (state.watchlist.some((s) => s.symbol === symbol)) {
      els.symbolInput.value = "";
      return;
    }

    state.watchlist.unshift({
      symbol,
      highClose: null,
      lowClose: null,
      highOpen: null,
      lowOpen: null,
      updatedAt: new Date().toLocaleString(),
    });

    els.symbolInput.value = "";
    renderWatchlist();
  });
}

// ---------------------------
// Boot
// ---------------------------
function init() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());

  // If config is missing, just warn (Phase 1 is UI-only)
  if (!CONFIG) {
    console.warn("Missing public/config.js — UI will still work, Supabase wiring later.");
  }

  bindEvents();
  showAuth();
  renderWatchlist();
}

init();
