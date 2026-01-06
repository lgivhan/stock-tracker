// ============================================
// STOCK TRACKER - Main Application Logic
// ============================================

// Initialize Supabase client
const supabaseClient = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_PUBLISHABLE_KEY
);

// DOM Elements - Views
const loginView = document.getElementById("login-view");
const signupView = document.getElementById("signup-view");
const forgotView = document.getElementById("forgot-view");
const dashboardView = document.getElementById("dashboard-view");

// DOM Elements - Forms
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const forgotForm = document.getElementById("forgot-form");
const addStockForm = document.getElementById("add-stock-form");

// DOM Elements - Messages
const loginMsg = document.getElementById("login-msg");
const signupMsg = document.getElementById("signup-msg");
const forgotMsg = document.getElementById("forgot-msg");
const userPill = document.getElementById("user-pill");

// DOM Elements - Buttons & Links
const logoutBtn = document.getElementById("btn-logout");

// Track API calls per Alpha Vantage Free Stock API limit
let apiCallsToday = 0;
const MAX_API_CALLS = 25;

// Calculate last data update
function getRelativeTime(dateString) {
  if (!dateString) return "Never";

  const now = new Date();
  const updated = new Date(dateString);
  const diffInSeconds = Math.floor((now - updated) / 1000);

  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return updated.toLocaleDateString(); // Fallback for older data
}

// Track API call count per limit
function updateApiCounter() {
  const counterEl = document.getElementById('api-counter');
  if (counterEl) {
    counterEl.textContent = `API calls today: ${apiCallsToday}/${MAX_API_CALLS}`;
    if (apiCallsToday >= MAX_API_CALLS) {
      counterEl.style.color = '#ef4444'; // red
    }
  }
}

// ============================================
// VIEW SWITCHING
// ============================================

function showLoginView() {
  loginView.hidden = false;
  signupView.hidden = true;
  forgotView.hidden = true;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
}

function showSignupView() {
  loginView.hidden = true;
  signupView.hidden = false;
  forgotView.hidden = true;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
}

function showForgotView() {
  loginView.hidden = true;
  signupView.hidden = true;
  forgotView.hidden = false;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
}

function showDashboardView(user) {
  loginView.hidden = true;
  signupView.hidden = true;
  forgotView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;

  // Display user email
  userPill.textContent = user.email;

  // Load user's watchlist
  loadWatchlist();
}

// ============================================
// AUTHENTICATION
// ============================================

// Check if user is already logged in
async function checkAuth() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (user) {
    showDashboardView(user);
  } else {
    showLoginView();
  }
}

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "Logging in...";

  const email = loginForm.email.value;
  const password = loginForm.password.value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginMsg.textContent = `Error: ${error.message}`;
    loginMsg.style.color = "#ef4444";
  } else {
    loginMsg.textContent = "Success! Loading dashboard...";
    loginMsg.style.color = "#10b981";
    showDashboardView(data.user);
  }
});

// Sign Up
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupMsg.textContent = "Creating account...";

  const email = signupForm.email.value;
  const password = signupForm.password.value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    signupMsg.textContent = `Error: ${error.message}`;
    signupMsg.style.color = "#ef4444";
  } else {
    signupMsg.textContent =
      "Success! Please check your inbox for a confirmation email to login!";
    signupMsg.style.color = "#10b981";
  }
});

// Forgot Password
forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  forgotMsg.textContent = "Sending reset link...";

  const email = forgotForm.email.value;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) {
    forgotMsg.textContent = `Error: ${error.message}`;
    forgotMsg.style.color = "#ef4444";
  } else {
    forgotMsg.textContent = "Reset link sent! Check your email.";
    forgotMsg.style.color = "#10b981";
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLoginView();
});

// ============================================
// STOCK API FUNCTIONS
// ============================================

// Fetch time series data from Alpha Vantage
async function fetchStockData(symbol) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${CONFIG.STOCK_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data["Error Message"]) {
      throw new Error("Invalid stock symbol");
    }

    if (!data["Time Series (Daily)"]) {
      throw new Error("Unable to fetch stock data");
    }

    // Increment counter on successful call
    apiCallsToday++;
    updateApiCounter();

    return data;
  } catch (error) {
    throw error;
  }
}

// Calculate yearly highs and lows from time series data
function calculateStats(timeSeriesData) {
  const timeSeries = timeSeriesData["Time Series (Daily)"];
  if (!timeSeries) return null;

  const dates = Object.keys(timeSeries);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let highClose = -Infinity;
  let lowClose = Infinity;
  let highOpen = -Infinity;
  let lowOpen = Infinity;
  let dataFound = false;

  dates.forEach((date) => {
    const dateObj = new Date(date);

    // Process data if it's within the last year
    if (dateObj >= oneYearAgo) {
      const day = timeSeries[date];
      const open = parseFloat(day["1. open"]);
      const close = parseFloat(day["4. close"]);

      if (close > highClose) highClose = close;
      if (close < lowClose) lowClose = close;
      if (open > highOpen) highOpen = open;
      if (open < lowOpen) lowOpen = open;
      dataFound = true;
    }
  });

  // If no data was found in the range, return null or zeros
  if (!dataFound) return null;

  return {
    highClose: highClose, // Returning raw numbers as we discussed!
    lowClose: lowClose,
    highOpen: highOpen,
    lowOpen: lowOpen,
  };
}

// ============================================
// WATCHLIST MANAGEMENT
// ============================================

async function loadWatchlist() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) return;

  const tbody = document.getElementById("stocks-tbody");
  tbody.innerHTML = '<tr><td colspan="7" class="muted">Loading...</td></tr>';

  try {
    // Fetch user's watchlist with stock stats
    const { data: watchlist, error } = await supabaseClient
      .from("watchlists")
      .select(
        `
        id,
        symbol,
        created_at,
        stock_stats (
          highest_close,
          lowest_close,
          highest_open,
          lowest_open,
          last_updated
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const countPill = document.getElementById("stock-count-pill");
    if (countPill) {
      countPill.textContent = `${watchlist?.length || 0} / 10`;
    }

    if (error) throw error;

    if (!watchlist || watchlist.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="muted">No stocks yet. Add one above!</td></tr>';
      return;
    }

    // Display stocks in table
    tbody.innerHTML = watchlist
      .map((item) => {
        const stats = Array.isArray(item.stock_stats)
          ? item.stock_stats[0]
          : item.stock_stats;
        const updated = getRelativeTime(stats?.last_updated);

        return `
    <tr data-id="${item.id}" data-symbol="${item.symbol}">
      <td><strong>${item.symbol}</strong></td>
      <td>$${stats?.highest_close || "—"}</td>
      <td>$${stats?.lowest_close || "—"}</td>
      <td>$${stats?.highest_open || "—"}</td>
      <td>$${stats?.lowest_open || "—"}</td>
      <td>${updated}</td>
      <td>
        <button class="btn btn-secondary btn-delete" data-id="${item.id}">
          Delete
        </button>
      </td>
    </tr>
  `;
      })
      .join("");
    watchlist.forEach((item) => {
      const stats = Array.isArray(item.stock_stats)
        ? item.stock_stats[0]
        : item.stock_stats;

      if (isDataStale(stats?.last_updated)) {
        console.log(`Refreshing stale data for ${item.symbol}...`);
        refreshStockStats(item.symbol, user.id);
      }
    });
  } catch (error) {
    console.error("Error loading watchlist:", error);
    tbody.innerHTML =
      '<tr><td colspan="7" class="muted">Error loading stocks. Please refresh.</td></tr>';
  }
}

async function refreshStockStats(symbol, userId) {
  try {
    const stockData = await fetchStockData(symbol);
    const stats = calculateStats(stockData);

    const { error } = await supabaseClient
      .from("stock_stats")
      .update({
        highest_close: stats.highClose,
        lowest_close: stats.lowClose,
        highest_open: stats.highOpen,
        lowest_open: stats.lowOpen,
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("symbol", symbol);

    if (error) throw error;

    // Optional: Refresh the table row for this stock without reloading the whole page
    console.log(`Successfully updated ${symbol}`);
  } catch (err) {
    console.error(`Failed to background refresh ${symbol}:`, err.message);
  }
}

document.getElementById("stocks-tbody").addEventListener("click", async (e) => {
  if (!e.target.classList.contains("btn-delete")) return;

  const button = e.target; // cache reference
  const watchlistId = button.dataset.id;
  const row = button.closest("tr");
  const symbol = row.dataset.symbol;

  if (!confirm(`Remove ${symbol} from your watchlist?`)) return;

  // Disable immediately to prevent double clicks
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Deleting...";

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Because of ON DELETE CASCADE, deleting this will
    // automatically delete the related record in stock_stats!
    const { error: watchlistError } = await supabaseClient
      .from("watchlists")
      .delete()
      .eq("id", watchlistId)
      .eq("user_id", user.id);

    if (watchlistError) throw watchlistError;

    loadWatchlist();
  } catch (err) {
    console.error("Delete failed:", err);
    alert(`Error deleting ${symbol}: ${err.message}`);

    // Re-enable on failure
    button.disabled = false;
    button.textContent = originalText;
  }
});

function isDataStale(lastUpdated) {
  if (!lastUpdated) return true;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const updatedAt = new Date(lastUpdated);

  return updatedAt < twentyFourHoursAgo;
}

// Add Stock
addStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const symbolInput = document.getElementById("symbol-input");
  const symbol = symbolInput.value.trim().toUpperCase();

  if (!symbol) {
    alert("Please enter a stock symbol");
    return;
  }

  // Disable form while processing
  const submitBtn = addStockForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  try {
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Check current watchlist count
    const { count, error: countError } = await supabaseClient
      .from("watchlists")
      .select("*", { count: "exact", head: true }) // head: true means "just get the count, not the data"
      .eq("user_id", user.id);

    if (countError) throw countError;

    if (count >= 10) {
      alert(
        "Watchlist limit reached! Please remove a stock before adding a new one."
      );
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    // Check if stock already exists in watchlist
    const { data: existing } = await supabaseClient
      .from("watchlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    if (existing) {
      alert(`${symbol} is already in your watchlist!`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    // Fetch stock data from Alpha Vantage
    submitBtn.textContent = "Fetching data...";
    const stockData = await fetchStockData(symbol);

    // Calculate yearly stats
    const stats = calculateStats(stockData);

    // Add to watchlist table
    submitBtn.textContent = "Saving...";
    const { data: watchlistEntry, error: watchlistError } = await supabaseClient
      .from("watchlists")
      .insert([{ user_id: user.id, symbol: symbol }])
      .select()
      .single();

    if (watchlistError) throw watchlistError;

    // Add stats to stock_stats table
    const { error: statsError } = await supabaseClient
      .from("stock_stats")
      .insert([
        {
          user_id: user.id,
          symbol: symbol,
          highest_close: parseFloat(stats.highClose),
          lowest_close: parseFloat(stats.lowClose),
          highest_open: parseFloat(stats.highOpen),
          lowest_open: parseFloat(stats.lowOpen),
        },
      ]);

    if (statsError) throw statsError;

    // Success! Reload the watchlist
    addStockForm.reset();
    loadWatchlist();
  } catch (error) {
    console.error("Error adding stock:", error);
    alert(`Error: ${error.message}`);
  } finally {
    // Re-enable form
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// ============================================
// VIEW NAVIGATION LINKS
// ============================================

document.getElementById("link-signup").addEventListener("click", (e) => {
  e.preventDefault();
  showSignupView();
});

document.getElementById("link-forgot").addEventListener("click", (e) => {
  e.preventDefault();
  showForgotView();
});

document.getElementById("link-back-login").addEventListener("click", (e) => {
  e.preventDefault();
  showLoginView();
});

document.getElementById("link-back-login-2").addEventListener("click", (e) => {
  e.preventDefault();
  showLoginView();
});

// ============================================
// INITIALIZE APP
// ============================================

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Check authentication status on page load
checkAuth();
