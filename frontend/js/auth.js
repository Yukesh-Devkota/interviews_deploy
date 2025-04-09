console.log('auth.js loaded');

let supabase;
let isAuthInitialized = false;

async function waitForSupabaseScript(timeout = 10000) {
  const supabaseScript = document.getElementById('supabaseScript');
  if (!supabaseScript) {
    throw new Error('Supabase script not found in the page');
  }

  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') {
      console.log('Supabase script already loaded');
      return resolve();
    }

    supabaseScript.addEventListener('load', () => {
      console.log('Supabase script loaded');
      resolve();
    });

    supabaseScript.addEventListener('error', () => {
      console.error('Supabase script failed to load');
      reject(new Error('Failed to load Supabase script'));
    });

    setTimeout(() => {
      reject(new Error('Supabase script load timed out'));
    }, timeout);
  });
}

async function initializeSupabase() {
  console.log('Attempting to initialize Supabase...');
  try {
    supabase = window.supabase.createClient(
      'https://fadrnmgjulvdoymevqhf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZHJubWdqdWx2ZG95bWV2cWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTA3NzEsImV4cCI6MjA1ODU2Njc3MX0.XvyVNkjvTiVA5i0Abs1WIIhY-5i9fXfoxMrgIiuoOsA'
    );
    console.log('Supabase initialized successfully');
    console.log('Supabase client:', supabase);
    return true;
  } catch (error) {
    console.error('Supabase initialization failed:', error.message);
    return false;
  }
}

async function initializeAuth() {
  if (isAuthInitialized) {
    console.log('Auth already initialized, skipping...');
    return;
  }
  console.log('initializeAuth called');
  isAuthInitialized = true;

  try {
    await waitForSupabaseScript();
    const initialized = await initializeSupabase();
    if (!initialized) {
      throw new Error('Failed to initialize Supabase');
    }

    // Debug current pathname
    console.log('Current pathname:', window.location.pathname);

    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error checking session:', sessionError.message);
    } else if (session) {
      console.log('Session:', session);
      localStorage.setItem('isLoggedIn', 'true');
      updateUserProfile(session.user.email);
      if (isLoginPage()) {
        console.log('User already logged in, redirecting to dashboard.html');
        window.location.href = '/dashboard.html';
        return;
      }
    } else {
      console.log('No active session found');
      localStorage.removeItem('isLoggedIn');
      if (!isPublicPage()) {
        console.log('No session, redirecting to login.html');
        window.location.href = '/login.html';
        return;
      }
    }

    // Handle auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('isLoggedIn', 'true');
        updateUserProfile(session.user.email);
        if (isLoginPage()) {
          console.log('User signed in, redirecting to dashboard.html');
          window.location.href = '/dashboard.html';
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isLoggedIn');
        updateUserProfile(null);
        if (!isPublicPage()) {
          console.log('User signed out, redirecting to index.html');
          window.location.href = '/index.html';
        }
      }
    });

    setupLoginButtons();

  } catch (error) {
    console.error('Authentication initialization failed:', error.message);
    showFeedback('Authentication service unavailable. Please refresh the page.');
    setupLoginButtonsWithError();
  }
}

// Helper functions for page checks
function isLoginPage() {
  const pathname = window.location.pathname;
  return pathname === '/login.html' || pathname === '/';
}

function isPublicPage() {
  const pathname = window.location.pathname;
  return pathname === '/index.html' || pathname === '/login.html' || pathname === '/';
}

function updateUserProfile(email) {
  const userProfile = document.getElementById('userProfile');
  if (userProfile) {
    userProfile.textContent = email || 'User Profile';
    console.log('User profile updated:', email || 'Not logged in');
  }
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
  console.log('Setting up login buttons with error handling');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      showFeedback('Authentication service not ready. Please try again later.');
    });
  }

  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const emailForm = document.getElementById('emailForm');
  if (emailLoginBtn && emailForm) {
    emailLoginBtn.addEventListener('click', () => {
      emailForm.style.display = emailForm.style.display === 'none' ? 'flex' : 'none';
    });
  }

  const submitEmailLogin = document.getElementById('submitEmailLogin');
  if (submitEmailLogin) {
    submitEmailLogin.addEventListener('click', () => {
      showFeedback('Authentication service not ready. Please try again later.');
    });
  }
}

function setupLoginButtons() {
  console.log('Setting up login buttons with Supabase functionality');

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      googleLoginBtn.disabled = true;
      googleLoginBtn.classList.add('loading');
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/dashboard.html' }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Google login error:', error.message);
        showFeedback('Google login failed: ' + error.message);
      } finally {
        googleLoginBtn.disabled = false;
        googleLoginBtn.classList.remove('loading');
      }
    });
  }

  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const emailForm = document.getElementById('emailForm');
  if (emailLoginBtn && emailForm) {
    emailLoginBtn.addEventListener('click', () => {
      emailForm.style.display = emailForm.style.display === 'none' ? 'flex' : 'none';
    });
  }

  const submitEmailLogin = document.getElementById('submitEmailLogin');
  if (submitEmailLogin) {
    submitEmailLogin.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) {
        showFeedback('Please enter both email and password.');
        return;
      }

      submitEmailLogin.disabled = true;
      submitEmailLogin.classList.add('loading');
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } catch (error) {
        console.error('Email login error:', error.message);
        showFeedback('Login failed: ' + error.message);
      } finally {
        submitEmailLogin.disabled = false;
        submitEmailLogin.classList.remove('loading');
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Logout error:', error.message);
        showFeedback('Logout failed: ' + error.message);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthInitialized) {
    initializeAuth();
  }
});