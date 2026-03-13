// Feed page logic
let currentUser = null;
let allPosts = [];

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
    setupUI();
    await loadFeed();
    await loadNotifications();
  });
});

function setupUI() {
  // User info in navbar
  const navAvatar = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  if (navAvatar) navAvatar.src = getAvatarUrl(currentUser.profilePicture);
  if (navUserName) navUserName.textContent = currentUser.name;

  // Post creation avatar
  const postAvatar = document.getElementById('postAvatar');
  if (postAvatar) postAvatar.src = getAvatarUrl(currentUser.profilePicture);

  // Setup post form
  setupPostForm();
  setupNotificationPanel();
  setupLogout();
}

function setupPostForm() {
  const postForm = document.getElementById('postForm');
  const imageInput = document.getElementById('postImage');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImage');
  const captionInput = document.getElementById('postCaption');
  const enhanceCaptionBtn = document.getElementById('enhanceCaption');

  let selectedImage = null;

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.innerHTML = `<img src="${e.target.result}" class="w-full max-h-64 object-cover rounded-lg" alt="Preview">`;
        imagePreview.classList.remove('hidden');
        removeImageBtn.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  removeImageBtn.addEventListener('click', () => {
    selectedImage = null;
    imageInput.value = '';
    imagePreview.classList.add('hidden');
    removeImageBtn.classList.add('hidden');
  });

  // AI Caption Enhancer
  enhanceCaptionBtn.addEventListener('click', async () => {
    const caption = captionInput.value.trim();
    if (!caption) {
      showToast('Write a caption first to enhance', 'error');
      return;
    }
    enhanceCaptionBtn.disabled = true;
    enhanceCaptionBtn.innerHTML = '<span class="loading-spinner"></span> Enhancing...';
    try {
      const result = await apiCall('/api/ai/enhance-caption', {
        method: 'POST',
        body: JSON.stringify({ caption })
      });
      captionInput.value = result.enhancedCaption;
      showToast('Caption enhanced with AI!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      enhanceCaptionBtn.disabled = false;
      enhanceCaptionBtn.innerHTML = '✨ AI Enhance';
    }
  });

  // Submit post
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const caption = captionInput.value.trim();
    if (!caption) {
      showToast('Please write a caption', 'error');
      return;
    }

    const submitBtn = postForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Posting...';

    try {
      let imageUrl = '';
      if (selectedImage) {
        const uploadResult = await uploadImage(selectedImage);
        imageUrl = uploadResult.url;
      }

      const post = await apiCall('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ caption, image: imageUrl })
      });

      captionInput.value = '';
      selectedImage = null;
      imageInput.value = '';
      imagePreview.classList.add('hidden');
      removeImageBtn.classList.add('hidden');

      // Prepend new post to feed
      allPosts.unshift(post);
      renderFeed();
      showToast('Post published!', 'success');
      
      // Refresh notifications (might have skill match)
      await loadNotifications();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '📝 Post';
    }
  });
}

async function loadFeed() {
  const feedContainer = document.getElementById('feedContainer');
  feedContainer.innerHTML = '<div class="flex justify-center py-8"><span class="loading-spinner-lg"></span></div>';

  try {
    allPosts = await apiCall('/api/posts');
    renderFeed();
  } catch (error) {
    feedContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Failed to load feed</p>';
  }
}

function renderFeed() {
  const feedContainer = document.getElementById('feedContainer');
  if (allPosts.length === 0) {
    feedContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm p-8 text-center">
        <div class="text-5xl mb-4">📝</div>
        <h3 class="text-lg font-semibold text-gray-700">No posts yet</h3>
        <p class="text-gray-500 mt-1">Be the first to share something!</p>
      </div>
    `;
    return;
  }

  feedContainer.innerHTML = allPosts.map(post => renderPostCard(post)).join('');
  attachPostEvents();
}

function renderPostCard(post) {
  const isLiked = post.likes?.some(id => id === currentUser._id || id._id === currentUser._id);
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const authorAvatar = getAvatarUrl(post.author?.profilePicture);

  return `
    <div class="post-card bg-white rounded-xl shadow-sm overflow-hidden mb-4 transition-all duration-300 hover:shadow-md" data-post-id="${post._id}">
      <!-- Post Header -->
      <div class="p-4 flex items-center gap-3">
        <a href="/profile.html?id=${post.author?._id}" class="flex-shrink-0">
          <img src="${authorAvatar}" alt="${escapeHtml(post.author?.name || 'User')}"
               class="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100">
        </a>
        <div class="flex-1 min-w-0">
          <a href="/profile.html?id=${post.author?._id}" class="font-semibold text-gray-900 hover:text-blue-600 hover:underline">
            ${escapeHtml(post.author?.name || 'Unknown User')}
          </a>
          <p class="text-sm text-gray-500 truncate">${escapeHtml(post.author?.headline || '')}</p>
          <p class="text-xs text-gray-400">${timeAgo(post.createdAt)}</p>
        </div>
      </div>
      
      <!-- Caption -->
      <div class="px-4 pb-3">
        <p class="text-gray-800 whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
        ${post.detectedSkills?.length ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${post.detectedSkills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Image -->
      ${post.image ? `
        <div class="post-image-container">
          <img src="${post.image}" alt="Post image" class="w-full max-h-96 object-cover">
        </div>
      ` : ''}

      <!-- Stats -->
      <div class="px-4 py-2 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
        <span>${likeCount} like${likeCount !== 1 ? 's' : ''}</span>
        <span>${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
      </div>

      <!-- Actions -->
      <div class="px-4 py-2 flex border-t border-gray-100">
        <button class="like-btn flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition ${isLiked ? 'text-blue-600 font-semibold' : 'text-gray-600'}"
                data-post-id="${post._id}">
          <span>${isLiked ? '👍' : '👍'}</span>
          <span>${isLiked ? 'Liked' : 'Like'}</span>
        </button>
        <button class="comment-toggle-btn flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition text-gray-600"
                data-post-id="${post._id}">
          <span>💬</span>
          <span>Comment</span>
        </button>
      </div>

      <!-- Comments Section (hidden by default) -->
      <div class="comments-section hidden border-t border-gray-100" id="comments-${post._id}">
        <div class="p-4 space-y-3">
          ${post.comments?.map(comment => `
            <div class="flex gap-2">
              <img src="${getAvatarUrl(comment.user?.profilePicture)}" alt="${escapeHtml(comment.user?.name || 'User')}"
                   class="w-8 h-8 rounded-full object-cover flex-shrink-0">
              <div class="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                <span class="font-semibold text-sm text-gray-900">${escapeHtml(comment.user?.name || 'User')}</span>
                <p class="text-sm text-gray-700">${escapeHtml(comment.text)}</p>
                <span class="text-xs text-gray-400">${timeAgo(comment.createdAt)}</span>
              </div>
            </div>
          `).join('') || ''}
        </div>
        <!-- Add Comment -->
        <div class="p-4 pt-0 flex gap-2">
          <img src="${getAvatarUrl(currentUser?.profilePicture)}" alt="You" class="w-8 h-8 rounded-full object-cover flex-shrink-0">
          <div class="flex-1 flex gap-2">
            <input type="text" placeholder="Write a comment..."
                   class="comment-input flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                   data-post-id="${post._id}">
            <button class="submit-comment-btn bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
                    data-post-id="${post._id}">Post</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachPostEvents() {
  // Like buttons
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      try {
        const updated = await apiCall(`/api/posts/${postId}/like`, { method: 'PUT' });
        const idx = allPosts.findIndex(p => p._id === postId);
        if (idx !== -1) {
          allPosts[idx] = updated;
          renderFeed();
        }
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Comment toggle
  document.querySelectorAll('.comment-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.postId;
      const section = document.getElementById(`comments-${postId}`);
      section.classList.toggle('hidden');
      if (!section.classList.contains('hidden')) {
        section.querySelector('.comment-input')?.focus();
      }
    });
  });

  // Submit comment
  document.querySelectorAll('.submit-comment-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
      const text = input.value.trim();
      if (!text) return;

      btn.disabled = true;
      try {
        const updated = await apiCall(`/api/posts/${postId}/comment`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });
        const idx = allPosts.findIndex(p => p._id === postId);
        if (idx !== -1) {
          allPosts[idx] = updated;
          renderFeed();
          // Re-show comments section
          const section = document.getElementById(`comments-${postId}`);
          section.classList.remove('hidden');
        }
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Enter key for comments
  document.querySelectorAll('.comment-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const postId = input.dataset.postId;
        document.querySelector(`.submit-comment-btn[data-post-id="${postId}"]`).click();
      }
    });
  });
}

// Notifications
async function loadNotifications() {
  try {
    const notifications = await apiCall('/api/notifications');
    const countRes = await apiCall('/api/notifications/unread-count');
    
    renderNotifications(notifications);
    updateNotificationBadge(countRes.count);
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNotifications(notifications) {
  const container = document.getElementById('notificationList');
  if (!notifications.length) {
    container.innerHTML = '<p class="text-center text-gray-500 py-4 text-sm">No notifications yet</p>';
    return;
  }

  container.innerHTML = notifications.map(notif => `
    <div class="notif-item px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer ${notif.read ? 'opacity-60' : 'bg-blue-50/50'}"
         data-notif-id="${notif._id}" data-read="${notif.read}">
      <img src="${getAvatarUrl(notif.sender?.profilePicture)}" alt="" class="w-10 h-10 rounded-full object-cover flex-shrink-0">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-800">${escapeHtml(notif.message)}</p>
        <p class="text-xs text-gray-400 mt-1">${timeAgo(notif.createdAt)}</p>
      </div>
      ${notif.type === 'skill_match' ? '<span class="text-lg">🤝</span>' : notif.type === 'like' ? '<span class="text-lg">👍</span>' : '<span class="text-lg">💬</span>'}
    </div>
  `).join('');

  // Mark as read on click
  container.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      if (item.dataset.read === 'false') {
        await apiCall(`/api/notifications/${item.dataset.notifId}/read`, { method: 'PUT' });
        item.dataset.read = 'true';
        item.classList.remove('bg-blue-50/50');
        item.classList.add('opacity-60');
        const badge = document.getElementById('notifBadge');
        const current = parseInt(badge.textContent) || 0;
        if (current > 1) badge.textContent = current - 1;
        else badge.classList.add('hidden');
      }
    });
  });
}

function setupNotificationPanel() {
  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== bell) {
      panel.classList.add('hidden');
    }
  });

  const markAllReadBtn = document.getElementById('markAllRead');
  markAllReadBtn.addEventListener('click', async () => {
    await apiCall('/api/notifications/read-all', { method: 'PUT' });
    await loadNotifications();
    showToast('All notifications marked as read', 'success');
  });
}

function setupLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await firebase.auth().signOut();
    clearCurrentUser();
    window.location.href = '/index.html';
  });
}
