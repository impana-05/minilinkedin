// Profile page logic
let profileUser = null;
let currentUser = null;
let isOwnProfile = false;

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

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id') || currentUser._id;
    isOwnProfile = userId === currentUser._id;

    await loadProfile(userId);
    await loadUserPosts(userId);
    setupNavbar();
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

async function loadProfile(userId) {
  try {
    profileUser = await apiCall(`/api/users/${userId}`);
    renderProfile();
  } catch (error) {
    showToast('Failed to load profile', 'error');
  }
}

function renderProfile() {
  const container = document.getElementById('profileContainer');
  const avatar = getAvatarUrl(profileUser.profilePicture);

  container.innerHTML = `
    <div class="profile-banner relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 h-48 md:h-56 rounded-t-xl">
      <div class="absolute inset-0 bg-black/10"></div>
    </div>
    <div class="relative px-6 pb-6">
      <div class="flex flex-col md:flex-row md:items-end gap-4 -mt-16">
        <img src="${avatar}" alt="${escapeHtml(profileUser.name)}"
             class="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white">
        <div class="flex-1 pt-2">
          <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(profileUser.name)}</h1>
          <p class="text-gray-600 text-lg">${escapeHtml(profileUser.headline || 'No headline set')}</p>
          <p class="text-gray-400 text-sm mt-1">${profileUser.connections?.length || 0} connections</p>
        </div>
        <div class="flex gap-2">
          ${isOwnProfile ? `
            <a href="/edit-profile.html" class="btn-primary">
              ✏️ Edit Profile
            </a>
          ` : `
            <button class="btn-primary" onclick="connectUser()">
              🤝 Connect
            </button>
          `}
        </div>
      </div>

      <!-- Bio -->
      <div class="mt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">About</h2>
        <p class="text-gray-700 whitespace-pre-wrap">${escapeHtml(profileUser.bio || 'No bio added yet.')}</p>
      </div>

      <!-- Skills -->
      <div class="mt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Skills</h2>
        <div class="flex flex-wrap gap-2">
          ${profileUser.skills?.length ?
            profileUser.skills.map(skill => `
              <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                ${escapeHtml(skill)}
              </span>
            `).join('') :
            '<p class="text-gray-500 text-sm">No skills added yet.</p>'
          }
        </div>
      </div>
    </div>
  `;
}

async function loadUserPosts(userId) {
  const container = document.getElementById('userPostsContainer');
  try {
    const allPosts = await apiCall('/api/posts');
    const userPosts = allPosts.filter(p => p.author?._id === userId);

    if (!userPosts.length) {
      container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm p-8 text-center">
          <p class="text-gray-500">No posts yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Posts</h2>
      ${userPosts.map(post => `
        <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
          <p class="text-gray-800 whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
          ${post.image ? `<img src="${post.image}" alt="Post" class="mt-3 rounded-lg max-h-64 object-cover w-full">` : ''}
          <div class="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>👍 ${post.likes?.length || 0} likes</span>
            <span>💬 ${post.comments?.length || 0} comments</span>
            <span class="ml-auto">${timeAgo(post.createdAt)}</span>
          </div>
        </div>
      `).join('')}
    `;
  } catch (error) {
    container.innerHTML = '<p class="text-center text-gray-500">Failed to load posts</p>';
  }
}

function connectUser() {
  showToast(`Connection request sent to ${profileUser.name}!`, 'success');
}
