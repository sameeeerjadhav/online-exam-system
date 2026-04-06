/**
 * QuestionsModule.js — Renders the Question Banks page.
 */
import modalService from '../services/ModalService.js';

function getKnownCentres() {
  return ['Center A', 'Center B', 'Center C'].sort();
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

export async function renderQuestions(ApiClient, { currentUser }) {
  const allBanks = await ApiClient.getQuestionBanks();
  const el = document.getElementById('page-content');
  const centres = getKnownCentres();

  // State for filtering
  let filterText = '';
  let filterCentre = '';

  function renderList() {
    const filtered = allBanks.filter(b => {
      const matchesText = !filterText ||
        b.title.toLowerCase().includes(filterText.toLowerCase()) ||
        b.subject.toLowerCase().includes(filterText.toLowerCase());

      const matchesCentre = !filterCentre ||
        (Array.isArray(b.assigned_to) && b.assigned_to.includes(filterCentre)) ||
        (b.centre_id === filterCentre);

      return matchesText && matchesCentre;
    });

    const listDiv = document.getElementById('banks-list');
    if (!listDiv) return;

    listDiv.innerHTML = filtered.length === 0
      ? '<div class="empty-state"><h3>No matching question banks</h3><p>Try adjusting your filters.</p></div>'
      : filtered.map(bank => {
        const assignedLabel = currentUser.role === 'admin'
          ? (Array.isArray(bank.assigned_to) && bank.assigned_to.length
            ? `<span class="badge badge-blue" style="font-size:0.7rem">${bank.assigned_to.join(', ')}</span>`
            : '<span class="badge badge-gray" style="font-size:0.7rem">Unassigned</span>')
          : '';
        const isOwned = bank.created_by_user_id === currentUser.id;
        const ownerBadge = isOwned
          ? '<span class="badge badge-green" style="font-size:0.7rem">Mine</span>'
          : '<span class="badge badge-gray" style="font-size:0.7rem">Assigned</span>';
        return `
          <div class="card" style="margin-bottom:1rem">
            <div class="card-header">
              <div>
                <div style="font-weight:700;display:flex;align-items:center;gap:0.5rem">${bank.title} ${currentUser.role === 'admin' ? '' : ownerBadge}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${bank.questions_count} questions · ${bank.subject} · by ${bank.creator_name || 'Admin'} ${assignedLabel}</div>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="addQuestion('${bank.id}')">+ Add Q</button>
                <button class="btn btn-outline btn-sm" onclick="editBank('${bank.id}')">Edit</button>
                ${currentUser.role === 'admin' ? `<button class="btn btn-outline btn-sm" onclick="showAssignBankModal('${bank.id}')">🔗 Assign</button>` : ''}
                <button class="btn btn-outline btn-sm toggle-bank" data-id="${bank.id}">Show</button>
                ${(currentUser.role === 'admin' || isOwned) ? `<button class="btn btn-danger btn-sm" onclick="deleteBank('${bank.id}')">Delete</button>` : ''}
              </div>
            </div>
            <div id="bank-qs-${bank.id}" style="display:none"></div>
          </div>`;
      }).join('');

    // Re-attach toggle events
    listDiv.querySelectorAll('.toggle-bank').forEach(btn => {
      btn.onclick = async () => {
        const bankId = btn.dataset.id;
        const qsDiv = document.getElementById('bank-qs-' + bankId);
        if (qsDiv.style.display !== 'none') {
          qsDiv.style.display = 'none'; btn.textContent = 'Show'; return;
        }
        qsDiv.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-400)">Loading questions...</div>';
        qsDiv.style.display = 'block'; btn.textContent = 'Hide';
        try {
          const questions = await ApiClient.getQuestionBankQuestions(bankId);
          qsDiv.innerHTML = questions.length === 0
            ? '<div style="padding:2rem;text-align:center;color:var(--gray-400)">No questions in this bank.</div>'
            : `<div class="table-wrap"><table>
                  <thead><tr><th>#</th><th>Question</th><th>Options</th><th>Answer</th><th>Actions</th></tr></thead>
                  <tbody>${questions.map((q, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td style="max-width:260px">${q.text}</td>
                    <td style="font-size:0.78rem;color:var(--text-muted)">${q.options.map(o => o.text).join(' / ')}</td>
                    <td><span class="badge badge-green">${q.options.find(o => o.id === q.correct_answer)?.text || q.correct_answer}</span></td>
                    <td><div style="display:flex;gap:0.375rem">
                      <button class="btn btn-outline btn-sm" onclick="editQuestion('${bankId}','${q.id}')">Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${bankId}','${q.id}')">Remove</button>
                    </div></td>
                  </tr>`).join('')}</tbody>
                </table></div>`;
        } catch (e) {
          qsDiv.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--error)">Failed to load questions.</div>';
        }
      };
    });
  }

  const scopeNote = currentUser.centre_id ? ` · <span style="color:var(--text-muted);font-size:0.78rem">${currentUser.centre_id} only</span>` : '';

  el.innerHTML = `
  <div class="page-header">
    <div><h2>Question Banks${scopeNote}</h2><p>${allBanks.length} bank(s) total</p></div>
    <div style="display:flex;gap:0.5rem">
      <button id="import-qs-btn" class="btn btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12L11.25 21m0 0l-3.75-3.75M11.25 21V9.75"/></svg>
        Import CSV
      </button>
      <button id="add-bank-btn" class="btn btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        New Bank
      </button>
    </div>
  </div>

  <div class="card" style="margin-bottom:1.5rem; padding:1rem; display:flex; gap:1rem; flex-wrap:wrap; align-items:center; background: var(--gray-50)">
    <div style="flex:1; min-width:240px; position:relative">
      <input type="text" id="bank-search" class="form-input" placeholder="Search by title or subject..." style="padding-left:2.5rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--gray-400)">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </div>
    ${!currentUser.centre_id ? `
    <div style="width:200px">
      <select id="bank-centre-filter" class="form-select">
        <option value="">All Centres</option>
        ${centres.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>` : ''}
  </div>

  <div id="banks-list"></div>`;

  renderList();

  document.getElementById('bank-search').addEventListener('input', e => {
    filterText = e.target.value;
    renderList();
  });

  if (!currentUser.centre_id) {
    document.getElementById('bank-centre-filter').addEventListener('change', e => {
      filterCentre = e.target.value;
      renderList();
    });
  }

  document.getElementById('add-bank-btn').addEventListener('click', () => showNewBankModal(ApiClient, currentUser));
  document.getElementById('import-qs-btn').addEventListener('click', () => showImportQuestionsModal(ApiClient));

  window.editBank = async (bankId) => {
    try {
      const banks = await ApiClient.getQuestionBanks();
      showNewBankModal(ApiClient, currentUser, banks.find(b => b.id == bankId));
    } catch (e) { modalService.toast(e.message, 'error'); }
  };

  window.showAssignBankModal = async (bankId) => {
    const banks = await ApiClient.getQuestionBanks();
    const bank = banks.find(b => b.id == bankId);
    if (!bank) return;
    const centres = getKnownCentres();
    const assigned = bank.assignedTo || [];
    getOverlay().style.display = 'flex';
    document.getElementById('modal-box').innerHTML = `
      <div class="modal-card" style="max-width:420px">
        <div class="modal-header">
          <div class="modal-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg></div>
          <h3 class="modal-title">Assign Bank to Centres</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem">Bank: <strong>${bank.title}</strong></p>
        <div class="form-group">
          <label class="form-label">Select Centres</label>
          <div style="display:flex;flex-direction:column;gap:0.35rem;max-height:160px;overflow-y:auto;border:1px solid var(--gray-200);padding:0.5rem;border-radius:6px">
            ${centres.map(c => `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;cursor:pointer"><input type="checkbox" value="${c}" class="assign-centre-check" ${assigned.includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem">
          <button class="btn btn-outline btn-sm" onclick="document.querySelectorAll('.assign-centre-check').forEach(c=>c.checked=true)">Select All</button>
          <button class="btn btn-outline btn-sm" onclick="document.querySelectorAll('.assign-centre-check').forEach(c=>c.checked=false)">Clear All</button>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
          <button class="modal-btn modal-btn-confirm" onclick="doAssignBank('${bankId}')">Save Assignment</button>
        </div>
      </div>`;

    window.doAssignBank = async (bankId) => {
      const checked = [...document.querySelectorAll('.assign-centre-check:checked')].map(c => c.value);
      try {
        await ApiClient.assignQuestionBank(bankId, checked);
        window.closeModal();
        renderQuestions(ApiClient, { currentUser });
        modalService.toast(`Bank assigned to: ${checked.length ? checked.join(', ') : 'Admin-only'}`, 'success');
      } catch (e) { modalService.toast('Assignment failed: ' + e.message, 'error'); }
    };
  };

  window.deleteBank = async (bankId) => {
    const ok = await modalService.confirm('Delete this entire question bank? This cannot be undone.', { title: 'Delete Bank', confirmText: 'Delete', type: 'danger' });
    if (!ok) return;
    try { await ApiClient.deleteQuestionBank(bankId); renderQuestions(ApiClient, { currentUser }); }
    catch (e) { modalService.toast(e.message, 'error'); }
  };

  window.addQuestion = async (bankId) => {
    const banks = await ApiClient.getQuestionBanks();
    showQuestionModal(ApiClient, bankId, null, banks.find(b => b.id == bankId), currentUser);
  };

  window.editQuestion = async (bankId, qId) => {
    const banks = await ApiClient.getQuestionBanks();
    const bank = banks.find(b => b.id == bankId);
    showQuestionModal(ApiClient, bankId, bank?.questions?.find(q => q.id == qId), bank, currentUser);
  };

  window.deleteQuestion = async (bankId, qId) => {
    const ok = await modalService.confirm('Remove this question?', { title: 'Remove Question', confirmText: 'Remove', type: 'danger' });
    if (!ok) return;
    try { await ApiClient.deleteQuestion(bankId, qId); renderQuestions(ApiClient, { currentUser }); }
    catch (e) { modalService.toast('Failed to delete question: ' + e.message, 'error'); }
  };
}

function showNewBankModal(ApiClient, currentUser, bank = null) {
  const centres = getKnownCentres();
  const assigned = bank?.assignedTo || [];
  const isAdmin = !currentUser?.centre_id;
  getOverlay().style.display = 'flex';
  document.getElementById('modal-box').innerHTML = `
    <div class="modal-card" style="max-width:480px">
      <div class="modal-header">
        <div class="modal-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></div>
        <h3 class="modal-title">${bank ? 'Edit Question Bank' : 'New Question Bank'}</h3>
      </div>
      <div class="form-group"><label class="form-label">Bank Title *</label><input id="nb-title" class="form-input" placeholder="e.g. Mathematics Chapter 1" value="${bank?.title || ''}"></div>
      <div class="form-group"><label class="form-label">Subject *</label><input id="nb-subject" class="form-input" placeholder="e.g. Mathematics" value="${bank?.subject || ''}"></div>
      ${isAdmin ? `<div class="form-group">
        <label class="form-label">Assign to Centres <span style="font-weight:400;color:var(--text-muted)">(select one or more)</span></label>
        <div style="display:flex;flex-direction:column;gap:0.3rem;max-height:120px;overflow-y:auto;border:1px solid var(--gray-200);padding:0.5rem;border-radius:6px">
          ${centres.map(c => `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;cursor:pointer"><input type="checkbox" value="${c}" class="centre-check" ${assigned.includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}
        </div>
      </div>` : ''}
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="saveBank('${bank?.id || ''}')"> ${bank ? 'Save Changes' : 'Create Bank'}</button>
      </div>
    </div>`;

  window.saveBank = async (bankId) => {
    const title = document.getElementById('nb-title').value.trim();
    const subject = document.getElementById('nb-subject').value.trim();
    if (!title || !subject) { modalService.toast('Please fill all fields', 'error'); return; }
    let assignedTo = null;
    if (currentUser.role === 'admin') {
      const checked = [...document.querySelectorAll('.centre-check:checked')].map(c => c.value);
      assignedTo = checked.length ? checked : null;
    }
    try {
      const savedBank = bankId
        ? await ApiClient.updateQuestionBank(bankId, { title, subject })
        : await ApiClient.createQuestionBank({ title, subject });
      if (currentUser.role === 'admin') await ApiClient.assignQuestionBank(savedBank.id, assignedTo || []);
      window.closeModal();
      renderQuestions(ApiClient, { currentUser });
    } catch (e) { modalService.toast('Failed to save bank: ' + e.message, 'error'); }
  };
}

function showQuestionModal(ApiClient, bankId, question = null, bank = null, currentUser) {
  getOverlay().style.display = 'flex';
  document.getElementById('modal-box').innerHTML = `
    <div class="modal-card" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg></div>
        <h3 class="modal-title">${question ? 'Edit Question' : 'Add Question'} — ${bank?.title || ''}</h3>
      </div>
      <div class="form-group"><label class="form-label">Question Text *</label><textarea id="q-text" class="form-textarea">${question?.text || ''}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="form-group"><label class="form-label">Option A *</label><input id="q-a" class="form-input" value="${question?.options?.find(o => o.id === 'a')?.text || ''}"></div>
        <div class="form-group"><label class="form-label">Option B *</label><input id="q-b" class="form-input" value="${question?.options?.find(o => o.id === 'b')?.text || ''}"></div>
        <div class="form-group"><label class="form-label">Option C *</label><input id="q-c" class="form-input" value="${question?.options?.find(o => o.id === 'c')?.text || ''}"></div>
        <div class="form-group"><label class="form-label">Option D *</label><input id="q-d" class="form-input" value="${question?.options?.find(o => o.id === 'd')?.text || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Correct Answer</label>
        <select id="q-ans" class="form-select">
          <option value="a" ${question?.correct_answer === 'a' ? 'selected' : ''}>A</option>
          <option value="b" ${question?.correct_answer === 'b' ? 'selected' : ''}>B</option>
          <option value="c" ${question?.correct_answer === 'c' ? 'selected' : ''}>C</option>
          <option value="d" ${question?.correct_answer === 'd' ? 'selected' : ''}>D</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="saveQuestion('${bankId}','${question?.id || ''}')"> ${question ? 'Save Changes' : 'Add Question'}</button>
      </div>
    </div>`;

  window.saveQuestion = async (bankId, qId) => {
    const text = document.getElementById('q-text').value.trim();
    const opts = ['a', 'b', 'c', 'd'].map(x => ({ id: x, text: document.getElementById('q-' + x).value.trim() }));
    const ans = document.getElementById('q-ans').value;
    if (!text || opts.some(o => !o.text)) { modalService.toast('Please fill all fields', 'error'); return; }
    try {
      if (qId) { await ApiClient.updateQuestion(bankId, qId, { text, options: opts, correct_answer: ans }); }
      else { await ApiClient.addQuestion(bankId, { text, options: opts, correct_answer: ans }); }
      window.closeModal();
      renderQuestions(ApiClient, { currentUser });
    } catch (e) { modalService.toast('Failed to save question: ' + e.message, 'error'); }
  };
}

async function showImportQuestionsModal(ApiClient) {
  const banks = await ApiClient.getQuestionBanks();
  getOverlay().style.display = 'flex';
  document.getElementById('modal-box').innerHTML = `
    <div class="modal-card" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12L11.25 21m0 0l-3.75-3.75M11.25 21V9.75"/></svg></div>
        <h3 class="modal-title">Bulk Import Questions (CSV)</h3>
      </div>
      <div class="form-group"><label class="form-label">Target Question Bank</label>
        <select id="import-bank-id" class="form-select">${banks.map(b => `<option value="${b.id}">${b.title}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">CSV Content</label>
        <textarea id="csv-content" class="form-textarea" style="min-height:160px;font-family:monospace;font-size:0.82rem" placeholder="Question,Option A,Option B,Option C,Option D,correct (a/b/c/d)&#10;What is 2+2?,3,4,5,6,b"></textarea>
      </div>
      <p style="font-size:0.78rem;color:var(--text-muted)">One question per line. Correct answer column: a, b, c, or d</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="modal-btn modal-btn-confirm" onclick="doImportCSV()">Import Questions</button>
      </div>
    </div>`;

  window.doImportCSV = async () => {
    const bankId = document.getElementById('import-bank-id').value;
    const csv = document.getElementById('csv-content').value.trim();
    if (!bankId || !csv) { modalService.toast('Select a bank and paste CSV.', 'error'); return; }
    try {
      const result = await ApiClient.request(`/question-banks/${bankId}/import-questions`, { method: 'POST', body: JSON.stringify({ csv }) });
      window.closeModal();
      modalService.toast(`Imported ${result.added} questions. Skipped ${result.skipped} rows.`, 'success');
    } catch (e) { modalService.toast('Import failed: ' + e.message, 'error'); }
  };
}
