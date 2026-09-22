/**
 * CONTACT FORM & TOAST CONTROLLER
 * Provides accessible form validation, one-click email copying,
 * and feedback notifications.
 */

const FormController = (function () {
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const iconSvg = type === 'success' ? `
      <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ` : `
      <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Automatically remove after 4.5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  }

  function initEmailCopy() {
    const copyBtns = document.querySelectorAll('[data-copy-email]');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = btn.getAttribute('data-copy-email') || 'raghavendraraghu71537@gmail.com';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(email);
          } else {
            // Fallback for non-secure contexts
            const textarea = document.createElement('textarea');
            textarea.value = email;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
          }
          showToast(`Email copied: ${email}`, 'success');
        } catch (err) {
          showToast(`Email: ${email}`, 'success');
        }
      });
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('form-name');
      const emailInput = document.getElementById('form-email');
      const messageInput = document.getElementById('form-message');
      const submitBtn = form.querySelector('button[type="submit"]');

      let isValid = true;

      // Validate Name
      if (!nameInput.value.trim()) {
        showError(nameInput, 'Please provide your name');
        isValid = false;
      } else {
        clearError(nameInput);
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        showError(emailInput, 'Please provide a valid email address');
        isValid = false;
      } else {
        clearError(emailInput);
      }

      // Validate Message
      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        showError(messageInput, 'Message must be at least 10 characters');
        isValid = false;
      } else {
        clearError(messageInput);
      }

      if (!isValid) return;

      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="spin-animation" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Sending Message...</span>
      `;

      try {
        const payload = {
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          subject: 'Portfolio Inquiry',
          message: messageInput.value.trim()
        };

        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          form.reset();
          showToast('Thank you! Your inquiry has been received. I will respond within 24 hours.', 'success');
        } else {
          showToast(data.error || 'Failed to send message. Please email directly at raghavendraraghu71537@gmail.com', 'error');
        }
      } catch (err) {
        showToast('Network error: unable to send inquiry. Please email directly at raghavendraraghu71537@gmail.com', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function showError(inputEl, message) {
    inputEl.classList.add('error');
    const errSpan = inputEl.parentElement.querySelector('.form-error-msg');
    if (errSpan) {
      errSpan.textContent = message;
      errSpan.classList.add('visible');
    }
  }

  function clearError(inputEl) {
    inputEl.classList.remove('error');
    const errSpan = inputEl.parentElement.querySelector('.form-error-msg');
    if (errSpan) {
      errSpan.classList.remove('visible');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEmailCopy();
    initContactForm();
  });

  return {
    showToast
  };
})();
