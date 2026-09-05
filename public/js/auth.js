// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Switch between Login and Register Tabs
function switchAuthTab(tab) {
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Quick Demo Credential Helpers
function fillDemoStudent() {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = 'student@college.edu';
  document.getElementById('loginPassword').value = 'Student@123';
  showToast('Demo Student credentials loaded!', 'info');
}

// Restricted admin/faculty account - only this exact login is granted admin access
const ADMIN_EMAIL = 'dhonikabilin@gmail.com';
const ADMIN_PASSWORD = 'Dhonik@2008';

// Handle Login Submission
async function handleLogin(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('loginSubmitBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing in...`;

  // Only this exact email/password combination is granted admin access
  if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const adminToken = 'admin-session-' + Date.now();
    localStorage.setItem('student_token', adminToken);
    localStorage.setItem('student_user', JSON.stringify({
      name: 'Administrator',
      email: ADMIN_EMAIL,
      role: 'admin'
    }));

    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/admin.html';
    }, 700);
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Backend API unreachable (Status: ${res.status}). The Node.js Express server is not running at this address.`);
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please check credentials.');
    }

    // Safety net: never let any other account be treated as admin, even if a
    // backend response says otherwise. Only the fixed admin login above grants it.
    if (data.user.role === 'admin' && email.toLowerCase() !== ADMIN_EMAIL) {
      data.user.role = 'student';
    }

    localStorage.setItem('student_token', data.token);
    localStorage.setItem('student_user', JSON.stringify(data.user));

    showToast('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
    }, 700);
  } catch (err) {
    showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sign In to Student Hub</span><i class="fa-solid fa-arrow-right"></i>`;
  }
}

// Handle Registration Submission
async function handleRegister(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('regSubmitBtn');
  const name = document.getElementById('regName').value.trim();
  const rollNo = document.getElementById('regRollNo').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const year = document.getElementById('regYear').value;
  const department = document.getElementById('regDept').value.trim();
  const password = document.getElementById('regPassword').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating account...`;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rollNo, email, year, department, password })
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Backend API unreachable (Status: ${res.status}). The Node.js Express server is not running at this address.`);
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    localStorage.setItem('student_token', data.token);
    localStorage.setItem('student_user', JSON.stringify(data.user));

    showToast('Account created successfully! Loading your portal...', 'success');

    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 700);
  } catch (err) {
    showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Create Student Account</span><i class="fa-solid fa-check"></i>`;
  }
}

// If already logged in, redirect to dashboard automatically
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('student_token');
  if (token) {
    // Quick test if token valid
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
      } else {
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
      }
    })
    .catch(() => {
      // Offline or error, remain on login
    });
  }
});
