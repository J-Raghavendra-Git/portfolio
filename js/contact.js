/**
 * CONTACT PAGE CONTROLLER
 * Route: /contact
 * Handles recruiter channels, accessible client-side form validation,
 * loading / success / error states, and message queue staging for future /admin/messages.
 * Public view only: zero edit/delete/administrative controls exposed.
 */

(function () {
  'use strict';

  function initContactPage() {
    const form = document.getElementById('contact-page-form');
    const successBanner = document.getElementById('contact-status-success');
    const errorBanner = document.getElementById('contact-status-error');
    const copyEmailBtn = document.getElementById('btn-copy-contact-email');

    // 1. One-Click Email Copy Handler
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = 'raghavendraraghu71537@gmail.com';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(email);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = email;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
          }
          if (window.FormController && window.FormController.showToast) {
            window.FormController.showToast(`Email copied: ${email}`, 'success');
          } else {
            alert(`Email copied: ${email}`);
          }
        } catch (err) {
          window.location.href = `mailto:${email}`;
        }
      });
    }

    // 2. Form Validation & Submission
    if (!form) return;

    const nameInput = document.getElementById('contact-input-name');
    const emailInput = document.getElementById('contact-input-email');
    const subjectSelect = document.getElementById('contact-input-subject');
    const messageInput = document.getElementById('contact-input-message');
    const submitBtn = document.getElementById('contact-submit-btn');

    function showError(inputEl, errorId, message) {
      inputEl.classList.add('error');
      inputEl.setAttribute('aria-invalid', 'true');
      const errEl = document.getElementById(errorId);
      if (errEl) {
        errEl.textContent = message;
        errEl.classList.add('visible');
      }
    }

    function clearError(inputEl, errorId) {
      inputEl.classList.remove('error');
      inputEl.setAttribute('aria-invalid', 'false');
      const errEl = document.getElementById(errorId);
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
      }
    }

    // Live validation on blur
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        if (!nameInput.value.trim()) {
          showError(nameInput, 'err-contact-name', 'Please provide your name.');
        } else {
          clearError(nameInput, 'err-contact-name');
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
          showError(emailInput, 'err-contact-email', 'Please enter a valid email address.');
        } else {
          clearError(emailInput, 'err-contact-email');
        }
      });
    }

    if (messageInput) {
      messageInput.addEventListener('blur', () => {
        if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
          showError(messageInput, 'err-contact-message', 'Message must be at least 10 characters.');
        } else {
          clearError(messageInput, 'err-contact-message');
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let isValid = true;

      // Validate Name
      if (!nameInput.value.trim()) {
        showError(nameInput, 'err-contact-name', 'Please provide your name.');
        isValid = false;
      } else {
        clearError(nameInput, 'err-contact-name');
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        showError(emailInput, 'err-contact-email', 'Please enter a valid corporate or professional email.');
        isValid = false;
      } else {
        clearError(emailInput, 'err-contact-email');
      }

      // Validate Message
      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        showError(messageInput, 'err-contact-message', 'Please write a message of at least 10 characters.');
        isValid = false;
      } else {
        clearError(messageInput, 'err-contact-message');
      }

      if (!isValid) {
        const firstErr = form.querySelector('.error');
        if (firstErr) firstErr.focus();
        return;
      }

      // Hide previous banners
      if (successBanner) successBanner.style.display = 'none';
      if (errorBanner) errorBanner.style.display = 'none';

      // Loading State
      submitBtn.disabled = true;
      const originalBtnContent = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="spin-animation" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Dispatching Message...</span>
      `;

      // Construct Message Payload for future /admin/messages
      const messagePayload = {
        id: `msg-${Date.now()}`,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: subjectSelect ? subjectSelect.value : 'General Inquiry',
        message: messageInput.value.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        archived: false
      };

      // Staging in localStorage for offline testing of future admin message reader
      try {
        const existingMessages = JSON.parse(localStorage.getItem('PORTFOLIO_MESSAGES_QUEUE') || '[]');
        existingMessages.push(messagePayload);
        localStorage.setItem('PORTFOLIO_MESSAGES_QUEUE', JSON.stringify(existingMessages));
      } catch (storageErr) {
        // Local storage unavailable or quota exceeded; proceed smoothly
      }

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          form.reset();
          if (successBanner) {
            successBanner.style.display = 'flex';
            successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (window.FormController && window.FormController.showToast) {
            window.FormController.showToast('Message received! Alex will follow up within 24 hours.', 'success');
          }
        } else {
          if (errorBanner) {
            const errDiv = errorBanner.querySelector('div');
            if (errDiv && data.error) {
              errDiv.innerHTML = `<strong>Dispatch Failed:</strong> ${data.error} Please email directly at <a href="mailto:raghavendraraghu71537@gmail.com" style="color:inherit; text-decoration:underline;">raghavendraraghu71537@gmail.com</a>.`;
            }
            errorBanner.style.display = 'flex';
            errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (window.FormController && window.FormController.showToast) {
            window.FormController.showToast(data.error || 'Failed to dispatch message.', 'error');
          }
        }
      } catch (err) {
        if (errorBanner) {
          errorBanner.style.display = 'flex';
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (window.FormController && window.FormController.showToast) {
          window.FormController.showToast('Network error: unable to send inquiry. Please email directly.', 'error');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactPage);
  } else {
    initContactPage();
  }
})();
