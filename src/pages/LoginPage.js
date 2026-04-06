/**
 * LoginPage - Authentication interface for the Gyanam Exam Portal
 *
 * Fixed: removed extra fields (centerName/examSlot/timeWindow) that the
 * backend does not expect. Student login only needs `identifier`.
 */

import AuthenticationModule from '../services/AuthenticationModule.js';
import router from '../services/Router.js';

class LoginPage {
  constructor(authModule = null) {
    this.authModule = authModule || new AuthenticationModule();
    this.isSubmitting = false;
  }

  render(container) {
    container.innerHTML = this._getLoginHTML();
    this._attachEventListeners();
  }

  _getLoginHTML() {
    return `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:2rem;font-family:'Inter',sans-serif;">
        <div style="width:100%;max-width:420px;">
          <!-- Card -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:1.25rem;padding:2.5rem;box-shadow:0 4px 25px rgba(0,0,0,0.04);">
            <!-- Logo / Header -->
            <div style="text-align:center;margin-bottom:2.25rem;">
              <div style="width:64px;height:64px;background:#1d4ed8;border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.75rem;box-shadow:0 4px 12px rgba(29,78,216,0.15);">🎓</div>
              <h1 style="font-size:1.625rem;font-weight:800;color:#0f172a;margin:0 0 0.5rem;letter-spacing:-0.02em;">Gyanam Exam Portal</h1>
              <p style="color:#64748b;font-size:0.9375rem;margin:0;font-weight:500;">Enter your Student ID to begin</p>
            </div>
 
            <!-- Error Alert -->
            <div id="error-message" style="display:none;margin-bottom:1.5rem;padding:1rem;background:#fef2f2;border:1px solid #fecaca;border-radius:0.75rem;">
              <p id="error-text" style="color:#dc2626;font-size:0.875rem;margin:0;font-weight:500;"></p>
            </div>
 
            <!-- Login Form -->
            <form id="login-form" novalidate>
              <div style="margin-bottom:1.5rem;">
                <label for="identifier" style="display:block;font-size:0.875rem;font-weight:600;color:#475569;margin-bottom:0.625rem;">
                  Student ID <span style="color:#dc2626;">*</span>
                </label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  required
                  autocomplete="username"
                  placeholder="e.g. STUDENT001"
                  style="width:100%;padding:0.875rem 1.125rem;background:#ffffff;border:1px solid #cbd5e1;border-radius:0.75rem;color:#0f172a;font-size:1rem;outline:none;box-sizing:border-box;transition:all 0.2s;"
                  onfocus="this.style.borderColor='#1d4ed8';this.style.boxShadow='0 0 0 3px rgba(29,78,216,0.1)'"
                  onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'"
                />
                <p id="identifier-error" style="display:none;margin-top:0.5rem;font-size:0.8125rem;color:#dc2626;font-weight:500;"></p>
              </div>
 
              <button
                type="submit"
                id="submit-button"
                style="width:100%;padding:0.9375rem;background:#1d4ed8;color:white;border:none;border-radius:0.75rem;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.background='#1e40af'"
                onmouseout="this.style.background='#1d4ed8'"
              >
                <span id="submit-text">Login to Portal</span>
                <span id="submit-loading" style="display:none;">Authenticating...</span>
              </button>
            </form>
 
            <div style="margin-top:2rem;text-align:center;font-size:0.875rem;color:#64748b;font-weight:500;">
              Admin? <a href="admin.html" style="color:#1d4ed8;text-decoration:none;font-weight:700;">Go to Admin Portal &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _attachEventListeners() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', this._handleSubmit.bind(this));
    }
  }

  async _handleSubmit(event) {
    event.preventDefault();
    if (this.isSubmitting) return;

    this._hideError();

    const identifier = document.getElementById('identifier')?.value.trim();
    if (!identifier) {
      this._showFieldError('identifier', 'Student ID is required.');
      return;
    }

    this._setLoading(true);
    this.isSubmitting = true;

    try {
      const result = await this.authModule.authenticate({ identifier });
      if (result.success) {
        router.navigate('/student');
      }
    } catch (error) {
      this._showError(error.message);
    } finally {
      this._setLoading(false);
      this.isSubmitting = false;
    }
  }

  _showError(message) {
    const el = document.getElementById('error-message');
    const txt = document.getElementById('error-text');
    if (el && txt) { txt.textContent = message; el.style.display = 'block'; }
  }

  _hideError() {
    const el = document.getElementById('error-message');
    if (el) el.style.display = 'none';
  }

  _showFieldError(field, message) {
    const errEl = document.getElementById(`${field}-error`);
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
  }

  _setLoading(loading) {
    const btn = document.getElementById('submit-button');
    const txt = document.getElementById('submit-text');
    const spin = document.getElementById('submit-loading');
    if (btn) btn.disabled = loading;
    if (txt) txt.style.display = loading ? 'none' : 'inline';
    if (spin) spin.style.display = loading ? 'inline' : 'none';
  }

  destroy() { }
}

export default LoginPage;
export { LoginPage };
