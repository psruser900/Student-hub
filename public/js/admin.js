let currentToken = null;
let currentUser = null;

// Toast Helper
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

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  options.headers = headers;

  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    showToast('Unauthorized access. Admin privileges required.', 'error');
    setTimeout(() => { window.location.href = '/login'; }, 1000);
    throw new Error('Access denied.');
  }
  return res;
}

// Initialize Admin Portal
document.addEventListener('DOMContentLoaded', async () => {
  currentToken = localStorage.getItem('student_token');
  const storedUser = localStorage.getItem('student_user');

  if (!currentToken || !storedUser) {
    window.location.href = '/login';
    return;
  }

  currentUser = JSON.parse(storedUser);
  if (currentUser.role !== 'admin') {
    alert('Access restricted to administrators and faculty.');
    window.location.href = '/dashboard';
    return;
  }

  await loadStats();
  await onYearChange();
  await loadAllSubjects();
  await loadAllNotes();
});

// Load Portal Stats
async function loadStats() {
  try {
    const res = await authFetch('/api/admin/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('statStudents').textContent = data.stats.totalStudents || 0;
      document.getElementById('statSubjects').textContent = data.stats.totalSubjects || 0;
      document.getElementById('statNotes').textContent = data.stats.totalNotes || 0;
      document.getElementById('statDownloads').textContent = data.stats.totalDownloads || 0;
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

// Cascading Dropdowns
async function onYearChange() {
  const yearId = document.getElementById('uploadYear').value;
  try {
    const res = await authFetch(`/api/semesters?yearId=${yearId}`);
    const data = await res.json();
    const semSelect = document.getElementById('uploadSemester');
    semSelect.innerHTML = '';

    (data.semesters || []).forEach(sem => {
      const opt = document.createElement('option');
      opt.value = sem.id;
      opt.textContent = `${sem.name} (${sem.code})`;
      semSelect.appendChild(opt);
    });

    await onSemesterChange();
  } catch (err) {
    console.error('Error fetching semesters:', err);
  }
}

async function onSemesterChange() {
  const yearId = document.getElementById('uploadYear').value;
  const semesterId = document.getElementById('uploadSemester').value;

  try {
    const res = await authFetch(`/api/subjects?year=${yearId}&semester=${semesterId}`);
    const data = await res.json();
    const subjSelect = document.getElementById('uploadSubject');
    subjSelect.innerHTML = '';

    const subjects = data.subjects || [];
    if (subjects.length === 0) {
      subjSelect.innerHTML = '<option value="">No subjects in this semester</option>';
      document.getElementById('uploadUnit').innerHTML = '<option value="">Select subject first</option>';
      return;
    }

    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.code} - ${s.name}`;
      subjSelect.appendChild(opt);
    });

    await onSubjectChange();
  } catch (err) {
    console.error('Error fetching subjects:', err);
  }
}

async function onSubjectChange() {
  const subjectId = document.getElementById('uploadSubject').value;
  if (!subjectId) return;

  try {
    const res = await authFetch(`/api/subjects/${subjectId}`);
    const data = await res.json();
    const unitSelect = document.getElementById('uploadUnit');
    unitSelect.innerHTML = '';

    const units = data.subject ? data.subject.units : [];
    if (units.length === 0) {
      unitSelect.innerHTML = '<option value="">No units defined</option>';
      return;
    }

    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `Unit ${u.unitNumber}: ${u.unitTitle}`;
      unitSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Error fetching subject units:', err);
  }
}

// Upload Note Handler
async function handleUploadNote(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('uploadSubmitBtn');
  const unitId = document.getElementById('uploadUnit').value;
  const title = document.getElementById('uploadTitle').value.trim();
  const description = document.getElementById('uploadDesc').value.trim();
  const fileInput = document.getElementById('uploadFile');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a PDF file to upload.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('unitId', unitId);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('pdfFile', fileInput.files[0]);

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

  try {
    const res = await fetch('/api/admin/notes/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Upload failed.');
    }

    showToast('PDF Note uploaded successfully!', 'success');
    document.getElementById('uploadForm').reset();
    await onYearChange();
    await loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><span>Upload & Publish Note</span>`;
  }
}

// Create New Subject Handler
async function handleCreateSubject(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('createSubjBtn');
  const yearId = document.getElementById('subjYear').value;
  const semesterId = document.getElementById('subjSemester').value;
  const code = document.getElementById('subjCode').value.trim();
  const credits = document.getElementById('subjCredits').value;
  const name = document.getElementById('subjName').value.trim();
  const description = document.getElementById('subjDesc').value.trim();

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating...`;

  try {
    const res = await authFetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearId, semesterId, code, credits, name, description })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to create subject.');
    }

    showToast(`Subject ${code} and 5 units created!`, 'success');
    document.getElementById('newSubjectForm').reset();
    await onYearChange();
    await loadAllSubjects();
    await loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-plus"></i><span>Create Subject & Initialize 5 Units</span>`;
  }
}

// Load All Subjects Table
async function loadAllSubjects() {
  const tbody = document.getElementById('adminSubjectsTableBody');
  if (!tbody) return;

  try {
    const res = await authFetch('/api/subjects');
    const data = await res.json();
    const subjects = data.subjects || [];

    if (subjects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No subjects found. Use the form above to add one.</td></tr>`;
      return;
    }

    const yearNames = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

    tbody.innerHTML = subjects.map(s => `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 0.85rem 1rem; font-weight: 700; color: var(--primary);">
          <span class="badge badge-primary">${s.code}</span>
        </td>
        <td style="padding: 0.85rem 1rem; font-weight: 600; color: var(--dark);">
          <i class="fa-solid ${s.icon || 'fa-book'}" style="margin-right: 0.4rem; color: var(--primary);"></i>
          ${s.name}
        </td>
        <td style="padding: 0.85rem 1rem; color: var(--text-muted);">${yearNames[s.yearId] || `${s.yearId} Year`}</td>
        <td style="padding: 0.85rem 1rem; color: var(--text-muted);">Semester ${s.semesterId}</td>
        <td style="padding: 0.85rem 1rem; text-align: center;"><span class="badge" style="background:#e0f2fe; color:#0369a1;">${s.unitsCount || 0} Units</span></td>
        <td style="padding: 0.85rem 1rem; text-align: center;"><span class="badge" style="background:#fef3c7; color:#b45309;">${s.notesCount || 0} Notes</span></td>
        <td style="padding: 0.85rem 1rem; text-align: right;">
          <button 
            class="btn btn-danger btn-sm" 
            style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;"
            onclick="handleDeleteSubject(${s.id}, '${s.code} - ${s.name.replace(/'/g, "\\'")}')"
            title="Delete this subject and its notes"
          >
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading subjects:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 1.5rem; text-align: center; color: #dc2626;">Failed to load subjects.</td></tr>`;
  }
}

// Delete Subject Handler
async function handleDeleteSubject(subjectId, subjectTitle) {
  const confirmed = confirm(`Are you sure you want to delete "${subjectTitle}"?\n\nThis will permanently delete this subject, all its syllabus units, and all associated note files.`);
  if (!confirmed) return;

  try {
    const res = await authFetch(`/api/admin/subjects/${subjectId}`, {
      method: 'DELETE'
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned HTML (status ${res.status}). Please restart your Node server (Ctrl + C then npm start) to load the new delete route.`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete subject.');
    }

    showToast('Subject deleted successfully!', 'success');
    await loadAllSubjects();
    await onYearChange();
    await loadStats();
    await loadAllNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('student_token');
  localStorage.removeItem('student_user');
  window.location.href = '/login';
}

// -------------------------------------------------------------
// Note & Lesson Editing Features
// -------------------------------------------------------------
let allNotesCache = [];

async function loadAllNotes() {
  try {
    const res = await authFetch('/api/admin/notes');
    const data = await res.json();
    allNotesCache = data.notes || [];

    // Populate Subject Filter dropdown
    const filterSelect = document.getElementById('adminSubjectFilter');
    if (filterSelect) {
      const uniqueSubjects = [];
      const seen = new Set();
      allNotesCache.forEach(n => {
        if (n.subjectCode && !seen.has(n.subjectCode)) {
          seen.add(n.subjectCode);
          uniqueSubjects.push({ code: n.subjectCode, name: n.subjectName });
        }
      });

      filterSelect.innerHTML = '<option value="">All Subjects</option>';
      uniqueSubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.code} - ${s.name}`;
        filterSelect.appendChild(opt);
      });
    }

    renderNotesTable(allNotesCache);
  } catch (err) {
    console.error('Error loading all notes:', err);
  }
}

function renderNotesTable(notes) {
  const tbody = document.getElementById('adminNotesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (notes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No notes match your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  notes.forEach(n => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';
    tr.innerHTML = `
      <td style="padding: 0.85rem 1rem;">
        <div style="font-weight: 700; color: var(--primary);">${n.subjectCode}</div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">${n.subjectName}</div>
      </td>
      <td style="padding: 0.85rem 1rem;">
        <div style="font-weight: 600; color: var(--dark);">Unit ${n.unitNumber}: ${n.unitTitle}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${n.topics}
        </div>
      </td>
      <td style="padding: 0.85rem 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-file-pdf text-danger" style="color: #ef4444;"></i>
          <span style="font-family: monospace; font-size: 0.82rem;">${n.fileName}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${n.fileSize}</div>
      </td>
      <td style="padding: 0.85rem 1rem; text-align: right;">
        <div style="display: inline-flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${n.id})" title="Modify lesson title or replace PDF">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="handleDeleteNote(${n.id})" title="Delete note">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterNotesTable() {
  const search = (document.getElementById('adminNoteSearch').value || '').toLowerCase().trim();
  const subjectCode = (document.getElementById('adminSubjectFilter').value || '').trim();

  const filtered = allNotesCache.filter(n => {
    const matchesSubject = !subjectCode || n.subjectCode === subjectCode;
    const matchesSearch = !search ||
      n.unitTitle.toLowerCase().includes(search) ||
      n.title.toLowerCase().includes(search) ||
      n.subjectName.toLowerCase().includes(search) ||
      n.subjectCode.toLowerCase().includes(search) ||
      (n.topics && n.topics.toLowerCase().includes(search));
    return matchesSubject && matchesSearch;
  });

  renderNotesTable(filtered);
}

function openEditModal(noteId) {
  const note = allNotesCache.find(n => n.id === Number(noteId));
  if (!note) return;

  document.getElementById('editNoteId').value = note.id;
  document.getElementById('editUnitTitle').value = note.unitTitle || '';
  document.getElementById('editTopics').value = note.topics || '';
  document.getElementById('editNoteTitle').value = note.title || '';
  document.getElementById('editCurrentFileName').textContent = `${note.fileName} (${note.fileSize})`;
  document.getElementById('editReplaceFile').value = '';

  const modal = document.getElementById('editNoteModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  const modal = document.getElementById('editNoteModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

async function handleSaveNoteEdit(event) {
  event.preventDefault();
  const noteId = document.getElementById('editNoteId').value;
  const unitTitle = document.getElementById('editUnitTitle').value.trim();
  const topics = document.getElementById('editTopics').value.trim();
  const noteTitle = document.getElementById('editNoteTitle').value.trim();
  const fileInput = document.getElementById('editReplaceFile');
  const saveBtn = document.getElementById('saveEditBtn');

  const formData = new FormData();
  formData.append('unitTitle', unitTitle);
  formData.append('topics', topics);
  formData.append('noteTitle', noteTitle);
  if (fileInput.files && fileInput.files.length > 0) {
    formData.append('pdfFile', fileInput.files[0]);
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const res = await fetch(`/api/admin/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${currentToken}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update note.');

    showToast('Lesson title and PDF note updated successfully!', 'success');
    closeEditModal();
    await loadAllNotes();
    await loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Save Changes</span>`;
  }
}

async function handleDeleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this PDF note?')) return;

  try {
    const res = await authFetch(`/api/admin/notes/${noteId}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Failed to delete note.');

    showToast('Note deleted.', 'info');
    await loadAllNotes();
    await loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
