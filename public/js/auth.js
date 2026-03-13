// Auth page logic
document.addEventListener('DOMContentLoaded', async () => {
  await initializeFirebase();

  // Check if user is already logged in
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      const userData = getCurrentUser();
      if (userData) {
        window.location.href = '/feed.html';
      }
    }
  });

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToLogin = document.getElementById('switchToLogin');
  const loginSection = document.getElementById('loginSection');
  const signupSection = document.getElementById('signupSection');

  // Toggle between login and signup
  switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
  });

  switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = loginForm.querySelector('button[type="submit"]');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Signing in...';

    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const result = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ firebaseUid: userCredential.user.uid })
      });
      saveCurrentUser(result.user);
      showToast('Welcome back!', 'success');
      setTimeout(() => window.location.href = '/feed.html', 500);
    } catch (error) {
      showToast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Sign up
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const btn = signupForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Creating account...';

    try {
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      
      const result = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firebaseUid: userCredential.user.uid,
          name,
          email
        })
      });
      saveCurrentUser(result.user);
      showToast('Account created successfully!', 'success');
      setTimeout(() => window.location.href = '/edit-profile.html', 500);
    } catch (error) {
      showToast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
});
