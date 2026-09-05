// State Variables
let currentUser = null;
let currentToken = null;
let currentYear = 1;
let currentSemester = 1;
let currentSubjects = [];
let activeSubject = null;
let searchDebounceTimeout = null;

// Helper: Toast Message
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
  }, 3500);
}

// Authenticated Fetch Wrapper
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  options.headers = headers;

  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  currentToken = localStorage.getItem('student_token');
  const storedUser = localStorage.getItem('student_user');

  if (!currentToken || !storedUser) {
    window.location.href = '/login';
    return;
  }

  try {
    currentUser = JSON.parse(storedUser);
    setupUserInterface();
    await loadSemestersForYear(currentYear);
    await loadBookmarksCount();
  } catch (err) {
    console.error('Failed to init dashboard:', err);
    window.location.href = '/login';
  }
});

// Setup User Badges and Permissions
function setupUserInterface() {
  document.getElementById('userNameDisplay').textContent = currentUser.name || 'Student';
  document.getElementById('userRollDisplay').textContent = `${currentUser.rollNo || 'ID'} • Year ${currentUser.year || 1}`;
  document.getElementById('userAvatar').textContent = (currentUser.name || 'S').charAt(0).toUpperCase();

  if (currentUser.role === 'admin') {
    const adminLink = document.getElementById('adminPortalLink');
    if (adminLink) adminLink.style.display = 'inline-flex';
  }
}

// Load Semesters for Selected Year
async function loadSemestersForYear(yearId) {
  try {
    const res = await authFetch(`/api/semesters?yearId=${yearId}`);
    const data = await res.json();

    const container = document.getElementById('semesterPillsContainer');
    container.innerHTML = '';

    if (data.semesters && data.semesters.length > 0) {
      data.semesters.forEach((sem, idx) => {
        const btn = document.createElement('button');
        btn.className = `pill-btn ${idx === 0 ? 'active' : ''}`;
        btn.textContent = `${sem.name} (${sem.code})`;
        btn.onclick = () => selectSemester(sem.id, btn);
        container.appendChild(btn);
      });

      // Default to the first semester of the selected year
      currentSemester = data.semesters[0].id;
      await loadSubjects(currentYear, currentSemester);
    } else {
      container.innerHTML = '<span class="text-muted" style="font-size:0.85rem;">No semesters listed</span>';
    }
  } catch (err) {
    console.error('Error loading semesters:', err);
  }
}

// Year Switcher Handler
async function selectYear(yearId) {
  currentYear = yearId;
  
  // Update year tab active state
  document.querySelectorAll('#yearPillsContainer .pill-btn').forEach(btn => {
    if (Number(btn.dataset.year) === yearId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  hideBookmarksView();
  await loadSemestersForYear(yearId);
}

// Semester Switcher Handler
async function selectSemester(semesterId, btnElement) {
  currentSemester = semesterId;
  
  document.querySelectorAll('#semesterPillsContainer .pill-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (btnElement) btnElement.classList.add('active');

  hideBookmarksView();
  await loadSubjects(currentYear, currentSemester);
}

// Load Subjects for Current Year & Semester
async function loadSubjects(year, semester) {
  try {
    const res = await authFetch(`/api/subjects?year=${year}&semester=${semester}`);
    const data = await res.json();
    currentSubjects = data.subjects || [];

    // Update headers
    const yearNames = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
    document.getElementById('currentSemesterTitle').textContent = `${yearNames[year] || 'Year ' + year} • Semester ${semester} Subjects`;
    document.getElementById('subjectsCountBadge').textContent = `${currentSubjects.length} Subjects Available`;

    renderSubjectsGrid(currentSubjects);

    // Auto-expand first subject if available
    if (currentSubjects.length > 0) {
      await selectSubject(currentSubjects[0].id);
    } else {
      document.getElementById('unitDetailSection').style.display = 'none';
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
    showToast('Failed to load subjects for this semester.', 'error');
  }
}

// Render Subject Cards
function renderSubjectsGrid(subjects) {
  const grid = document.getElementById('subjectsGrid');
  grid.innerHTML = '';

  if (subjects.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: #fff; border-radius: var(--radius-lg); border: 1px dashed var(--border);">
        <i class="fa-solid fa-book-open-reader" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 0.75rem;"></i>
        <h3>No subjects added yet for this semester</h3>
        <p class="text-muted" style="font-size: 0.9rem;">Subjects and notes for higher semesters can be added via the Admin portal.</p>
      </div>
    `;
    return;
  }

  subjects.forEach(sub => {
    const card = document.createElement('div');
    card.className = `subject-card ${activeSubject && activeSubject.id === sub.id ? 'selected' : ''}`;
    card.id = `subject-card-${sub.id}`;
    card.onclick = () => selectSubject(sub.id);

    card.innerHTML = `
      <div class="card-top">
        <div class="subject-icon-wrap">
          <i class="fa-solid ${sub.icon || 'fa-book'}"></i>
        </div>
        <span class="subject-code">${sub.code}</span>
      </div>
      <h3 class="subject-title">${sub.name}</h3>
      <p class="subject-desc">${sub.description}</p>
      <div class="card-footer">
        <span><i class="fa-solid fa-list-ol"></i> 5 Units</span>
        <span><i class="fa-solid fa-file-pdf text-danger" style="color:#ef4444;"></i> ${sub.notesCount || 5} Notes Available</span>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Select Subject & Display its Unit 1 - Unit 5 with PDF Notes
async function selectSubject(subjectId) {
  // Update card highlights
  document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));
  const targetCard = document.getElementById(`subject-card-${subjectId}`);
  if (targetCard) targetCard.classList.add('selected');

  try {
    const res = await authFetch(`/api/subjects/${subjectId}`);
    const data = await res.json();

    if (!data.success || !data.subject) {
      throw new Error('Subject could not be loaded.');
    }

    activeSubject = data.subject;
    renderUnitDetails(activeSubject);

    const unitSection = document.getElementById('unitDetailSection');
    unitSection.style.display = 'block';
  } catch (err) {
    console.error('Error fetching subject units:', err);
    showToast('Failed to load unit details.', 'error');
  }
}

// Render Unit Details (Units 1 to 5)
function renderUnitDetails(subject) {
  document.getElementById('activeSubjectCode').textContent = subject.code;
  document.getElementById('activeSubjectTitle').textContent = subject.name;
  document.getElementById('activeSubjectCredits').textContent = `${subject.credits || 3} Credits`;
  document.getElementById('activeSubjectDesc').textContent = subject.description || '';

  const unitsList = document.getElementById('unitsList');
  unitsList.innerHTML = '';

  if (!subject.units || subject.units.length === 0) {
    unitsList.innerHTML = '<p class="text-muted">No units currently assigned to this subject.</p>';
    return;
  }

  subject.units.forEach(unit => {
    const unitCard = document.createElement('div');
    unitCard.className = 'unit-card';

    let notesHtml = '';
    if (unit.notes && unit.notes.length > 0) {
      unit.notes.forEach(note => {
        notesHtml += `
          <div class="note-item" id="note-item-${note.id}">
            <div class="note-info">
              <div class="pdf-icon-wrap">
                <i class="fa-solid fa-file-pdf"></i>
              </div>
              <div>
                <div class="note-meta-title">${note.title}</div>
                <div class="note-meta-sub">
                  <span><i class="fa-solid fa-hard-drive"></i> ${note.fileSize}</span>
                  <span><i class="fa-solid fa-eye"></i> ${note.viewsCount || 0} views</span>
                  <span><i class="fa-solid fa-download"></i> ${note.downloadsCount || 0} downloads</span>
                </div>
              </div>
            </div>
            <div class="note-actions">
              <button 
                class="btn-bookmark ${note.isBookmarked ? 'bookmarked' : ''}" 
                onclick="handleToggleBookmark(event, ${note.id})" 
                title="${note.isBookmarked ? 'Remove bookmark' : 'Bookmark this note'}"
              >
                <i class="fa-${note.isBookmarked ? 'solid' : 'regular'} fa-star"></i>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="openPdfModal(${note.id}, '${escapeHtml(note.title)}')">
                <i class="fa-solid fa-eye"></i> Preview
              </button>
              <a href="/api/notes/${note.id}/download" class="btn btn-primary btn-sm" onclick="incrementDownloadUi(${note.id})">
                <i class="fa-solid fa-download"></i> Download
              </a>
            </div>
          </div>
        `;
      });
    } else {
      notesHtml = '<div style="padding: 0.75rem; color: var(--text-muted); font-size: 0.85rem;">No PDF notes uploaded for this unit yet.</div>';
    }

    unitCard.innerHTML = `
      <div class="unit-header">
        <div class="unit-title-group">
          <span class="unit-badge">UNIT ${unit.unitNumber}</span>
          <span class="unit-title">${unit.unitTitle}</span>
        </div>
      </div>
      <div class="unit-body">
        <div class="unit-topics">
          <strong>Key Topics:</strong> ${unit.topics || 'Standard academic syllabus and study topics.'}
        </div>
        ${notesHtml}
      </div>
    `;

    unitsList.appendChild(unitCard);
  });
}

// In-Browser PDF Viewer Modal
function openPdfModal(noteId, title) {
  const modal = document.getElementById('pdfModalOverlay');
  const iframe = document.getElementById('pdfFrame');
  const titleEl = document.getElementById('modalPdfTitle');
  const downloadBtn = document.getElementById('modalDownloadBtn');
  const openExternalBtn = document.getElementById('modalOpenExternalBtn');

  titleEl.textContent = title;
  
  // Construct streaming URL with token
  const viewUrl = `/api/notes/${noteId}/view?token=${encodeURIComponent(currentToken)}`;
  const downloadUrl = `/api/notes/${noteId}/download?token=${encodeURIComponent(currentToken)}`;

  iframe.src = viewUrl;
  downloadBtn.href = downloadUrl;
  openExternalBtn.href = viewUrl;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePdfModal() {
  const modal = document.getElementById('pdfModalOverlay');
  const iframe = document.getElementById('pdfFrame');
  modal.classList.remove('active');
  iframe.src = 'about:blank';
  document.body.style.overflow = 'auto';
}

// Toggle Bookmark
async function handleToggleBookmark(event, noteId) {
  event.stopPropagation();
  const btn = event.currentTarget;

  try {
    const res = await authFetch(`/api/bookmarks/${noteId}`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      if (data.bookmarked) {
        btn.classList.add('bookmarked');
        btn.innerHTML = `<i class="fa-solid fa-star"></i>`;
        showToast('Saved to your exam bookmarks!', 'success');
      } else {
        btn.classList.remove('bookmarked');
        btn.innerHTML = `<i class="fa-regular fa-star"></i>`;
        showToast('Removed from bookmarks.', 'info');
      }
      await loadBookmarksCount();
    }
  } catch (err) {
    showToast('Failed to update bookmark.', 'error');
  }
}

// Load Bookmark count
async function loadBookmarksCount() {
  try {
    const res = await authFetch('/api/bookmarks');
    const data = await res.json();
    const count = (data.bookmarks || []).length;
    document.getElementById('bookmarkCountBadge').textContent = `Saved (${count})`;
  } catch (err) {
    console.error('Error loading bookmark count:', err);
  }
}

// Show Bookmarks View
async function showBookmarksView() {
  try {
    const res = await authFetch('/api/bookmarks');
    const data = await res.json();
    const bookmarks = data.bookmarks || [];

    document.getElementById('subjectsGrid').style.display = 'none';
    document.getElementById('unitDetailSection').style.display = 'none';
    document.getElementById('subjectsSectionHeader').style.display = 'none';

    const bookmarksSection = document.getElementById('bookmarksSection');
    bookmarksSection.style.display = 'block';

    const list = document.getElementById('bookmarksList');
    list.innerHTML = '';

    if (bookmarks.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <i class="fa-regular fa-star" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 0.75rem;"></i>
          <h3>No starred notes yet</h3>
          <p class="text-muted" style="font-size: 0.9rem;">Click the star icon next to any unit note to save it here for fast revision before exams!</p>
        </div>
      `;
      return;
    }

    bookmarks.forEach(b => {
      const item = document.createElement('div');
      item.className = 'note-item';
      item.innerHTML = `
        <div class="note-info">
          <div class="pdf-icon-wrap"><i class="fa-solid fa-file-pdf"></i></div>
          <div>
            <div class="note-meta-title">${b.subject ? b.subject.name + ' - ' : ''}${b.note.title}</div>
            <div class="note-meta-sub">
              <span><i class="fa-solid fa-bookmark"></i> ${b.unit ? b.unit.unitTitle : 'Unit Note'}</span>
              <span><i class="fa-solid fa-hard-drive"></i> ${b.note.fileSize}</span>
            </div>
          </div>
        </div>
        <div class="note-actions">
          <button class="btn btn-secondary btn-sm" onclick="openPdfModal(${b.note.id}, '${escapeHtml(b.note.title)}')">
            <i class="fa-solid fa-eye"></i> Preview
          </button>
          <a href="/api/notes/${b.note.id}/download" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-download"></i> Download
          </a>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    showToast('Failed to load bookmarks', 'error');
  }
}

function hideBookmarksView() {
  document.getElementById('bookmarksSection').style.display = 'none';
  document.getElementById('subjectsGrid').style.display = 'grid';
  document.getElementById('subjectsSectionHeader').style.display = 'flex';
  if (activeSubject) {
    document.getElementById('unitDetailSection').style.display = 'block';
  }
}

// Global Live Search with Debounce
function handleSearchInput(event) {
  const query = event.target.value.trim();
  clearTimeout(searchDebounceTimeout);

  if (!query) {
    clearSearch();
    return;
  }

  searchDebounceTimeout = setTimeout(async () => {
    try {
      const res = await authFetch(`/api/notes/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      displaySearchResults(data.results || [], query);
    } catch (err) {
      console.error('Search error:', err);
    }
  }, 300);
}

function displaySearchResults(results, query) {
  const banner = document.getElementById('searchResultsBanner');
  const bannerText = document.getElementById('searchResultText');
  banner.style.display = 'flex';
  bannerText.textContent = `Found ${results.length} note(s) matching "${query}"`;

  document.getElementById('subjectsGrid').style.display = 'none';
  document.getElementById('bookmarksSection').style.display = 'none';
  
  const unitSection = document.getElementById('unitDetailSection');
  unitSection.style.display = 'block';

  document.getElementById('activeSubjectCode').textContent = 'SEARCH';
  document.getElementById('activeSubjectTitle').textContent = `Search Results for "${query}"`;
  document.getElementById('activeSubjectCredits').textContent = `${results.length} Matches`;
  document.getElementById('activeSubjectDesc').textContent = `Showing notes and topics matching your query.`;

  const unitsList = document.getElementById('unitsList');
  unitsList.innerHTML = '';

  if (results.length === 0) {
    unitsList.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2.2rem; color: var(--text-light); margin-bottom: 0.5rem;"></i>
        <h3>No matching notes found</h3>
        <p class="text-muted" style="font-size: 0.9rem;">Try searching for subjects (e.g. "Math", "Physics", "Python") or unit topics.</p>
      </div>
    `;
    return;
  }

  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-info">
        <div class="pdf-icon-wrap"><i class="fa-solid fa-file-pdf"></i></div>
        <div>
          <div class="note-meta-title">${r.subject ? r.subject.code + ': ' : ''}${r.note.title}</div>
          <div class="note-meta-sub">
            <span><i class="fa-solid fa-book"></i> ${r.subject ? r.subject.name : ''}</span>
            <span><i class="fa-solid fa-layer-group"></i> ${r.unit ? r.unit.unitTitle : ''}</span>
            <span><i class="fa-solid fa-hard-drive"></i> ${r.note.fileSize}</span>
          </div>
        </div>
      </div>
      <div class="note-actions">
        <button class="btn btn-secondary btn-sm" onclick="openPdfModal(${r.note.id}, '${escapeHtml(r.note.title)}')">
          <i class="fa-solid fa-eye"></i> Preview
        </button>
        <a href="/api/notes/${r.note.id}/download" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-download"></i> Download
        </a>
      </div>
    `;
    unitsList.appendChild(item);
  });
}

function clearSearch() {
  document.getElementById('globalSearchInput').value = '';
  document.getElementById('searchResultsBanner').style.display = 'none';
  document.getElementById('subjectsGrid').style.display = 'grid';
  if (activeSubject) {
    renderUnitDetails(activeSubject);
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function incrementDownloadUi(noteId) {
  setTimeout(async () => {
    if (activeSubject) {
      await selectSubject(activeSubject.id);
    }
  }, 1000);
}

// User Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('student_token');
  localStorage.removeItem('student_user');
  window.location.href = '/login';
}

// Helper: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Close modal on Escape key press
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePdfModal();
  }
});
