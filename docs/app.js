// ============================================
// STOCK TRACKER - Main Application Logic
// ============================================

// Initialize Supabase client
const supabaseClient = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_PUBLISHABLE_KEY
);

// DOM Elements - Views
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const forgotView = document.getElementById('forgot-view');
const dashboardView = document.getElementById('dashboard-view');

// DOM Elements - Forms
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotForm = document.getElementById('forgot-form');
const addStockForm = document.getElementById('add-stock-form');

// DOM Elements - Messages
const loginMsg = document.getElementById('login-msg');
const signupMsg = document.getElementById('signup-msg');
const forgotMsg = document.getElementById('forgot-msg');
const userPill = document.getElementById('user-pill');

// DOM Elements - Buttons & Links
const logoutBtn = document.getElementById('btn-logout');

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
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  if (user) {
    showDashboardView(user);
  } else {
    showLoginView();
  }
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = 'Logging in...';
  
  const email = loginForm.email.value;
  const password = loginForm.password.value;
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    loginMsg.textContent = `Error: ${error.message}`;
    loginMsg.style.color = '#ef4444';
  } else {
    loginMsg.textContent = 'Success! Loading dashboard...';
    loginMsg.style.color = '#10b981';
    showDashboardView(data.user);
  }
});

// Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupMsg.textContent = 'Creating account...';
  
  const email = signupForm.email.value;
  const password = signupForm.password.value;
  
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });
  
  if (error) {
    signupMsg.textContent = `Error: ${error.message}`;
    signupMsg.style.color = '#ef4444';
  } else {
    signupMsg.textContent = 'Account created! You can now log in.';
    signupMsg.style.color = '#10b981';
    
    // Switch to login view after 2 seconds
    setTimeout(() => {
      showLoginView();
      signupForm.reset();
      signupMsg.textContent = '';
    }, 2000);
  }
});

// Forgot Password
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotMsg.textContent = 'Sending reset link...';
  
  const email = forgotForm.email.value;
  
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  
  if (error) {
    forgotMsg.textContent = `Error: ${error.message}`;
    forgotMsg.style.color = '#ef4444';
  } else {
    forgotMsg.textContent = 'Reset link sent! Check your email.';
    forgotMsg.style.color = '#10b981';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLoginView();
});

// ============================================
// WATCHLIST MANAGEMENT
// ============================================

async function loadWatchlist() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  if (!user) return;
  
  // For now, just show placeholder
  // Next phase: fetch from database and display
  const tbody = document.getElementById('stocks-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="muted">No stocks yet. Add one above!</td></tr>';
}

// Add Stock (placeholder - will implement in next phase)
addStockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const symbol = document.getElementById('symbol-input').value.toUpperCase();
  
  // TODO: Add to database and fetch stock data
  alert(`TODO: Add ${symbol} to watchlist and fetch data from API`);
  
  addStockForm.reset();
});

// ============================================
// VIEW NAVIGATION LINKS
// ============================================

document.getElementById('link-signup').addEventListener('click', (e) => {
  e.preventDefault();
  showSignupView();
});

document.getElementById('link-forgot').addEventListener('click', (e) => {
  e.preventDefault();
  showForgotView();
});

document.getElementById('link-back-login').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginView();
});

document.getElementById('link-back-login-2').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginView();
});

// ============================================
// INITIALIZE APP
// ============================================

// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Check authentication status on page load
checkAuth();