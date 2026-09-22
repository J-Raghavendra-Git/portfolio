/**
 * MODAL CONTROLLER
 * Implements accessible native <dialog> modals adhering to modern-web-guidance
 * Uses closedby="any" with light-dismiss backdrop fallback and focus management.
 */

const ModalController = (function () {
  let activeTriggerElement = null;

  function initDialog(dialog) {
    if (!dialog) return;

    // Attach fallback for browsers without closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );

        if (isDialogContent) return;
        closeModal(dialog);
      });
    }

    // Connect close buttons inside dialog
    const closeBtns = dialog.querySelectorAll('[data-close-modal], .dialog-close-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(dialog);
      });
    });

    // Handle cancel event (Esc key)
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (activeTriggerElement && typeof activeTriggerElement.focus === 'function') {
        activeTriggerElement.focus();
        activeTriggerElement = null;
      }
    });
  }

  function openModal(dialogId, triggerEl = null) {
    const dialog = document.getElementById(dialogId);
    if (!dialog || typeof dialog.showModal !== 'function') return;

    activeTriggerElement = triggerEl || document.activeElement;
    document.body.style.overflow = 'hidden';
    dialog.showModal();

    // Auto-focus on title or first focusable element inside
    const focusTarget = dialog.querySelector('.dialog-title') || dialog.querySelector('button, [tabindex="0"]');
    if (focusTarget) {
      focusTarget.focus();
    }
  }

  function closeModal(dialogOrId) {
    const dialog = typeof dialogOrId === 'string' ? document.getElementById(dialogOrId) : dialogOrId;
    if (dialog && dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('dialog.custom-dialog').forEach(initDialog);
  });

  return {
    open: openModal,
    close: closeModal
  };
})();
