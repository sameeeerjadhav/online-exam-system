/**
 * DashboardModule.js — Renders the admin dashboard overview page.
 */
export async function renderDashboard(ApiClient, { currentUser, loadPage }) {
    const data = await ApiClient.getDashboardStats();
    const recent = data.recent;
    const stats = data.stats;
    const counts = data.counts;
    const liveCount = counts.live_now;
    const scopeLabel = currentUser.centre_id
        ? `Centre: <strong>${currentUser.centre_id}</strong>`
        : '<strong>All Centres</strong>';

    document.getElementById('page-content').innerHTML = `
  <div class="page-header"><div><h2>Overview</h2><p>Showing data for ${scopeLabel} &nbsp;&middot;&nbsp; ${new Date().toLocaleString('en-IN')}</p></div></div>
  <div class="stats-grid" style="margin-bottom:1.5rem">
    <div class="stat-card stat-card-blue">
      <div class="stat-label">Total Submissions</div>
      <div class="stat-value">${stats.total}</div>
      <div class="stat-sub">${currentUser.centre_id ? currentUser.centre_id : 'All centres'} · All time</div>
    </div>
    <div class="stat-card stat-card-green">
      <div class="stat-label">Passed</div>
      <div class="stat-value">${stats.passed}</div>
      <div class="stat-sub">${stats.total ? Math.round(stats.passed / stats.total * 100) : 0}% pass rate</div>
    </div>
    <div class="stat-card stat-card-red">
      <div class="stat-label">Failed</div>
      <div class="stat-value">${stats.failed}</div>
    </div>
    <div class="stat-card stat-card-yellow">
      <div class="stat-label">Avg Score</div>
      <div class="stat-value">${stats.avg}%</div>
    </div>
    <div class="stat-card stat-card-blue">
      <div class="stat-label">Students</div>
      <div class="stat-value">${counts.students}</div>
      <div class="stat-sub">Registered</div>
    </div>
    <div class="stat-card stat-card-green">
      <div class="stat-label">Live Now</div>
      <div class="stat-value">${counts.live_now}</div>
      <div class="stat-sub"><span class="live-dot"></span> Active exam sessions</div>
    </div>
    <div class="stat-card stat-card-blue">
      <div class="stat-label">Question Banks</div>
      <div class="stat-value">${counts.question_banks}</div>
    </div>
    <div class="stat-card stat-card-blue">
      <div class="stat-label">Exam Configs</div>
      <div class="stat-value">${counts.exam_configs}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
    <div class="card">
      <div class="card-header"><h3>Recent Submissions</h3></div>
      <div class="table-wrap">
        ${recent.length === 0 ? '<div class="card-body" style="color:var(--text-muted);font-size:0.875rem">No submissions yet.</div>' : `
        <table>
          <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Result</th><th>Time</th></tr></thead>
          <tbody>
            ${recent.map(s => `
            <tr>
              <td style="font-weight:600">${s.student_name}</td>
              <td style="font-size:0.8rem;color:var(--text-muted)">${s.exam_title}</td>
              <td><strong>${s.score}%</strong></td>
              <td><span class="badge ${s.result === 'pass' ? 'badge-green' : 'badge-red'}">${s.result || '—'}</span></td>
              <td style="font-size:0.78rem;color:var(--text-muted)">${new Date(s.submitted_at).toLocaleTimeString('en-IN')}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Live Sessions</h3><span class="badge badge-green">${liveCount} active</span></div>
      <div class="card-body">
        <div style="font-size:0.875rem;color:var(--text-muted);padding:1rem;text-align:center">
          Currently <strong>${liveCount}</strong> students are appearing for exams.
          <br><br>
          <button class="btn btn-outline btn-sm" onclick="loadPage('live')">View Live Monitor</button>
        </div>
      </div>
    </div>
  </div>
`;

    // Make loadPage accessible from inline onclick
    window.loadPage = loadPage;
}
