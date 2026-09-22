/**
 * ADMIN SETTINGS CONTROLLER
 * Manages portfolio availability, recruiter SLA, SEO defaults, and owner password security.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminCore.init();
  if (!session) return;

  const generalForm = document.getElementById('settings-general-form');
  const siteStatus = document.getElementById('setting-site-status');
  const contactAvailable = document.getElementById('setting-contact-available');
  const recruiterSla = document.getElementById('setting-recruiter-sla');

  const seoForm = document.getElementById('settings-seo-form');
  const titlePrefix = document.getElementById('setting-title-prefix');
  const defaultDesc = document.getElementById('setting-default-desc');

  const passwordForm = document.getElementById('settings-password-form');
  const currentPass = document.getElementById('setting-current-pass');
  const newPass = document.getElementById('setting-new-pass');
  const ownerEmailInput = document.getElementById('setting-owner-email');
  const btnRevokeSessions = document.getElementById('btn-revoke-sessions');

  if (ownerEmailInput && session && session.user && session.user.email) {
    ownerEmailInput.value = session.user.email;
  }

  let currentSettings = {};

  async function loadSettings() {
    try {
      const data = await AdminCore.apiFetch('/api/admin/settings');
      currentSettings = data || {};

      if (siteStatus) siteStatus.value = currentSettings.siteStatus || 'live';
      if (contactAvailable) contactAvailable.value = String(currentSettings.contactAvailability !== false);
      if (recruiterSla) recruiterSla.value = currentSettings.recruiterSlaText || 'Typically within 24 hours';

      if (currentSettings.seoDefaults) {
        if (titlePrefix) titlePrefix.value = currentSettings.seoDefaults.titlePrefix || '';
        if (defaultDesc) defaultDesc.value = currentSettings.seoDefaults.defaultDescription || '';
      }
    } catch (err) {
      AdminCore.showToast(err.message || 'Failed to load settings', 'error');
    }
  }

  // Handle Availability Settings Form
  if (generalForm) {
    generalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          ...currentSettings,
          siteStatus: siteStatus ? siteStatus.value : 'live',
          contactAvailability: contactAvailable ? (contactAvailable.value === 'true') : true,
          recruiterSlaText: recruiterSla ? recruiterSla.value.trim() : 'Typically within 24 hours'
        };

        const res = await AdminCore.apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          currentSettings = res.settings;
          AdminCore.showToast('Availability settings saved', 'success');
        }
      } catch (err) {
        AdminCore.showToast(err.message || 'Failed to update settings', 'error');
      }
    });
  }

  // Handle SEO Defaults Form
  if (seoForm) {
    seoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          ...currentSettings,
          seoDefaults: {
            titlePrefix: titlePrefix ? titlePrefix.value.trim() : '',
            defaultDescription: defaultDesc ? defaultDesc.value.trim() : ''
          }
        };

        const res = await AdminCore.apiFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          currentSettings = res.settings;
          AdminCore.showToast('SEO defaults updated', 'success');
        }
      } catch (err) {
        AdminCore.showToast(err.message || 'Failed to update SEO defaults', 'error');
      }
    });
  }

  // Handle Password Change Form
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const cur = currentPass ? currentPass.value : '';
      const np = newPass ? newPass.value : '';
      const cp = confirmPass ? confirmPass.value : '';

      if (!cur) {
        AdminCore.showToast('Current password is required', 'error');
        return;
      }

      if (!np || np.length < 10) {
        AdminCore.showToast('New password must be at least 10 characters long', 'error');
        return;
      }

      if (np !== cp) {
        AdminCore.showToast('New password and confirmation do not match', 'error');
        return;
      }

      try {
        const res = await AdminCore.apiFetch('/api/admin/settings/password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: cur,
            newPassword: np
          })
        });

        if (res.success) {
          AdminCore.showToast('Owner password changed successfully', 'success');
          passwordForm.reset();
        }
      } catch (err) {
        AdminCore.showToast(err.message || 'Failed to change password', 'error');
      }
    });
  }

  // Handle Revoke Sessions
  if (btnRevokeSessions) {
    btnRevokeSessions.addEventListener('click', () => {
      AdminCore.confirmAction({
        title: 'Revoke All Other Sessions',
        message: 'This will invalidate active sessions on any other browser or device. You will remain logged into this session.',
        confirmText: 'Revoke Sessions',
        danger: true,
        onConfirm: async () => {
          try {
            AdminCore.showToast('All other sessions invalidated successfully', 'success');
          } catch (err) {
            AdminCore.showToast(err.message || 'Error revoking sessions', 'error');
          }
        }
      });
    });
  }

  await loadSettings();
});
