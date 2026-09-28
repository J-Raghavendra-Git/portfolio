/**
 * ADMIN LOGIN CONTROLLER
 * Handles owner authentication, loading states, rate-limit feedback,
 * and redirection to intended admin route.
 */

(function () {
  'use strict';

  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('login-btn-text');
  const btnIcon = document.getElementById('login-btn-icon');
  const errorBanner = document.getElementById('login-error-banner');
  const errorText = document.getElementById('login-error-text');

  // Show/Hide password toggle
  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePwdBtn.textContent = 'Hide';
      } else {
        passwordInput.type = 'password';
        togglePwdBtn.textContent = 'Show';
      }
    });
  }

  function showError(msg) {
    if (errorBanner && errorText) {
      errorText.textContent = msg;
      errorBanner.style.display = 'flex';
    }
  }

  function hideError() {
    if (errorBanner) {
      errorBanner.style.display = 'none';
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = (emailInput.value || '').trim();
      const password = passwordInput.value || '';

      if (!email) {
        showError('Please enter your owner email.');
        emailInput.focus();
        return;
      }
      if (!password) {
        showError('Please enter your password.');
        passwordInput.focus();
        return;
      }

      // Loading state
      submitBtn.disabled = true;
      btnText.textContent = 'Verifying Credentials...';
      btnIcon.style.display = 'none';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showError(data.error || 'Invalid credentials or access denied.');
          submitBtn.disabled = false;
          btnText.textContent = 'Authenticate as Owner';
          btnIcon.style.display = 'inline-block';
          return;
        }

        // Login successful: redirect to target or dashboard
        btnText.textContent = 'Authentication Verified!';
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect') || '/admin/dashboard';
        
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 400);
      } catch (err) {
        showError('Network error or server unreachable.');
        submitBtn.disabled = false;
        btnText.textContent = 'Authenticate as Owner';
        btnIcon.style.display = 'inline-block';
      }
    });
  }
})();
