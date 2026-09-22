/**
 * ADMIN PROFILE CONTROLLER
 * Loads owner profile, validates inputs, and commits updates via PUT /api/admin/profile.
 */

(function () {
  'use strict';

  const form = document.getElementById('profile-form');
  const nameInput = document.getElementById('prof-name');
  const titleInput = document.getElementById('prof-title');
  const positioningInput = document.getElementById('prof-positioning');
  const bioInput = document.getElementById('prof-bio');
  const emailInput = document.getElementById('prof-email');
  const locationInput = document.getElementById('prof-location');
  const availabilityInput = document.getElementById('prof-availability');
  const githubInput = document.getElementById('prof-github');
  const linkedinInput = document.getElementById('prof-linkedin');
  const leetcodeInput = document.getElementById('prof-leetcode');

  async function loadProfile() {
    try {
      const profile = await AdminCore.apiFetch('/api/admin/profile');
      if (nameInput) nameInput.value = profile.name || '';
      if (titleInput) titleInput.value = profile.title || '';
      if (positioningInput) positioningInput.value = profile.positioning || '';
      if (bioInput) bioInput.value = profile.shortBio || '';
      if (emailInput) emailInput.value = profile.email || '';
      if (locationInput) locationInput.value = profile.location || '';
      if (availabilityInput) availabilityInput.value = profile.availability || '';
      if (githubInput) githubInput.value = profile.github || '';
      if (linkedinInput) linkedinInput.value = profile.linkedin || '';
      if (leetcodeInput) leetcodeInput.value = profile.leetcode || '';
    } catch (err) {
      console.error('[Profile] Failed to load profile:', err);
      AdminCore.showToast('Failed to load profile details', 'error');
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: (nameInput.value || '').trim(),
        title: (titleInput.value || '').trim(),
        positioning: (positioningInput.value || '').trim(),
        shortBio: (bioInput.value || '').trim(),
        email: (emailInput.value || '').trim(),
        location: (locationInput.value || '').trim(),
        availability: (availabilityInput.value || '').trim(),
        github: (githubInput.value || '').trim(),
        linkedin: (linkedinInput.value || '').trim(),
        leetcode: (leetcodeInput.value || '').trim()
      };

      if (!payload.name || !payload.title || !payload.email) {
        AdminCore.showToast('Name, title, and email are required fields.', 'error');
        return;
      }

      try {
        await AdminCore.apiFetch('/api/admin/profile', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        AdminCore.showToast('Profile changes successfully published to portfolio!', 'success');
      } catch (err) {
        console.error('[Profile] Save failed:', err);
        AdminCore.showToast(`Failed to update profile: ${err.message}`, 'error');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProfile);
  } else {
    loadProfile();
  }
})();
