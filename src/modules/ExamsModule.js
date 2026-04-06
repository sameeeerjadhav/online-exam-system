/**
 * ExamsModule.js — Renders the Exam Configurations page.
 */
import modalService from '../services/ModalService.js';

export async function renderExams(ApiClient) {
  const [allConfigs, allBanks] = await Promise.all([ApiClient.getExams(), ApiClient.getQuestionBanks()]);
  const el = document.getElementById('page-content');

  // State for filtering
  let filterText = '';
  let filterType = '';
  let filterStatus = '';

  function renderTable() {
    const filtered = allConfigs.filter(cfg => {
      const matchesText = !filterText ||
        cfg.title.toLowerCase().includes(filterText.toLowerCase()) ||
        cfg.exam_id.toLowerCase().includes(filterText.toLowerCase());

      const matchesType = !filterType || cfg.exam_type === filterType;
      const matchesStatus = !filterStatus || (filterStatus === 'active' ? cfg.active : !cfg.active);

      return matchesText && matchesType && matchesStatus;
    });

    const tbody = document.querySelector('#exams-table-body');
    if (!tbody) return;

    tbody.innerHTML = filtered.length === 0
      ? '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">No matching exams found.</td></tr>'
      : filtered.map(cfg => `
        <tr>
          <td style="font-family:monospace;font-size:0.78rem;color:var(--text-muted)">${cfg.exam_id}</td>
          <td style="font-weight:600">${cfg.title}</td>
          <td><span class="badge ${cfg.exam_type === 'demo' ? 'badge-blue' : 'badge-gray'}">${cfg.exam_type}</span></td>
          <td>${cfg.duration} min</td>
          <td>${cfg.total_questions}</td>
          <td>${cfg.passing_score}%</td>
          <td><span class="badge ${cfg.active ? 'badge-green' : 'badge-gray'}">${cfg.active ? 'Active' : 'Inactive'}</span></td>
          <td>
            <div style="display:flex;gap:0.375rem">
              <button class="btn btn-outline btn-sm" onclick="toggleExam('${cfg.id}','${cfg.active}')">${cfg.active ? 'Deactivate' : 'Activate'}</button>
              <button class="btn btn-outline btn-sm" onclick="editExam('${cfg.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteExam('${cfg.id}')">Delete</button>
            </div>
          </td>
        </tr>`).join('');
  }

  el.innerHTML = `
  <div class="page-header">
    <div><h2>Exam Configurations</h2><p id="exam-count-label">${allConfigs.length} exam(s) configured</p></div>
    <button id="add-exam-btn" class="btn btn-primary">+ New Exam</button>
  </div>

  <div class="card" style="margin-bottom:1.5rem; padding:1rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:center; background: var(--gray-50)">
    <div style="flex:1; min-width:240px; position:relative">
      <input type="text" id="ex-search" class="form-input" placeholder="Search by title or ID..." style="padding-left:2.5rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--gray-400)">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </div>
    <div style="width:150px">
      <select id="ex-type-filter" class="form-select">
        <option value="">All Types</option>
        <option value="main">Main</option>
        <option value="demo">Demo</option>
      </select>
    </div>
    <div style="width:150px">
      <select id="ex-status-filter" class="form-select">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  </div>

  <div class="table-wrap card">
    <table>
      <thead><tr><th>Exam ID</th><th>Title</th><th>Type</th><th>Duration</th><th>Questions</th><th>Pass %</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="exams-table-body"></tbody>
    </table>
  </div>`;

  renderTable();

  document.getElementById('ex-search').addEventListener('input', e => {
    filterText = e.target.value;
    renderTable();
  });

  document.getElementById('ex-type-filter').addEventListener('change', e => {
    filterType = e.target.value;
    renderTable();
  });

  document.getElementById('ex-status-filter').addEventListener('change', e => {
    filterStatus = e.target.value;
    renderTable();
  });

  document.getElementById('add-exam-btn').addEventListener('click', () => showExamModal(ApiClient));

  window.editExam = async (id) => {
    try {
      const exams = await ApiClient.getExams();
      const exam = exams.find(e => e.id == id);
      showExamModal(ApiClient, exam);
    } catch (e) { modalService.toast(e.message, 'error'); }
  };

  window.toggleExam = async (id) => {
    try { await ApiClient.toggleExam(id); renderExams(ApiClient); }
    catch (e) { modalService.toast(e.message, 'error'); }
  };

  window.deleteExam = async (id) => {
    const ok = await modalService.confirm('Delete this exam configuration?', { title: 'Delete Exam', confirmText: 'Delete', type: 'danger' });
    if (ok) {
      try { await ApiClient.deleteExam(id); renderExams(ApiClient); }
      catch (e) { modalService.toast(e.message, 'error'); }
    }
  };
}

function getOverlay() {
  let ov = document.getElementById('modal-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'modal-overlay';
    ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;overflow-y:auto;padding:1rem';
    ov.innerHTML = '<div id="modal-box"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) window.closeModal(); });
  }
  return ov;
}

async function showExamModal(ApiClient, exam = null) {
  const banks = await ApiClient.getQuestionBanks();
  const bankOpts = banks.map(b => `<option value="${b.id}" ${exam?.question_bank_id === b.id ? 'selected' : ''}>${b.title} (${b.questions_count} Qs)</option>`).join('');
  getOverlay().style.display = 'flex';
  document.getElementById('modal-box').innerHTML = `
    <div class="modal-card" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></div>
        <h3 class="modal-title">${exam ? 'Edit Exam' : 'New Exam Configuration'}</h3>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Exam Title *</label><input id="ex-title" class="form-input" value="${exam?.title || ''}" placeholder="e.g. Main Exam 2025"></div>
        <div class="form-group"><label class="form-label">Exam ID</label><input id="ex-id" class="form-input" value="${exam?.exam_id || ''}" placeholder="auto" ${exam ? 'readonly style="background:var(--gray-100)"' : ''}></div>
        <div class="form-group"><label class="form-label">Subject *</label><input id="ex-subj" class="form-input" value="${exam?.subject || ''}" placeholder="e.g. Mathematics"></div>
        <div class="form-group"><label class="form-label">Type</label><select id="ex-type" class="form-select"><option value="demo" ${exam?.exam_type === 'demo' ? 'selected' : ''}>Demo/Practice</option><option value="main" ${exam?.exam_type === 'main' ? 'selected' : ''}>Main/Official</option></select></div>
        <div class="form-group"><label class="form-label">Duration (min)</label><input id="ex-dur" class="form-input" type="number" value="${exam?.duration || 30}" min="1"></div>
        <div class="form-group"><label class="form-label">Questions to Show *</label><input id="ex-qs" class="form-input" type="number" value="${exam?.total_questions || 10}" min="1"></div>
        <div class="form-group"><label class="form-label">Passing Score (%)</label><input id="ex-pass" class="form-input" type="number" value="${exam?.passing_score || 60}" min="1" max="100"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Question Bank</label><select id="ex-bank" class="form-select">${bankOpts}</select></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Instructions (optional)</label><textarea id="ex-inst" class="form-textarea">${exam?.instructions || ''}</textarea></div>
      </div>
      <p style="font-size:0.78rem;color:var(--text-muted);margin:0.5rem 0">ℹ️ Each student gets a unique random selection from the bank.</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="doSaveExam('${exam?.id || ''}')"> ${exam ? 'Save Changes' : 'Create Exam'}</button>
      </div>
    </div>`;

  window.doSaveExam = async (existingDbId) => {
    const cfg = {
      exam_id: document.getElementById('ex-id').value.trim() || undefined,
      title: document.getElementById('ex-title').value.trim(),
      subject: document.getElementById('ex-subj').value.trim() || 'General',
      exam_type: document.getElementById('ex-type').value,
      duration: parseInt(document.getElementById('ex-dur').value) || 30,
      total_questions: parseInt(document.getElementById('ex-qs').value) || 10,
      passing_score: parseInt(document.getElementById('ex-pass').value) || 60,
      question_bank_id: document.getElementById('ex-bank').value,
      instructions: document.getElementById('ex-inst').value.trim(),
    };
    if (!cfg.title) { modalService.toast('Exam Title is required', 'error'); return; }
    try {
      if (existingDbId) { await ApiClient.updateExam(existingDbId, cfg); }
      else { await ApiClient.createExam(cfg); }
      window.closeModal();
      renderExams(ApiClient);
    } catch (e) { modalService.toast('Failed to save exam: ' + e.message, 'error'); }
  };
}
