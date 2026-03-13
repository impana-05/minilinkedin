// Edit Profile page logic
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initializeFirebase();

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = '/index.html';
      return;
    }
    currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/index.html';
      return;
    }

    setupNavbar();
    loadEditForm();
    setupForm();
  });
});

function setupNavbar() {
  const navAvatar = document.getElementById('navAvatar');
  if (navAvatar) navAvatar.src = getAvatarUrl(currentUser.profilePicture);
  
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await firebase.auth().signOut();
    clearCurrentUser();
    window.location.href = '/index.html';
  });
}

function loadEditForm() {
  document.getElementById('editName').value = currentUser.name || '';
  document.getElementById('editHeadline').value = currentUser.headline || '';
  document.getElementById('editBio').value = currentUser.bio || '';
  document.getElementById('editSkills').value = (currentUser.skills || []).join(', ');
  
  const previewAvatar = document.getElementById('profilePreview');
  if (previewAvatar) {
    previewAvatar.src = getAvatarUrl(currentUser.profilePicture);
  }
}

function setupForm() {
  const form = document.getElementById('editProfileForm');
  const profileImageInput = document.getElementById('profileImageInput');
  const previewAvatar = document.getElementById('profilePreview');
  const enhanceBioBtn = document.getElementById('enhanceBio');

  let newProfilePicUrl = currentUser.profilePicture || '';

  // Profile picture upload
  profileImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewAvatar.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    try {
      showToast('Uploading photo...', 'info');
      const result = await uploadImage(file);
      newProfilePicUrl = result.url;
      showToast('Photo uploaded!', 'success');
    } catch (error) {
      showToast('Photo upload failed', 'error');
    }
  });

  // AI Bio Enhancer
  enhanceBioBtn.addEventListener('click', async () => {
    const bio = document.getElementById('editBio').value.trim();
    if (!bio) {
      showToast('Write a bio first to enhance it', 'error');
      return;
    }
    enhanceBioBtn.disabled = true;
    enhanceBioBtn.innerHTML = '<span class="loading-spinner"></span> Enhancing...';
    try {
      const result = await apiCall('/api/ai/enhance-bio', {
        method: 'POST',
        body: JSON.stringify({ bio })
      });
      document.getElementById('editBio').value = result.enhancedBio;
      showToast('Bio enhanced with AI!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      enhanceBioBtn.disabled = false;
      enhanceBioBtn.innerHTML = '✨ AI Enhance Bio';
    }
  });

  // Submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    try {
      const skillsRaw = document.getElementById('editSkills').value;
      const skills = skillsRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      const updatedUser = await apiCall(`/api/users/${currentUser._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('editName').value.trim(),
          headline: document.getElementById('editHeadline').value.trim(),
          bio: document.getElementById('editBio').value.trim(),
          skills,
          profilePicture: newProfilePicUrl
        })
      });

      saveCurrentUser(updatedUser);
      currentUser = updatedUser;
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => window.location.href = `/profile.html?id=${currentUser._id}`, 1000);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}
