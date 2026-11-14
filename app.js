const monthLabel = document.querySelector('#monthLabel');
const calendarGrid = document.querySelector('#calendarGrid');
const monthTotal = document.querySelector('#monthTotal');
const monthCount = document.querySelector('#monthCount');
const dialog = document.querySelector('#dayDialog');
const toast = document.querySelector('#toast');

let records = [];
let visibleMonth = new Date();
visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
let installPrompt = null;

const byDate = new Map();
const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function durationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total < 60) return `${total}초`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes}분 ${rest}초` : `${minutes}분`;
}

function compactDuration(seconds) {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  if (!minutes) return '기록';
  return `${minutes}분`;
}

function monthRecords(year, month) {
  return records.filter(record => {
    const date = parseDate(record.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function render() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  monthLabel.textContent = `${year}년 ${monthNames[month]}`;
  calendarGrid.replaceChildren();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthly = monthRecords(year, month);
  const totalSeconds = monthly.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0);
  monthTotal.textContent = durationLabel(totalSeconds);
  monthCount.textContent = `${monthly.length}개의 학습 기록 · ${new Set(monthly.map(item => item.date)).size}일 공부했어요`;

  for (let i = 0; i < firstWeekday; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    empty.setAttribute('aria-hidden', 'true');
    calendarGrid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = byDate.get(key) || [];
    const seconds = dayRecords.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0);
    const button = document.createElement('button');
    const weekday = new Date(year, month, day).getDay();
    button.className = `day-cell${dayRecords.length ? ' has-record' : ''}${weekday === 0 ? ' sunday' : ''}`;
    if (key === new Date().toLocaleDateString('en-CA')) button.classList.add('today');
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${month + 1}월 ${day}일${dayRecords.length ? `, ${dayRecords.length}건 학습` : ''}`);

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day;
    button.append(number);

    if (dayRecords.length) {
      const time = document.createElement('span');
      time.className = 'day-time';
      time.textContent = compactDuration(seconds);
      button.append(time);
      button.addEventListener('click', () => openDay(key));
    } else {
      button.disabled = true;
    }
    calendarGrid.append(button);
  }
}

function openDay(key) {
  const dayRecords = (byDate.get(key) || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const date = parseDate(key);
  document.querySelector('#dialogDate').textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 학습`;
  document.querySelector('#dayTotal').textContent = durationLabel(
    dayRecords.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0)
  );

  const list = document.querySelector('#recordList');
  list.replaceChildren();
  for (const record of dayRecords) {
    const card = document.createElement('article');
    card.className = 'record-card';
    const top = document.createElement('div');
    top.className = 'record-top';

    const title = document.createElement('h3');
    title.className = 'record-title';
    title.textContent = record.title || '제목 없음';
    const time = document.createElement('span');
    time.className = 'record-time';
    time.textContent = record.time || '';
    top.append(title, time);

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    if (record.score && record.score !== '0') addChip(meta, `점수 ${record.score}`, 'score');
    addChip(meta, durationLabel(record.seconds));
    card.append(top, meta);
    list.append(card);
  }
  dialog.showModal();
}

function addChip(parent, text, extraClass = '') {
  const chip = document.createElement('span');
  chip.className = `record-chip ${extraClass}`.trim();
  chip.textContent = text;
  parent.append(chip);
}

function moveMonth(amount) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
  render();
}

document.querySelector('#previousMonth').addEventListener('click', () => moveMonth(-1));
document.querySelector('#nextMonth').addEventListener('click', () => moveMonth(1));
document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

async function loadRecords() {
  try {
    const response = await fetch(`./data/records.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    records = await response.json();
    byDate.clear();
    for (const record of records) {
      if (!byDate.has(record.date)) byDate.set(record.date, []);
      byDate.get(record.date).push(record);
    }
    render();
  } catch (error) {
    monthTotal.textContent = '기록을 불러오지 못했어요';
    monthCount.textContent = '앱을 인터넷에 연결한 뒤 다시 열어 주세요.';
    showToast('학습 기록 파일을 찾을 수 없어요.');
    console.error(error);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  const button = document.querySelector('#installButton');
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    button.hidden = true;
  }, { once: true });
});

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}

loadRecords();


// ===== 지금 업데이트 버튼 =====
(function () {
  const OWNER = 'Ellie150121';
  const REPO = 'study-calendar';
  const WORKFLOW = 'update-and-deploy.yml';
  const KEY = 'lf_update_key';

  const style = document.createElement('style');
  style.textContent = `
    .update-box { margin-top: 18px; text-align: center; }
    .update-button { width: 100%; border: 0; border-radius: 16px; padding: 15px; background: #496bea; color: #fff; font-size: 14px; font-weight: 700; }
    .update-button:disabled { background: #a9b6ee; }
    .update-link { margin-top: 10px; border: 0; background: none; color: #9aa1b5; font-size: 11px; text-decoration: underline; }
  `;
  document.head.append(style);

  const box = document.createElement('div');
  box.className = 'update-box';
  box.innerHTML = '<button class="update-button" id="updateButton">↻ 지금 업데이트</button><button class="update-link" id="clearKey">열쇠 지우기</button>';
  document.querySelector('.app-footer').before(box);

  const button = document.querySelector('#updateButton');
  button.addEventListener('click', async () => {
    if (!confirm('아이가 지금 공부 중이면 아이 화면이 로그아웃될 수 있어요.\n업데이트를 시작할까요?')) return;
    let token = localStorage.getItem(KEY);
    if (!token) {
      token = (prompt('업데이트 열쇠를 붙여 넣어 주세요') || '').trim();
      if (!token) return;
      localStorage.setItem(KEY, token);
    }
    button.disabled = true;
    try {
      const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      });
      if (response.status === 204) {
        showToast('업데이트를 시작했어요. 3~5분 뒤에 다시 열어 보세요.');
        setTimeout(loadRecords, 180000);
        setTimeout(loadRecords, 300000);
      } else {
        if (response.status === 401) localStorage.removeItem(KEY);
        showToast(`업데이트를 시작하지 못했어요 (오류 ${response.status})`);
      }
    } catch (error) {
      showToast('인터넷 연결을 확인해 주세요.');
    }
    setTimeout(() => { button.disabled = false; }, 60000);
  });

  document.querySelector('#clearKey').addEventListener('click', () => {
    localStorage.removeItem(KEY);
    showToast('저장된 열쇠를 지웠어요.');
  });
})();


// ===== 업데이트 버튼을 헤더 제목 옆으로 옮기기 =====
(function () {
  const bar = document.querySelector('.topbar');
  const brand = document.querySelector('.brand-copy');
  const btn = document.querySelector('#updateButton');
  if (!bar || !brand || !btn) return;
  btn.textContent = '↻';
  btn.setAttribute('aria-label', '지금 업데이트');
  btn.classList.add('update-icon');
  brand.after(btn);
})();
