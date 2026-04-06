/**
 * ExamPage - Student examination interface
 *
 * Accepts real exam data from the backend (questions + examConfig).
 * Handles submission, result polling, and navigation to the result page.
 */

import ApiClient from '../services/APIClient.js';
import modalService from '../services/ModalService.js';
import { QuestionView } from '../components/QuestionView.js';
import { QuestionPalette } from '../components/QuestionPalette.js';
import { Timer } from '../components/Timer.js';

class ExamPage {
  constructor() {
    this.examConfig = null;
    this.questions = [];
    this.examId = null;
    this.router = null;
    this.currentIndex = 0;
    this.answers = {};
    this.markedForReview = new Set();
    this.timer = new Timer();
    this.questionView = new QuestionView();
    this.questionPalette = new QuestionPalette();
    this.isSubmitting = false;
    this._timerInterval = null;
  }

  /**
   * Render the exam page with real backend data.
   * @param {HTMLElement} container
   * @param {Object} examConfig  - { id, title, duration, totalQs, passingScore }
   * @param {Array}  questions   - [{ id, text, options }]
   * @param {string} examId      - numeric DB id of the exam config
   * @param {Object} router      - Router instance for navigation
   */
  async render(container, examConfig, questions, examId, router) {
    // --- Clean Exam Start: Reset all internal state ---
    this.currentIndex = 0;
    this.answers = {};
    this.markedForReview = new Set();
    this.isSubmitting = false; // Always unlock submit button on entry

    // Stop and clear any existing timer/interval
    if (this.timer) this.timer.stop();
    if (this._timerInterval) clearInterval(this._timerInterval);
    // ------------------------------------------------

    this.examConfig = examConfig;
    this.questions = questions;
    this.examId = examId;
    this.router = router;

    container.innerHTML = this._getExamHTML();
    this._updateHeader();
    this._attachEventListeners();
    this._renderCurrentQuestion();
    this._renderQuestionPalette();
    this._startTimerDisplay();
    this._startHeartbeat(); // Start heartbeat to notify backend

    // Start countdown timer — auto-submit when time runs out
    this.timer.start(examConfig.duration, () => this._submitExam(true), (remaining) => {
      this._remaining = remaining;
    });
  }

  _getExamHTML() {
    return `
      <div style="background:#f8fafc;min-height:100vh;display:flex;flex-direction:column;color:#0f172a;font-family:'Inter',sans-serif">
        <header style="background:#ffffff;border-bottom:1px solid #e2e8f0;padding:0.875rem 2rem;position:sticky;top:0;z-index:20;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
          <div style="max-width:1400px;margin:0 auto;display:flex;align-items:center;gap:1rem">
            <div>
              <h2 id="exam-title" style="font-size:1.125rem;font-weight:700;color:#0f172a;margin:0">Loading...</h2>
              <p id="exam-type" style="font-size:0.8rem;color:#64748b;margin:0.15rem 0 0"></p>
            </div>
            <div style="flex:1"></div>
            <div style="display:flex;align-items:center;gap:1.5rem">
              <div style="text-align:right">
                <div style="font-size:0.875rem;font-weight:600;color:#1d4ed8">${ApiClient.getUser()?.name || 'Student'}</div>
                <div style="font-size:0.75rem;color:#64748b">${ApiClient.getUser()?.identifier || ''}</div>
              </div>
              <div id="timer-display" style="font-family:'Inter',monospace;font-size:1.4rem;font-weight:800;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:0.4rem 1rem;border-radius:0.625rem;min-width:100px;text-align:center">00:00</div>
            </div>
          </div>
        </header>

        <main style="flex:1;display:flex;height:calc(100vh - 66px);overflow:hidden">
          <div style="flex:1;overflow-y:auto;padding:2rem;background:#f8fafc">
            <div style="max-width:800px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:0.875rem;padding:2rem;box-shadow:0 1px 6px rgba(0,0,0,0.06)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;padding-bottom:1.25rem;border-bottom:1px solid #e2e8f0">
                <span style="font-size:0.8rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">
                  Question <span id="current-question-number">1</span> of <span id="total-questions">—</span>
                </span>
                <span style="background:#f0fdf4;color:#16a34a;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:700;border:1px solid #bbf7d0">+1.0 Mark</span>
              </div>
              
              <div id="question-view-container" style="min-height:300px"></div>

              <footer style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
                  <button id="prev-button" style="background:white;border:1px solid #e2e8f0;color:#475569;padding:0.6rem 1.25rem;border-radius:0.625rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:background 0.15s">
                    <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    Previous
                  </button>
                  <div style="display:flex;gap:0.75rem">
                    <button id="mark-review-button" style="background:#fffbeb;border:1px solid #fde68a;color:#d97706;padding:0.6rem 1.25rem;border-radius:0.625rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem">
                      <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                      Mark for Review
                    </button>
                    <button id="next-button" style="background:#1d4ed8;color:white;padding:0.6rem 1.75rem;border-radius:0.625rem;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:background 0.15s">
                      Next
                      <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>

          <aside style="width:300px;background:#ffffff;border-left:1px solid #e2e8f0;display:flex;flex-direction:column;padding:1.5rem">
            <h2 style="font-size:0.8rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:1.25rem">Question Palette</h2>
            <div id="question-palette-container" style="flex:1;overflow-y:auto;margin-bottom:1.5rem;"></div>
            
            <div style="margin-bottom:1.25rem;padding:1rem;background:#f8fafc;border-radius:0.75rem;border:1px solid #e2e8f0">
              <h3 style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:0.75rem;letter-spacing:0.05em">Legend</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
                <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#475569;font-weight:500">
                  <div style="width:14px;height:14px;background:#16a34a;border-radius:3px"></div> Answered
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#475569;font-weight:500">
                  <div style="width:14px;height:14px;background:#d97706;border-radius:3px"></div> Marked
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#475569;font-weight:500">
                  <div style="width:14px;height:14px;background:#f1f5f9;border:2px solid #e2e8f0;border-radius:3px"></div> Pending
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:#475569;font-weight:500">
                  <div style="width:14px;height:14px;background:#eff6ff;border:2px solid #1d4ed8;border-radius:3px"></div> Current
                </div>
              </div>
            </div>

            <button id="submit-exam-button" style="width:100%;padding:0.875rem;background:#dc2626;color:white;border:none;border-radius:0.625rem;font-weight:700;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:background 0.2s">
              <svg style="width:20px;height:20px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Submit Exam
            </button>
          </aside>
        </main>
      </div>
    `;
  }

  _updateHeader() {
    const titleEl = document.getElementById('exam-title');
    const typeEl = document.getElementById('exam-type');
    const totalEl = document.getElementById('total-questions');

    if (titleEl) titleEl.textContent = this.examConfig.title || 'Examination';
    if (typeEl) typeEl.textContent = this.examConfig.exam_type === 'demo' ? 'Practice Exam' : 'Official Exam';
    if (totalEl) totalEl.textContent = this.questions.length;
  }

  _attachEventListeners() {
    document.getElementById('prev-button')?.addEventListener('click', () => this._navigate(-1));
    document.getElementById('next-button')?.addEventListener('click', () => this._navigate(1));
    document.getElementById('mark-review-button')?.addEventListener('click', () => this._toggleMarkForReview());
    document.getElementById('submit-exam-button')?.addEventListener('click', () => this._submitExam(false));
  }

  _navigate(delta) {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.questions.length) {
      this.currentIndex = newIndex;
      this._renderCurrentQuestion();
      this._renderQuestionPalette();
    }
  }

  _toggleMarkForReview() {
    if (this.markedForReview.has(this.currentIndex)) {
      this.markedForReview.delete(this.currentIndex);
    } else {
      this.markedForReview.add(this.currentIndex);
    }
    this._renderQuestionPalette();
  }

  _renderCurrentQuestion() {
    const container = document.getElementById('question-view-container');
    const numEl = document.getElementById('current-question-number');
    const prevBtn = document.getElementById('prev-button');
    const nextBtn = document.getElementById('next-button');

    if (!container) return;

    const q = this.questions[this.currentIndex];
    if (!q) return;

    if (numEl) numEl.textContent = this.currentIndex + 1;
    if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentIndex === this.questions.length - 1;

    this.questionView.render(
      container,
      q,
      this.currentIndex + 1,
      this.answers[q.id] ?? null,
      (answer) => {
        this.answers[q.id] = answer;
        this._renderQuestionPalette();
      }
    );
  }

  _renderQuestionPalette() {
    const container = document.getElementById('question-palette-container');
    if (!container) return;

    if (!this.questionPalette.questionCount) {
      this.questionPalette.initialize(this.questions.length, (idx) => {
        this.currentIndex = idx;
        this._renderCurrentQuestion();
        this._renderQuestionPalette();
      });
    }

    this.questions.forEach((q, idx) => {
      let status = 'unattempted';
      if (idx === this.currentIndex) status = 'current';
      else if (this.markedForReview.has(idx)) status = 'marked';
      else if (this.answers[q.id] != null) status = 'attempted';
      this.questionPalette.updateQuestionStatus(idx, status);
    });

    this.questionPalette.render(container);
  }

  _startTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;

    this._timerInterval = setInterval(() => {
      const formattedTime = this.timer.getFormattedTime();
      const warningLevel = this.timer.getWarningLevel();

      timerDisplay.textContent = formattedTime;

      // Light-theme timer colours (solid backgrounds)
      if (warningLevel === 'red') {
        timerDisplay.style.background = '#fef2f2';
        timerDisplay.style.color = '#dc2626';
        timerDisplay.style.borderColor = '#fecaca';
      } else if (warningLevel === 'yellow') {
        timerDisplay.style.background = '#fffbeb';
        timerDisplay.style.color = '#d97706';
        timerDisplay.style.borderColor = '#fde68a';
      } else {
        timerDisplay.style.background = '#f0fdf4';
        timerDisplay.style.color = '#16a34a';
        timerDisplay.style.borderColor = '#bbf7d0';
      }
    }, 1000);
  }

  _startHeartbeat() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);

    // Pulse immediately on start
    ApiClient.pulseHeartbeat(this.examId).catch(() => { });

    // Set up interval (every 30 seconds)
    this._heartbeatInterval = setInterval(() => {
      if (!this.isSubmitting) {
        ApiClient.pulseHeartbeat(this.examId).catch(() => { });
      } else {
        clearInterval(this._heartbeatInterval);
      }
    }, 30000);
  }

  async _submitExam(autoSubmit = false) {
    // Only block if we are actually in the middle of a server request
    // Allow the modal to show if we aren't already submitting
    if (this.isSubmitting) return;

    if (!autoSubmit) {
      const unanswered = this.questions.filter(q => this.answers[q.id] == null).length;
      const msg = unanswered > 0
        ? `You have <strong>${unanswered} unanswered question(s)</strong>. Are you sure you want to submit?`
        : 'Are you sure you want to submit your exam? <strong>This action cannot be undone.</strong>';

      const confirmed = await modalService.confirm(msg, {
        title: 'Submit Exam',
        confirmText: 'Submit Now',
        cancelText: 'Continue Exam',
        type: 'danger'
      });

      if (!confirmed) {
        this.isSubmitting = false;
        return;
      }
    }

    this.isSubmitting = true;
    this.timer.stop();
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);

    // Disable submit button to prevent double submission
    const submitBtn = document.getElementById('submit-exam-button');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="flex items-center justify-center"><svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Submitting...</span>';
    }

    // Build payload in the format the backend expects
    const answers = this.questions.map(q => ({
      question_id: q.id,
      answer: this.answers[q.id] ?? null
    }));

    try {
      const response = await ApiClient.submitExam(this.examId, { answers });
      const submissionId = response.submission_id;

      if (!submissionId) {
        throw new Error('Server did not return a submission ID.');
      }

      // Navigate to result page — Router will poll until job completes
      if (this.router) {
        this.router.navigate(`/student/result/${submissionId}`);
      } else {
        window.location.href = `/student/result/${submissionId}`;
      }
    } catch (error) {
      console.error('Exam submission failed:', error);
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Submit Exam</span>';
      }
      await modalService.alert(
        `Submission failed: ${error.message}<br><br>Please check your internet connection and try again.`,
        { title: 'Submission Error', type: 'danger' }
      );
    }
  }

  destroy() {
    this.timer.stop();
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);

    // Explicitly reset critical state to prevent leak into next exam load
    this.isSubmitting = false;
    this.questions = [];
    this.answers = {};
  }
}

export default ExamPage;
