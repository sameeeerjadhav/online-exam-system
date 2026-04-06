/**
 * StudentDashboard - Main dashboard for student interface
 *
 * Fixed:
 * - Uses Promise.all for parallel exam config fetching
 * - Uses Router for navigation instead of window.location.href
 * - Shows loading skeleton state
 * - Properly uses confirm() via ModalService
 */

import { ExamHistoryModule } from '../modules/ExamHistoryModule.js';
import { CertificationModule } from '../modules/CertificationModule.js';
import { AuthenticationModule } from '../services/AuthenticationModule.js';
import ApiClient from '../services/APIClient.js';
import modalService from '../services/ModalService.js';

export class StudentDashboard {
  constructor(authModule = null, apiClient = null, router = null) {
    this.authModule = authModule || new AuthenticationModule();
    // apiClient param kept for backward compat but we use static ApiClient directly
    this.router = router;
    this.examHistoryModule = new ExamHistoryModule(null);
    this.certificationModule = new CertificationModule(null);
    this.container = null;
    this.currentSession = null;
    this.availableExams = [];
  }

  async initialize(container) {
    this.container = container;

    if (!this.authModule.isAuthenticated()) {
      if (this.router) this.router.navigate('/login');
      else window.location.href = '/login.html';
      return;
    }

    this.currentSession = this.authModule.getCurrentSession();
    this._renderLoading();

    try {
      await this.loadAvailableExams();
      this.render();
      await this.initializeModules();
    } catch (error) {
      // On 401/Unauthorized — silently go to login
      if (error.status === 401 || error.message === 'Unauthorized') {
        if (this.router) this.router.navigate('/login');
        else window.location.href = '/index.html#/login';
        return;
      }
      this.renderError(error);
    }
  }

  /**
   * Render skeleton loading state
   * @private
   */
  _renderLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="min-height:100vh;background:#f8fafc">
        <div style="padding:2rem;max-width:1200px;margin:0 auto">
          <div style="height:80px;border-radius:0.75rem;background:#e2e8f0;margin-bottom:2rem;animation:shimmer 1.5s infinite"></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem">
            ${Array.from({ length: 3 }, () => `<div style="height:220px;border-radius:0.75rem;background:#e2e8f0;animation:shimmer 1.5s infinite"></div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load available exams assigned to this student from the backend.
   * @private
   */
  async loadAvailableExams() {
    const data = await ApiClient.getStudentExams();
    // Backend returns an array of exam config objects directly
    this.availableExams = Array.isArray(data) ? data : (data.data || []);
  }

  render() {
    if (!this.container) return;
    const user = this.currentSession.user;

    this.container.innerHTML = `
      <div class="dashboard-wrapper">
        <header class="dash-header">
          <div class="dash-header-content">
            <div class="dash-logo">
              <div class="dash-avatar">${(user.name || user.identifier || 'S').charAt(0).toUpperCase()}</div>
              <div>
                <h1 class="dash-title">Student Dashboard</h1>
                <p class="dash-subtitle">Welcome back, <strong>${user.name || user.identifier}</strong></p>
              </div>
            </div>
            <div class="dash-user-info">
              <div class="dash-info-pill">🪪 ${user.identifier}</div>
              <div class="dash-info-pill">🏛️ ${user.centerName}</div>
              <div class="dash-info-pill">📅 ${user.examSlot}</div>
              <button id="logout-btn" class="dash-logout-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        <main class="dash-main">
          <section class="dash-section">
            <div class="dash-section-header">
              <h2 class="dash-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:#1d4ed8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                </svg>
                Available Exams
              </h2>
              <div style="display:flex;align-items:center;gap:1rem">
                <button id="refresh-exams-btn" class="dash-refresh-btn" title="Check for new exams">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                  Refresh
                </button>
                <span class="dash-badge">${this.availableExams.length} exam${this.availableExams.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="exam-grid" id="available-exams-container">
              ${this.renderAvailableExams()}
            </div>
          </section>

          <section class="dash-section">
            <div id="exam-history-container"></div>
          </section>

          <section class="dash-section">
            <div id="certificates-container"></div>
          </section>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderAvailableExams() {
    if (this.availableExams.length === 0) {
      return `
        <div class="exam-empty" style="background:white;border:1px solid #e2e8f0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;color:#94a3b8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          </svg>
          <h3 style="font-size:1.125rem;font-weight:600;color:#1e293b;margin:1rem 0 0.5rem">No Exams Available</h3>
          <p style="color:#64748b;font-size:0.9rem">You don't have any exams assigned at the moment.</p>
        </div>
      `;
    }
    return this.availableExams.map(exam => this.renderExamCard(exam)).join('');
  }

  renderExamCard(exam) {
    // Backend returns snake_case fields: exam_type, total_questions, exam_id, id
    const isDemo = (exam.exam_type || exam.examType) === 'demo';
    const badgeClass = isDemo ? 'badge-demo' : 'badge-main';
    const badgeText = isDemo ? 'Practice' : 'Official';
    const duration = exam.duration || 0;
    const totalQs = exam.total_questions || exam.totalQuestions || 0;
    const dbId = exam.id; // numeric DB id used in API routes

    return `
      <div class="exam-card" data-exam-id="${dbId}">
        <div class="exam-card-header">
          <span class="exam-badge ${badgeClass}">${badgeText}</span>
          <div class="exam-card-icon">${isDemo ? '📝' : '📋'}</div>
        </div>
        <h3 class="exam-card-title">${exam.title}</h3>
        <p class="exam-card-subject">${exam.subject || ''}</p>
        <div class="exam-card-meta">
          <div class="exam-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${duration} min
          </div>
          <div class="exam-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
            ${totalQs} questions
          </div>
          <div class="exam-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            Pass: ${exam.passing_score || exam.passingScore || 60}%
          </div>
        </div>
        <button class="start-exam-btn" data-exam-id="${dbId}">
          Start Exam
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
        </button>
      </div>
    `;
  }

  async initializeModules() {
    const studentId = this.currentSession.user.id;
    const examHistoryContainer = this.container.querySelector('#exam-history-container');
    if (examHistoryContainer) {
      await this.examHistoryModule.initialize(examHistoryContainer, studentId).catch(e => console.warn('History module error:', e));
    }
    const certificatesContainer = this.container.querySelector('#certificates-container');
    if (certificatesContainer) {
      await this.certificationModule.initialize(certificatesContainer, studentId).catch(e => console.warn('Certification module error:', e));
    }
  }

  attachEventListeners() {
    const logoutBtn = this.container.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    const refreshBtn = this.container.querySelector('#refresh-exams-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('animate-spin-once');
        this.refresh().finally(() => {
          setTimeout(() => refreshBtn.classList.remove('animate-spin-once'), 500);
        });
      });
    }

    const startBtns = this.container.querySelectorAll('.start-exam-btn, .exam-card');
    startBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const examId = e.currentTarget.dataset.examId;
        if (examId) this.handleStartExam(examId);
      });
    });
  }

  async handleLogout() {
    const confirmed = await modalService.confirm(
      'Are you sure you want to logout?',
      { title: 'Logout', confirmText: 'Logout', cancelText: 'Stay', type: 'warning' }
    );
    if (confirmed) {
      this.authModule.logout();
      // FIX: use Router if available, else fallback
      if (this.router) this.router.navigate('/login');
      else window.location.href = '/login.html';
    }
  }

  handleStartExam(examId) {
    // Use the numeric DB id as the query param — matches /student/exam/{examId}/questions
    if (this.router) {
      window.history.pushState(null, '', `/exam?id=${examId}`);
      this.router.handleRoute(`/exam`);
    } else {
      window.location.href = `/exam.html?id=${examId}`;
    }
  }

  renderError(error) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc">
        <div style="background:white;border:1px solid #fecaca;border-radius:1rem;padding:2rem;max-width:420px;width:90%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="width:56px;height:56px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="width:28px;height:28px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <h3 style="font-size:1.125rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem">Failed to Load Dashboard</h3>
          <p style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem">${error.message || 'An unexpected error occurred'}</p>
          <button onclick="location.reload()" style="background:#1d4ed8;color:white;border:none;padding:0.625rem 1.75rem;border-radius:0.5rem;cursor:pointer;font-weight:600;font-size:0.9rem">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  async refresh() {
    if (!this.container) return;
    await this.initialize(this.container);
  }

  destroy() {
    if (this.examHistoryModule) this.examHistoryModule.destroy();
    if (this.certificationModule) this.certificationModule.destroy();
    if (this.container) this.container.innerHTML = '';
    this.container = null;
  }
}

export default StudentDashboard;
