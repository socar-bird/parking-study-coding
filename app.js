// ============================================================
// 모각코 스터디 트래커 - app.js
// ============================================================

// --- Dark Mode ---
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.documentElement.classList.toggle('dark', e.matches);
});

// --- Data Layer (서버 JSON 기반) ---
const DB = {
  _data: null,
  _defaults: { members: [], sessions: [], settings: { groupName: '주차 스터디', meetingDays: [2, 4], meetingTime: '19:00' } },

  async load() {
    try {
      const res = await fetch('/api/data');
      this._data = await res.json();
    } catch {
      this._data = JSON.parse(JSON.stringify(this._defaults));
    }
  },

  _save() {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this._data)
    });
  },

  get members() { return this._data?.members || []; },
  set members(v) { this._data.members = v; this._save(); },

  get sessions() { return this._data?.sessions || []; },
  set sessions(v) { this._data.sessions = v; this._save(); },

  get settings() { return this._data?.settings || this._defaults.settings; },
  set settings(v) { this._data.settings = v; this._save(); },

  addMember(name, emoji) {
    const m = { id: 'm_' + Date.now(), name, emoji, createdAt: new Date().toISOString(), active: true };
    this._data.members.push(m);
    this._save();
    return m;
  },

  toggleMember(id) {
    const m = this._data.members.find(x => x.id === id);
    if (m) m.active = !m.active;
    this._save();
  },

  deleteMember(id) {
    this._data.members = this._data.members.filter(x => x.id !== id);
    this._save();
  },

  getSession(date) {
    return this._data.sessions.find(s => s.date === date);
  },

  getOrCreateSession(date) {
    let session = this._data.sessions.find(s => s.date === date);
    if (!session) {
      session = { id: 's_' + Date.now(), date, attendances: [] };
      this._data.sessions.push(session);
      this._save();
    }
    return session;
  },

  updateSession(session) {
    const idx = this._data.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) this._data.sessions[idx] = session;
    else this._data.sessions.push(session);
    this._save();
  },

  checkIn(date, memberId, goals, startTime) {
    const session = this.getOrCreateSession(date);
    let att = session.attendances.find(a => a.memberId === memberId);
    if (!att) {
      att = { memberId, goals, startTime, endTime: null, review: null, reflection: '', checkedIn: true, checkedOut: false };
      session.attendances.push(att);
    } else {
      att.goals = goals;
      att.startTime = startTime;
      att.checkedIn = true;
    }
    this.updateSession(session);
  },

  checkOut(date, memberId, endTime, review, reflection) {
    const session = this.getOrCreateSession(date);
    const att = session.attendances.find(a => a.memberId === memberId);
    if (att) {
      att.endTime = endTime;
      att.review = review;
      att.reflection = reflection;
      att.checkedOut = true;
    }
    this.updateSession(session);
  },

  isMeetingDay(date) {
    const d = new Date(date + 'T00:00:00');
    return this.settings.meetingDays.includes(d.getDay());
  },

  exportData() {
    return JSON.stringify({ ...this._data, exportedAt: new Date().toISOString() }, null, 2);
  },

  importData(json) {
    const data = JSON.parse(json);
    if (data.members) this._data.members = data.members;
    if (data.sessions) this._data.sessions = data.sessions;
    if (data.settings) this._data.settings = data.settings;
    this._save();
  },

  resetAll() {
    this._data = JSON.parse(JSON.stringify(this._defaults));
    this._save();
  }
};

// --- Helpers ---
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(d);
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(d);
}

function calcMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatMinutes(mins) {
  if (mins <= 0) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function getMemberById(id) {
  return DB.members.find(m => m.id === id);
}

const REVIEWS = [
  { value: '만족', emoji: '😊' },
  { value: '보통', emoji: '😐' },
  { value: '아쉬움', emoji: '😓' }
];

function reviewEmoji(value) {
  const r = REVIEWS.find(x => x.value === value);
  return r ? r.emoji : '';
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Modal ---
const Modal = {
  show(html) {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    sheet.classList.remove('hidden');
    requestAnimationFrame(() => {
      overlay.classList.add('show');
      sheet.classList.add('show');
    });
    overlay.onclick = () => Modal.hide();
  },
  hide() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet');
    overlay.classList.remove('show');
    sheet.classList.remove('show');
    setTimeout(() => {
      overlay.classList.add('hidden');
      sheet.classList.add('hidden');
    }, 300);
  }
};

// --- Tab Router ---
let currentTab = 'today';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderTab();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function renderTab() {
  const settings = DB.settings;
  const title = document.getElementById('header-title');
  const subtitle = document.getElementById('header-subtitle');
  title.textContent = settings.groupName;

  switch (currentTab) {
    case 'today': subtitle.textContent = formatDate(todayStr()); renderToday(); break;
    case 'calendar': subtitle.textContent = '일자별 기록'; renderCalendar(); break;
    case 'members': subtitle.textContent = '멤버 현황'; renderMembers(); break;
    case 'stats': subtitle.textContent = '통계'; renderStats(); break;
    case 'settings': subtitle.textContent = '설정'; renderSettings(); break;
  }
}

// ============================================================
// TAB: 오늘
// ============================================================
function renderToday() {
  const container = document.getElementById('tab-content');
  const today = todayStr();
  const isMeeting = DB.isMeetingDay(today);
  const session = DB.getSession(today);
  const members = DB.members.filter(m => m.active);

  let html = '<div class="fade-in space-y-4">';

  // Meeting day indicator
  if (isMeeting) {
    html += `<div class="card flex items-center gap-3">
      <span class="text-2xl">🔥</span>
      <div>
        <div class="font-bold text-text-primary dark:text-text-dark-primary">오늘은 모각코 날!</div>
        <div class="text-sm text-text-secondary">${DB.settings.meetingTime} 시작</div>
      </div>
    </div>`;
  } else {
    const nextDay = getNextMeetingDay();
    html += `<div class="card flex items-center gap-3">
      <span class="text-2xl">📅</span>
      <div>
        <div class="font-bold text-text-primary dark:text-text-dark-primary">오늘은 쉬는 날</div>
        <div class="text-sm text-text-secondary">${nextDay ? '다음 모각코: ' + formatDate(nextDay) : '모각코 일정이 없습니다'}</div>
      </div>
    </div>`;
  }

  // Members check-in list
  if (members.length === 0) {
    html += `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <p>멤버를 먼저 추가해주세요</p>
      <button class="btn-primary btn-small mt-3" onclick="switchTab('settings')">설정으로 이동</button>
    </div>`;
  } else {
    html += '<div class="card"><div class="space-y-0">';
    members.forEach(member => {
      const att = session?.attendances.find(a => a.memberId === member.id);
      const checkedIn = att?.checkedIn;
      const checkedOut = att?.checkedOut;

      let statusBadge, actionBtn;
      if (checkedOut) {
        const mins = calcMinutes(att.startTime, att.endTime);
        statusBadge = `<span class="badge badge-green">${reviewEmoji(att.review)} ${formatMinutes(mins)}</span>`;
        actionBtn = '';
      } else if (checkedIn) {
        statusBadge = `<span class="badge badge-blue">참여 중</span>`;
        actionBtn = `<button class="btn-primary btn-small" style="width:auto;padding:6px 14px" onclick="openCheckOut('${member.id}')">체크아웃</button>`;
      } else {
        statusBadge = `<span class="badge badge-gray">대기</span>`;
        actionBtn = `<button class="btn-secondary btn-small" style="width:auto;padding:6px 14px" onclick="openCheckIn('${member.id}')">체크인</button>`;
      }

      html += `<div class="list-row">
        <span class="text-2xl">${member.emoji}</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-text-primary dark:text-text-dark-primary">${escHtml(member.name)}</div>
          ${att?.goals ? `<div class="text-xs text-text-secondary mt-0.5 truncate">${escHtml(att.goals)}</div>` : ''}
        </div>
        <div class="flex items-center gap-2">
          ${statusBadge}
          ${actionBtn}
        </div>
      </div>`;
    });
    html += '</div></div>';
  }

  // Summary
  if (session && session.attendances.length > 0) {
    const total = session.attendances.filter(a => a.checkedIn).length;
    const completed = session.attendances.filter(a => a.checkedOut);
    const totalMins = completed.reduce((sum, a) => sum + calcMinutes(a.startTime, a.endTime), 0);
    const avgMins = completed.length > 0 ? Math.round(totalMins / completed.length) : 0;

    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">오늘 요약</div>
      <div class="flex justify-around text-center">
        <div>
          <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${total}</div>
          <div class="text-xs text-text-secondary mt-1">참석</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${completed.length}</div>
          <div class="text-xs text-text-secondary mt-1">완료</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${formatMinutes(avgMins)}</div>
          <div class="text-xs text-text-secondary mt-1">평균 시간</div>
        </div>
      </div>
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function getNextMeetingDay() {
  const settings = DB.settings;
  if (settings.meetingDays.length === 0) return null;
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (settings.meetingDays.includes(d.getDay())) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

// Check-in Modal
function openCheckIn(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;

  Modal.show(`
    <h3 class="text-lg font-bold text-text-primary dark:text-text-dark-primary mb-1">체크인</h3>
    <p class="text-sm text-text-secondary mb-5">${member.emoji} ${escHtml(member.name)}</p>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">오늘의 목표</label>
        <textarea id="checkin-goals" class="input-field" placeholder="오늘 무엇을 할 계획인가요?" rows="3"></textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">시작 시간</label>
        <input id="checkin-time" type="time" class="input-field" value="${nowTime()}">
      </div>
      <button class="btn-primary mt-2" onclick="doCheckIn('${memberId}')">체크인 하기</button>
    </div>
  `);
}

function doCheckIn(memberId) {
  const goals = document.getElementById('checkin-goals').value.trim();
  const startTime = document.getElementById('checkin-time').value;
  if (!goals) { alert('목표를 입력해주세요'); return; }
  DB.checkIn(todayStr(), memberId, goals, startTime);
  Modal.hide();
  renderToday();
}

// Check-out Modal
function openCheckOut(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;

  const reviewHtml = REVIEWS.map(r =>
    `<div class="rating-option" onclick="selectReview(this, '${r.value}')">
      <span>${r.emoji}</span><span>${r.value}</span>
    </div>`
  ).join('');

  Modal.show(`
    <h3 class="text-lg font-bold text-text-primary dark:text-text-dark-primary mb-1">체크아웃</h3>
    <p class="text-sm text-text-secondary mb-5">${member.emoji} ${escHtml(member.name)}</p>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">종료 시간</label>
        <input id="checkout-time" type="time" class="input-field" value="${nowTime()}">
      </div>
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">오늘 어땠나요?</label>
        <div class="grid grid-cols-3 gap-2" id="review-selector">${reviewHtml}</div>
        <input type="hidden" id="checkout-review" value="">
      </div>
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">한 줄 메모 <span class="font-normal text-text-secondary">(선택)</span></label>
        <input id="checkout-reflection" class="input-field" placeholder="배운 점, 다음에 할 것 등">
      </div>
      <button class="btn-primary mt-2" onclick="doCheckOut('${memberId}')">체크아웃 하기</button>
    </div>
  `);
}

function selectReview(el, value) {
  document.querySelectorAll('#review-selector .rating-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('checkout-review').value = value;
}

function doCheckOut(memberId) {
  const endTime = document.getElementById('checkout-time').value;
  const review = document.getElementById('checkout-review').value;
  const reflection = document.getElementById('checkout-reflection').value.trim();
  if (!review) { alert('오늘 어땠는지 선택해주세요'); return; }
  DB.checkOut(todayStr(), memberId, endTime, review, reflection);
  Modal.hide();
  renderToday();
}

// ============================================================
// TAB: 캘린더
// ============================================================
let calendarYear, calendarMonth, calendarSelectedDate;

function initCalendar() {
  const now = new Date();
  calendarYear = now.getFullYear();
  calendarMonth = now.getMonth();
  calendarSelectedDate = null;
}
initCalendar();

function renderCalendar() {
  const container = document.getElementById('tab-content');
  const sessions = DB.sessions;
  const sessionDates = new Set(sessions.map(s => s.date));

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevLastDay = new Date(calendarYear, calendarMonth, 0).getDate();

  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(firstDay);
  const todayDate = todayStr();

  let html = '<div class="fade-in space-y-4">';

  // Month nav
  html += `<div class="card">
    <div class="flex items-center justify-between mb-4">
      <button class="btn-secondary btn-small" style="width:auto" onclick="calendarNav(-1)">◀</button>
      <span class="font-bold text-text-primary dark:text-text-dark-primary">${monthLabel}</span>
      <button class="btn-secondary btn-small" style="width:auto" onclick="calendarNav(1)">▶</button>
    </div>
    <div class="calendar-grid mb-1">
      ${DAY_NAMES.map(d => `<div class="text-center text-xs text-text-secondary font-semibold py-1">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid">`;

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="calendar-day other-month">${prevLastDay - i}</div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayDate;
    const hasSession = sessionDates.has(dateStr);
    const isMeeting = DB.isMeetingDay(dateStr);
    const isSelected = dateStr === calendarSelectedDate;

    const classes = ['calendar-day'];
    if (isToday) classes.push('today');
    if (hasSession) classes.push('has-session');
    if (isSelected) classes.push('selected');

    html += `<div class="${classes.join(' ')}" onclick="selectCalendarDate('${dateStr}')" style="${isMeeting && !hasSession ? 'background:#F0F4FF' : ''}">
      ${d}
    </div>`;
  }

  // Next month days
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-day other-month">${i}</div>`;
  }

  html += '</div></div>';

  // Selected date detail
  if (calendarSelectedDate) {
    const session = DB.getSession(calendarSelectedDate);
    html += `<div class="card">
      <div class="font-bold text-text-primary dark:text-text-dark-primary mb-3">${formatDate(calendarSelectedDate)}</div>`;

    if (session && session.attendances.length > 0) {
      html += `<div class="text-sm text-text-secondary mb-3">참석 ${session.attendances.length}명</div>`;
      html += '<div class="space-y-0">';
      session.attendances.forEach(att => {
        const member = getMemberById(att.memberId);
        if (!member) return;
        const mins = calcMinutes(att.startTime, att.endTime);
        html += `<div class="list-row">
          <span class="text-xl">${member.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-text-primary dark:text-text-dark-primary">${escHtml(member.name)}</div>
            <div class="text-xs text-text-secondary mt-0.5">${escHtml(att.goals || '')}</div>
            ${att.reflection ? `<div class="text-xs text-text-secondary mt-1 italic">"${escHtml(att.reflection)}"</div>` : ''}
          </div>
          <div class="text-right text-sm">
            <div class="font-semibold text-text-primary dark:text-text-dark-primary">${att.checkedOut ? formatMinutes(mins) : '진행 중'}</div>
            <div class="text-xs text-text-secondary">${att.startTime || ''}${att.endTime ? '~' + att.endTime : ''}</div>
            ${att.review ? `<div class="text-xs mt-0.5">${reviewEmoji(att.review)} ${att.review}</div>` : ''}
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="text-sm text-text-secondary text-center py-4">기록이 없습니다</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function calendarNav(dir) {
  calendarMonth += dir;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  calendarSelectedDate = null;
  renderCalendar();
}

function selectCalendarDate(dateStr) {
  calendarSelectedDate = calendarSelectedDate === dateStr ? null : dateStr;
  renderCalendar();
}

// ============================================================
// TAB: 멤버
// ============================================================
let selectedMemberId = null;

function renderMembers() {
  const container = document.getElementById('tab-content');
  const members = DB.members.filter(m => m.active);

  if (selectedMemberId) {
    renderMemberDetail(container);
    return;
  }

  let html = '<div class="fade-in space-y-4">';

  if (members.length === 0) {
    html += `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <p>멤버가 없습니다</p>
    </div>`;
  } else {
    html += '<div class="space-y-3">';
    members.forEach(member => {
      const stats = getMemberStats(member.id);
      html += `<div class="card card-interactive" onclick="selectedMemberId='${member.id}'; renderMembers();" style="cursor:pointer">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${member.emoji}</span>
          <div class="flex-1">
            <div class="font-bold text-text-primary dark:text-text-dark-primary">${escHtml(member.name)}</div>
            <div class="text-sm text-text-secondary mt-0.5">출석 ${stats.attended}회 · ${formatMinutes(stats.totalMinutes)}</div>
          </div>
          <div class="text-right">
            ${stats.streak > 0 ? `<div class="streak-fire">🔥 ${stats.streak}</div>` : ''}
            <div class="text-sm font-semibold text-primary">${stats.attendanceRate}%</div>
          </div>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function getMemberStats(memberId) {
  const sessions = DB.sessions;
  const settings = DB.settings;

  let attended = 0;
  let totalMinutes = 0;
  let reviews = { '만족': 0, '보통': 0, '아쉬움': 0 };
  let history = [];
  let meetingDates = [];

  sessions.forEach(session => {
    if (DB.isMeetingDay(session.date)) {
      meetingDates.push(session.date);
    }
    const att = session.attendances.find(a => a.memberId === memberId);
    if (att && att.checkedIn) {
      attended++;
      const mins = calcMinutes(att.startTime, att.endTime);
      totalMinutes += mins;
      if (att.review) reviews[att.review] = (reviews[att.review] || 0) + 1;
      history.push({ date: session.date, ...att, minutes: mins });
    }
  });

  // Count total meeting days (sessions that exist on meeting days)
  const totalMeetings = new Set(meetingDates).size || 1;
  const attendanceRate = Math.round((attended / totalMeetings) * 100);

  // Streak: consecutive meeting day sessions attended (from most recent)
  const sortedDates = [...new Set(meetingDates)].sort().reverse();
  let streak = 0;
  for (const date of sortedDates) {
    const session = DB.getSession(date);
    const att = session?.attendances.find(a => a.memberId === memberId);
    if (att?.checkedIn) streak++;
    else break;
  }

  history.sort((a, b) => b.date.localeCompare(a.date));

  return { attended, totalMinutes, reviews, history, attendanceRate: Math.min(attendanceRate, 100), streak };
}

function renderMemberDetail(container) {
  const member = getMemberById(selectedMemberId);
  if (!member) { selectedMemberId = null; renderMembers(); return; }

  const stats = getMemberStats(member.id);

  let html = '<div class="fade-in space-y-4">';

  // Back button
  html += `<button class="text-primary font-semibold text-sm" onclick="selectedMemberId=null; renderMembers();">← 멤버 목록</button>`;

  // Profile card
  html += `<div class="card text-center">
    <div class="text-4xl mb-2">${member.emoji}</div>
    <div class="text-xl font-bold text-text-primary dark:text-text-dark-primary">${escHtml(member.name)}</div>
    <div class="flex justify-around mt-4">
      <div>
        <div class="text-2xl font-bold text-primary">${stats.attendanceRate}%</div>
        <div class="text-xs text-text-secondary">출석률</div>
      </div>
      <div>
        ${stats.streak > 0 ? `<div class="text-2xl font-bold text-orange-500">🔥${stats.streak}</div>` : '<div class="text-2xl font-bold text-text-secondary">0</div>'}
        <div class="text-xs text-text-secondary">연속 출석</div>
      </div>
      <div>
        <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${formatMinutes(stats.totalMinutes)}</div>
        <div class="text-xs text-text-secondary">총 공부시간</div>
      </div>
    </div>
  </div>`;

  // Satisfaction distribution
  const totalReviews = Object.values(stats.reviews).reduce((a, b) => a + b, 0);
  if (totalReviews > 0) {
    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">만족도 분포</div>`;
    REVIEWS.forEach(r => {
      const count = stats.reviews[r.value] || 0;
      const pct = Math.round((count / totalReviews) * 100);
      html += `<div class="flex items-center gap-3 mb-2">
        <span class="w-12 text-sm">${r.emoji} ${r.value}</span>
        <div class="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
          <div class="bar-chart-bar bg-primary" style="width:${pct}%"></div>
        </div>
        <span class="text-sm text-text-secondary w-8 text-right">${count}</span>
      </div>`;
    });
    html += '</div>';
  }

  // Session history
  if (stats.history.length > 0) {
    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">세션 기록</div>
      <div class="space-y-0">`;
    stats.history.forEach(h => {
      html += `<div class="list-row">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-text-primary dark:text-text-dark-primary">${formatDateShort(h.date)}</div>
          <div class="text-xs text-text-secondary mt-0.5">${escHtml(h.goals || '')}</div>
          ${h.reflection ? `<div class="text-xs text-text-secondary mt-1 italic">"${escHtml(h.reflection)}"</div>` : ''}
        </div>
        <div class="text-right text-sm">
          <div class="font-semibold text-text-primary dark:text-text-dark-primary">${formatMinutes(h.minutes)}</div>
          ${h.review ? `<div class="text-xs mt-0.5">${reviewEmoji(h.review)} ${h.review}</div>` : ''}
        </div>
      </div>`;
    });
    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// TAB: 통계
// ============================================================
function renderStats() {
  const container = document.getElementById('tab-content');
  const sessions = DB.sessions;
  const members = DB.members.filter(m => m.active);

  if (sessions.length === 0) {
    container.innerHTML = `<div class="fade-in empty-state">
      <div class="empty-state-icon">📊</div>
      <p>아직 기록이 없습니다</p>
    </div>`;
    return;
  }

  let html = '<div class="fade-in space-y-4">';

  // Overall stats
  const totalSessions = sessions.length;
  const allAttendances = sessions.flatMap(s => s.attendances).filter(a => a.checkedIn);
  const completedAttendances = allAttendances.filter(a => a.checkedOut);
  const totalMinutes = completedAttendances.reduce((s, a) => s + calcMinutes(a.startTime, a.endTime), 0);
  const avgMins = completedAttendances.length > 0 ? Math.round(totalMinutes / completedAttendances.length) : 0;

  html += `<div class="card">
    <div class="text-sm font-semibold text-text-secondary mb-3">전체 현황</div>
    <div class="grid grid-cols-2 gap-4">
      <div class="text-center">
        <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${totalSessions}</div>
        <div class="text-xs text-text-secondary">총 세션</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${allAttendances.length}</div>
        <div class="text-xs text-text-secondary">총 참석</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${formatMinutes(avgMins)}</div>
        <div class="text-xs text-text-secondary">평균 시간</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-text-primary dark:text-text-dark-primary">${formatMinutes(totalMinutes)}</div>
        <div class="text-xs text-text-secondary">총 공부시간</div>
      </div>
    </div>
  </div>`;

  // Member attendance comparison
  if (members.length > 0) {
    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">멤버별 출석</div>`;
    const maxAttended = Math.max(...members.map(m => getMemberStats(m.id).attended), 1);
    members.forEach(m => {
      const s = getMemberStats(m.id);
      const pct = Math.round((s.attended / maxAttended) * 100);
      html += `<div class="flex items-center gap-3 mb-3">
        <span class="text-lg">${m.emoji}</span>
        <span class="w-16 text-sm font-semibold text-text-primary dark:text-text-dark-primary truncate">${escHtml(m.name)}</span>
        <div class="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
          <div class="bar-chart-bar bg-primary" style="width:${pct}%"></div>
        </div>
        <span class="text-sm font-semibold text-text-primary dark:text-text-dark-primary w-8 text-right">${s.attended}</span>
      </div>`;
    });
    html += '</div>';
  }

  // Satisfaction distribution (overall)
  const reviewCounts = { '만족': 0, '보통': 0, '아쉬움': 0 };
  completedAttendances.forEach(a => {
    if (a.review) reviewCounts[a.review] = (reviewCounts[a.review] || 0) + 1;
  });
  const totalReviewed = Object.values(reviewCounts).reduce((a, b) => a + b, 0);

  if (totalReviewed > 0) {
    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">만족도 분포</div>`;
    REVIEWS.forEach(r => {
      const count = reviewCounts[r.value] || 0;
      const pct = Math.round((count / totalReviewed) * 100);
      html += `<div class="flex items-center gap-3 mb-2">
        <span class="w-16 text-sm">${r.emoji} ${r.value}</span>
        <div class="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
          <div class="bar-chart-bar bg-primary" style="width:${pct}%"></div>
        </div>
        <span class="text-sm text-text-secondary w-12 text-right">${pct}%</span>
      </div>`;
    });
    html += '</div>';
  }

  // Recent trend (last 10 sessions)
  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).reverse();
  if (recentSessions.length > 1) {
    const maxAtt = Math.max(...recentSessions.map(s => s.attendances.length), 1);
    html += `<div class="card">
      <div class="text-sm font-semibold text-text-secondary mb-3">최근 출석 트렌드</div>
      <div class="flex items-end gap-1 h-32">`;
    recentSessions.forEach(s => {
      const count = s.attendances.filter(a => a.checkedIn).length;
      const heightPct = Math.round((count / maxAtt) * 100);
      html += `<div class="flex-1 flex flex-col items-center justify-end h-full">
        <div class="text-xs font-semibold text-primary mb-1">${count}</div>
        <div class="w-full bg-primary rounded-t-lg" style="height:${Math.max(heightPct, 5)}%"></div>
        <div class="text-[10px] text-text-secondary mt-1">${formatDateShort(s.date)}</div>
      </div>`;
    });
    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// TAB: 설정
// ============================================================
function renderSettings() {
  const container = document.getElementById('tab-content');
  const settings = DB.settings;
  const members = DB.members;

  let html = '<div class="fade-in space-y-4">';

  // Group name
  html += `<div class="card">
    <div class="text-sm font-semibold text-text-secondary mb-3">그룹 설정</div>
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-1">그룹명</label>
        <input id="setting-group-name" class="input-field" value="${escHtml(settings.groupName)}" onchange="saveGroupName()">
      </div>
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-1">시작 시간</label>
        <input id="setting-meeting-time" type="time" class="input-field" value="${settings.meetingTime}" onchange="saveMeetingTime()">
      </div>
    </div>
  </div>`;

  // Meeting days
  html += `<div class="card">
    <div class="text-sm font-semibold text-text-secondary mb-3">모각코 요일</div>
    <div class="space-y-2">`;
  DAY_NAMES.forEach((name, idx) => {
    const active = settings.meetingDays.includes(idx);
    html += `<div class="flex items-center justify-between py-1">
      <span class="text-sm font-semibold text-text-primary dark:text-text-dark-primary">${name}요일</span>
      <div class="day-toggle ${active ? 'active' : ''}" onclick="toggleMeetingDay(${idx})"></div>
    </div>`;
  });
  html += '</div></div>';

  // Members
  html += `<div class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-semibold text-text-secondary">멤버 관리</div>
      <button class="btn-primary btn-small" style="width:auto" onclick="openAddMember()">+ 추가</button>
    </div>`;

  if (members.length === 0) {
    html += '<div class="text-sm text-text-secondary text-center py-4">멤버가 없습니다</div>';
  } else {
    html += '<div class="space-y-0">';
    members.forEach(m => {
      html += `<div class="list-row">
        <span class="text-xl">${m.emoji}</span>
        <div class="flex-1">
          <div class="font-semibold text-sm text-text-primary dark:text-text-dark-primary">${escHtml(m.name)}</div>
          <div class="text-xs text-text-secondary">${m.active ? '활성' : '비활성'}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn-secondary btn-small" style="width:auto;padding:4px 10px;font-size:12px" onclick="DB.toggleMember('${m.id}'); renderSettings();">${m.active ? '비활성화' : '활성화'}</button>
          <button class="btn-secondary btn-small btn-danger" style="width:auto;padding:4px 10px;font-size:12px" onclick="confirmDeleteMember('${m.id}')">삭제</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }
  html += '</div>';

  // Data management
  html += `<div class="card">
    <div class="text-sm font-semibold text-text-secondary mb-3">데이터 관리</div>
    <div class="space-y-2">
      <button class="btn-secondary" onclick="exportData()">📦 데이터 내보내기 (JSON)</button>
      <button class="btn-secondary" onclick="document.getElementById('import-file').click()">📥 데이터 가져오기</button>
      <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
      <button class="btn-secondary btn-danger" onclick="confirmReset()">🗑️ 데이터 초기화</button>
    </div>
  </div>`;

  html += '</div>';
  container.innerHTML = html;
}

function saveGroupName() {
  const settings = DB.settings;
  settings.groupName = document.getElementById('setting-group-name').value.trim() || '스터디';
  DB.settings = settings;
  document.getElementById('header-title').textContent = settings.groupName;
}

function saveMeetingTime() {
  const settings = DB.settings;
  settings.meetingTime = document.getElementById('setting-meeting-time').value;
  DB.settings = settings;
}

function toggleMeetingDay(dayIdx) {
  const settings = DB.settings;
  const idx = settings.meetingDays.indexOf(dayIdx);
  if (idx >= 0) settings.meetingDays.splice(idx, 1);
  else settings.meetingDays.push(dayIdx);
  settings.meetingDays.sort();
  DB.settings = settings;
  renderSettings();
}

const EMOJI_LIST = [
  // 동물
  '🐱','🐶','🐻','🐼','🦊','🐸','🐵','🐰','🦁','🐯','🐨','🐮','🐷','🐙','🦄','🐝',
  '🐧','🐦','🦅','🦆','🦉','🐺','🐗','🐴','🦋','🐢','🐍','🦈','🐳','🐬','🦭','🐊',
  '🦖','🦕','🐘','🦒','🦔','🐿️','🦜','🦩','🐏','🦘','🦫','🦥','🐈‍⬛',
  // 사람·캐릭터
  '😎','🤓','🧑‍💻','👻','🤖','👽','🎃','🧙','🧛','🥷','🦸','🧑‍🚀',
  // 음식·자연
  '🍕','🍔','🍣','🍩','🍉','🍒','🥑','🌮','🧁','🍦','☕','🍺',
  '🥒','🌸','🌻','🍀','🌵','🌈','⭐','🔥','💎','⛈️','🎸','🎮','🚀','🛸'
];

function openAddMember() {
  const emojiGrid = EMOJI_LIST.map(e =>
    `<span class="text-2xl cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" onclick="selectEmoji(this, '${e}')">${e}</span>`
  ).join('');

  Modal.show(`
    <h3 class="text-lg font-bold text-text-primary dark:text-text-dark-primary mb-4">멤버 추가</h3>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">이름</label>
        <input id="new-member-name" class="input-field" placeholder="이름 입력">
      </div>
      <div>
        <label class="block text-sm font-semibold text-text-primary dark:text-text-dark-primary mb-2">이모지</label>
        <div class="flex flex-wrap gap-1" id="emoji-grid">${emojiGrid}</div>
        <input type="hidden" id="new-member-emoji" value="🐱">
      </div>
      <button class="btn-primary" onclick="doAddMember()">추가하기</button>
    </div>
  `);
}

function selectEmoji(el, emoji) {
  document.querySelectorAll('#emoji-grid span').forEach(s => s.style.background = '');
  el.style.background = '#EBF3FE';
  document.getElementById('new-member-emoji').value = emoji;
}

function doAddMember() {
  const name = document.getElementById('new-member-name').value.trim();
  const emoji = document.getElementById('new-member-emoji').value;
  if (!name) { alert('이름을 입력해주세요'); return; }
  DB.addMember(name, emoji);
  Modal.hide();
  renderSettings();
}

function confirmDeleteMember(id) {
  const member = getMemberById(id);
  if (!member) return;
  if (confirm(`${member.name} 멤버를 삭제할까요?\n관련 출석 기록은 유지됩니다.`)) {
    DB.deleteMember(id);
    renderSettings();
  }
}

function exportData() {
  const data = DB.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mogakko_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      DB.importData(e.target.result);
      alert('데이터를 가져왔습니다!');
      renderTab();
    } catch (err) {
      alert('올바른 JSON 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmReset() {
  if (confirm('모든 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없습니다.')) {
    if (confirm('정말로 초기화하시겠습니까?')) {
      DB.resetAll();
      renderTab();
    }
  }
}

// ============================================================
// Init
// ============================================================
DB.load().then(() => switchTab('today'));
