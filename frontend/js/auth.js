console.log('auth.js loaded');

let supabase;
let isAuthInitialized = false;

async function waitForSupabaseScript(timeout = 10000) {
  const supabaseScript = document.getElementById('supabaseScript');
  if (!supabaseScript) throw new Error('Supabase script not found');
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') return resolve();
    supabaseScript.addEventListener('load', resolve);
    supabaseScript.addEventListener('error', () => reject(new Error('Supabase script failed to load')));
    setTimeout(() => reject(new Error('Supabase script load timed out')), timeout);
  });
}

async function initializeSupabase() {
  console.log('Initializing Supabase...');
  try {
    supabase = window.supabase.createClient(
      'https://fadrnmgjulvdoymevqhf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZHJubWdqdWx2ZG95bWV2cWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTA3NzEsImV4cCI6MjA1ODU2Njc3MX0.XvyVNkjvTiVA5i0Abs1WIIhY-5i9fXfoxMrgIiuoOsA'
    );
    console.log('Supabase initialized');
    return true;
  } catch (error) {
    console.error('Supabase init failed:', error.message);
    return false;
  }
}

async function initializeAuth() {
  if (isAuthInitialized) return;
  console.log('initializeAuth called');
  isAuthInitialized = true;

  try {
    await waitForSupabaseScript();
    if (!await initializeSupabase()) throw new Error('Supabase init failed');

    // Handle token from URL hash
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      console.log('Access token in URL:', hash);
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        console.log('Session set from URL');
        window.location.hash = ''; // Clear hash after setting session
      }
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error('Session error:', error.message);
    else if (session) {
      console.log('Session:', session);
      localStorage.setItem('isLoggedIn', 'true');
      updateUserProfile(session.user.email);
      if (isLoginPage()) {
        console.log('Redirecting to dashboard.html');
        window.location.href = '/dashboard.html';
        return;
      }
    } else {
      console.log('No session');
      localStorage.removeItem('isLoggedIn');
      if (!isPublicPage()) {
        console.log('Redirecting to login.html');
        window.location.href = '/login.html';
        return;
      }
    }

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state:', event, session);
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('isLoggedIn', 'true');
        updateUserProfile(session.user.email);
        if (isLoginPage()) window.location.href = '/dashboard.html';
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isLoggedIn');
        updateUserProfile(null);
        if (!isPublicPage()) window.location.href = '/index.html';
      }
    });

    setupLoginButtons();

  } catch (error) {
    console.error('Auth init failed:', error.message);
    showFeedback('Auth unavailable. Refresh the page.');
    setupLoginButtonsWithError();
  }
}

function isLoginPage() {
  return window.location.pathname === '/login.html' || window.location.pathname === '/';
}

function isPublicPage() {
  return window.location.pathname === '/index.html' || window.location.pathname === '/login.html' || window.location.pathname === '/';
}

function updateUserProfile(email) {
  const userProfile = document.getElementById('userProfile');
  if (userProfile) userProfile.textContent = email || 'User Profile';
}

function showFeedback(message) {
  const feedback = document.getElementById('loginError');
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 3000);
  }
}

function setupLoginButtonsWithError() {
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => showFeedback('Auth not ready. Try later.'));
}

function setupLoginButtons() {
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      googleLoginBtn.disabled = true;
      try {
        const redirectUrl = `${window.location.origin}/dashboard.html`;
        console.log('Redirecting to:', redirectUrl);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Google login error:', error.message);
        showFeedback('Google login failed: ' + error.message);
      } finally {
        googleLoginBtn.disabled = false;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthInitialized) initializeAuth();
});
