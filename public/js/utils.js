// Utility functions for the Mini LinkedIn app

// Get auth token for API calls
async function getAuthToken() {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

// API call helper with auth
async function apiCall(url, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Upload image via API
async function uploadImage(file) {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  return response.json();
}

// Format date to relative time
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get current user data from localStorage
function getCurrentUser() {
  const userData = localStorage.getItem('miniLinkedInUser');
  return userData ? JSON.parse(userData) : null;
}

// Save user data to localStorage
function saveCurrentUser(user) {
  localStorage.setItem('miniLinkedInUser', JSON.stringify(user));
}

// Clear user data
function clearCurrentUser() {
  localStorage.removeItem('miniLinkedInUser');
}

// Default avatar
function getAvatarUrl(profilePicture) {
  return profilePicture || 'https://ui-avatars.com/api/?background=0a66c2&color=fff&name=User&size=128';
}

// Show toast notification
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
