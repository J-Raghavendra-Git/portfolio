/**
 * ADMIN RESUME CONTROLLER
 * Handles ATS resume metadata updating, PDF preview, and validated replacement upload.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Validate session
  const session = await AdminCore.init();
  if (!session) return;

  const displayVersion = document.getElementById('res-display-version');
  const displayFilesize = document.getElementById('res-display-filesize');
  const displayUpdated = document.getElementById('res-display-updated');
  const previewLink = document.getElementById('res-preview-link');
  const downloadLink = document.getElementById('res-download-link');

  const uploadForm = document.getElementById('resume-upload-form');
  const fileInput = document.getElementById('res-upload-file');
  const versionInput = document.getElementById('res-upload-version');
  const uploadBtn = document.getElementById('btn-submit-resume-upload');
  const uploadBtnText = document.getElementById('btn-upload-text');

  const metaForm = document.getElementById('resume-meta-form');
  const metaVersion = document.getElementById('res-meta-version');
  const metaUpdated = document.getElementById('res-meta-updated');
  const metaSummary = document.getElementById('res-meta-summary');

  let currentResumeData = {};

  async function loadResumeData() {
    try {
      const data = await AdminCore.apiFetch('/api/admin/resume');
      currentResumeData = data || {};

      // Populate display cards
      if (displayVersion) displayVersion.textContent = currentResumeData.version || 'v2.4';
      if (displayFilesize) displayFilesize.textContent = currentResumeData.fileSize || '142 KB';
      if (displayUpdated) displayUpdated.textContent = currentResumeData.lastUpdated || 'Recently';

      // Cache-busting on preview links
      const cacheBust = `?t=${Date.now()}`;
      if (previewLink) previewLink.href = `/assets/Alex_Rivera_Software_Engineer_Resume.pdf${cacheBust}`;
      if (downloadLink) downloadLink.href = `/assets/Alex_Rivera_Software_Engineer_Resume.pdf${cacheBust}`;

      // Populate metadata form
      if (metaVersion) metaVersion.value = currentResumeData.version || '';
      if (metaUpdated) metaUpdated.value = currentResumeData.lastUpdated || '';
      if (metaSummary) metaSummary.value = currentResumeData.summary || '';
      if (versionInput) versionInput.value = currentResumeData.version || '';
    } catch (err) {
      AdminCore.showToast(err.message || 'Failed to load resume details', 'error');
    }
  }

  // Handle Metadata Form Save
  if (metaForm) {
    metaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          version: metaVersion ? metaVersion.value.trim() : currentResumeData.version,
          lastUpdated: metaUpdated ? metaUpdated.value.trim() : currentResumeData.lastUpdated,
          summary: metaSummary ? metaSummary.value.trim() : currentResumeData.summary
        };

        const res = await AdminCore.apiFetch('/api/admin/resume', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res.success) {
          AdminCore.showToast('Resume metadata saved successfully', 'success');
          await loadResumeData();
        }
      } catch (err) {
        AdminCore.showToast(err.message || 'Error updating metadata', 'error');
      }
    });
  }

  // Handle PDF Upload Form
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        AdminCore.showToast('Please select a PDF document first', 'error');
        return;
      }

      const file = fileInput.files[0];

      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        AdminCore.showToast('Invalid file: only authentic PDF files (.pdf) are allowed', 'error');
        return;
      }

      // Validate file size (max 5MB)
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        AdminCore.showToast(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 5MB limit`, 'error');
        return;
      }

      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          if (uploadBtn) uploadBtn.disabled = true;
          if (uploadBtnText) uploadBtnText.textContent = 'Uploading & Validating...';

          const base64Data = event.target.result;
          const version = versionInput ? versionInput.value.trim() : 'v2.5';

          const res = await AdminCore.apiFetch('/api/admin/resume/upload', {
            method: 'POST',
            body: JSON.stringify({
              base64Data: base64Data,
              version: version
            })
          });

          if (res.success) {
            AdminCore.showToast(res.message || 'Resume uploaded and published', 'success');
            uploadForm.reset();
            await loadResumeData();
          }
        } catch (err) {
          AdminCore.showToast(err.message || 'Failed to upload resume', 'error');
        } finally {
          if (uploadBtn) uploadBtn.disabled = false;
          if (uploadBtnText) uploadBtnText.textContent = 'Upload & Publish Replacement';
        }
      };

      reader.onerror = () => {
        AdminCore.showToast('Failed to read selected file', 'error');
      };

      reader.readAsDataURL(file);
    });
  }

  await loadResumeData();
});
