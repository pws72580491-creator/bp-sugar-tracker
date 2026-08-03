/* =========================================================
   app.js — application shell: navigation, rendering, forms
   ========================================================= */

(function () {
  const state = {
    tab: 'dashboard',
    historyFilter: 'all',
    analysisRange: 30,
    editing: null // { type, id } when editing an existing reading
  };

  const HEADER_TITLES = {
    dashboard: '대시보드',
    history: '전체 기록',
    analysis: '분석',
    converter: '단위 변환기',
    articles: '건강 정보'
  };

  const CONTEXT_LABEL = { fasting: '공복', before_meal: '식전', after_meal: '식후', bedtime: '취침 전', random: '무작위' };

  // ---------- DOM refs ----------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheEls();
    bindNav();
    bindFab();
    bindSheet();
    bindArticleSheet();
    bindForm();
    bindConverter();
    bindReport();
    bindHistoryFilters();
    bindAnalysisRanges();
    setTodayLabel();
    registerServiceWorker();
    renderAll();
    window.addEventListener('scroll', () => {
      els.header.classList.toggle('is-scrolled', window.scrollY > 4);
    });
  }

  function cacheEls() {
    els.header = $('#appHeader');
    els.headerTitle = $('#headerTitle');
    els.todayLabel = $('#todayLabel');
    els.toast = $('#toast');
  }

  // ---------- Navigation ----------
  function bindNav() {
    $$('.tabbar button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    $$('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.nav));
    });
  }

  function switchTab(tab) {
    state.tab = tab;
    $$('.view').forEach(v => v.hidden = true);
    $('#view-' + tab).hidden = false;
    $$('.tabbar button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    els.headerTitle.textContent = HEADER_TITLES[tab] || '';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    renderTab(tab);
  }

  function renderAll() {
    renderTab(state.tab);
  }

  function renderTab(tab) {
    if (tab === 'dashboard') renderDashboard();
    else if (tab === 'history') renderHistory();
    else if (tab === 'analysis') renderAnalysis();
    else if (tab === 'articles') renderArticles();
    // converter has no data-dependent render
  }

  function setTodayLabel() {
    const d = new Date();
    els.todayLabel.textContent = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }

  // =========================================================
  // DASHBOARD
  // =========================================================
  function renderDashboard() {
    const bp = Storage.getAll('bp');
    const glucose = Storage.getAll('glucose');

    const latestBp = bp[0];
    const latestBpEl = $('#latestBp');
    const latestBpBadgeWrap = $('#latestBpBadgeWrap');
    if (latestBp) {
      latestBpEl.innerHTML = `${latestBp.systolic}<span class="unit">/</span>${latestBp.diastolic}`;
      const cat = Insights.categorizeBp(latestBp.systolic, latestBp.diastolic);
      latestBpBadgeWrap.innerHTML = `<span class="badge ${cat.level}">${cat.label}</span>`;
    } else {
      latestBpEl.textContent = '—';
      latestBpBadgeWrap.innerHTML = '';
    }

    const latestGlucose = glucose[0];
    const latestGlucoseEl = $('#latestGlucose');
    const latestGlucoseBadgeWrap = $('#latestGlucoseBadgeWrap');
    if (latestGlucose) {
      const unitLabel = latestGlucose.unit === 'mmol' ? 'mmol/L' : 'mg/dL';
      latestGlucoseEl.innerHTML = `${latestGlucose.value}<span class="unit">${unitLabel}</span>`;
      const mgdl = latestGlucose.unit === 'mmol' ? Converter.mmolToMgdl(latestGlucose.value) : latestGlucose.value;
      const cat = Insights.categorizeGlucose(mgdl, latestGlucose.context);
      latestGlucoseBadgeWrap.innerHTML = `<span class="badge ${cat.level}">${cat.label}</span>`;
    } else {
      latestGlucoseEl.textContent = '—';
      latestGlucoseBadgeWrap.innerHTML = '';
    }

    // insights
    const notes = Insights.trendSummary(bp, glucose);
    $('#insightList').innerHTML = notes.map(n => `
      <div class="insight ${n.level}">
        <div class="ico">${iconFor(n.level)}</div>
        <div class="txt">${n.text}</div>
      </div>
    `).join('');

    // recent list (merge, top 5)
    const merged = mergeReadings(bp, glucose).slice(0, 5);
    $('#recentList').innerHTML = merged.length
      ? merged.map(readingRowHtml).join('')
      : emptyStateHtml('아직 기록이 없습니다', '오른쪽 아래 + 버튼으로 첫 기록을 추가해 보세요.');

    bindReadingRowClicks('#recentList');
  }

  function iconFor(level) {
    return { good: '✅', warn: '⚠️', danger: '🚨', info: 'ℹ️' }[level] || 'ℹ️';
  }

  // =========================================================
  // HISTORY
  // =========================================================
  function bindHistoryFilters() {
    $$('#historyFilterChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.historyFilter = chip.dataset.filter;
        $$('#historyFilterChips .chip').forEach(c => c.classList.toggle('active', c === chip));
        renderHistory();
      });
    });
  }

  function renderHistory() {
    const bp = Storage.getAll('bp');
    const glucose = Storage.getAll('glucose');
    let merged;
    if (state.historyFilter === 'bp') merged = mergeReadings(bp, []);
    else if (state.historyFilter === 'glucose') merged = mergeReadings([], glucose);
    else merged = mergeReadings(bp, glucose);

    $('#historyList').innerHTML = merged.length
      ? merged.map(readingRowHtml).join('')
      : emptyStateHtml('기록이 없습니다', '필터를 바꾸거나 새 기록을 추가해 보세요.');

    bindReadingRowClicks('#historyList');
  }

  // =========================================================
  // Shared: merge + row rendering
  // =========================================================
  function mergeReadings(bp, glucose) {
    const a = bp.map(r => Object.assign({ _type: 'bp' }, r));
    const b = glucose.map(r => Object.assign({ _type: 'glucose' }, r));
    return a.concat(b).sort((x, y) => new Date(y.date) - new Date(x.date));
  }

  function readingRowHtml(r) {
    const dateStr = formatDateShort(r.date);
    if (r._type === 'bp') {
      const cat = Insights.categorizeBp(r.systolic, r.diastolic);
      return `
      <div class="card reading-row" data-type="bp" data-id="${r.id}">
        <div class="rtype bp">♥</div>
        <div class="rmain">
          <div class="rval mono">${r.systolic}/${r.diastolic} <span style="font-size:11px;color:var(--ink-soft);">mmHg</span></div>
          <div class="rmeta">${dateStr}${r.pulse ? ' · 맥박 ' + r.pulse : ''}</div>
        </div>
        <span class="badge ${cat.level}" style="margin-top:0;">${cat.label}</span>
      </div>`;
    }
    const unitLabel = r.unit === 'mmol' ? 'mmol/L' : 'mg/dL';
    const mgdl = r.unit === 'mmol' ? Converter.mmolToMgdl(r.value) : r.value;
    const cat = Insights.categorizeGlucose(mgdl, r.context);
    return `
      <div class="card reading-row" data-type="glucose" data-id="${r.id}">
        <div class="rtype glucose">◆</div>
        <div class="rmain">
          <div class="rval mono">${r.value} <span style="font-size:11px;color:var(--ink-soft);">${unitLabel}</span></div>
          <div class="rmeta">${dateStr} · ${CONTEXT_LABEL[r.context] || r.context}</div>
        </div>
        <span class="badge ${cat.level}" style="margin-top:0;">${cat.label}</span>
      </div>`;
  }

  function emptyStateHtml(title, sub) {
    return `<div class="empty-state"><div class="glyph">〜</div><p><strong>${title}</strong><br>${sub}</p></div>`;
  }

  function bindReadingRowClicks(containerSel) {
    $$(containerSel + ' .reading-row').forEach(row => {
      row.addEventListener('click', () => {
        const type = row.dataset.type;
        const id = row.dataset.id;
        const record = Storage.getAll(type).find(r => r.id === id);
        if (record) openSheet(type, record);
      });
    });
  }

  // =========================================================
  // ANALYSIS
  // =========================================================
  function bindAnalysisRanges() {
    $$('#analysisRangeChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.analysisRange = parseInt(chip.dataset.range, 10);
        $$('#analysisRangeChips .chip').forEach(c => c.classList.toggle('active', c === chip));
        renderAnalysis();
      });
    });
  }

  function withinRange(dateIso, days) {
    if (!days) return true;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(dateIso).getTime() >= cutoff;
  }

  function renderAnalysis() {
    const days = state.analysisRange;
    const bp = Storage.getAll('bp').filter(r => withinRange(r.date, days)).slice().reverse();
    const glucose = Storage.getAll('glucose').filter(r => withinRange(r.date, days)).slice().reverse();

    // BP chart
    const bpCanvas = $('#bpChart');
    const sysSeries = { points: bp.map(r => ({ y: r.systolic })), color: getCss('--blood') };
    const diaSeries = { points: bp.map(r => ({ y: r.diastolic })), color: getCss('--blood-soft') };
    Charts.drawLineChart(bpCanvas, [sysSeries, diaSeries], {
      xLabels: bp.map(r => formatAxisDate(r.date))
    });

    const sysStats = Insights.stats(bp.map(r => r.systolic));
    const diaStats = Insights.stats(bp.map(r => r.diastolic));
    $('#bpStatsRow').innerHTML = sysStats ? `
      <div class="stat-mini"><div class="l">최고 (수축/이완)</div><div class="v">${sysStats.max}/${diaStats.max}</div></div>
      <div class="stat-mini"><div class="l">평균</div><div class="v">${Math.round(sysStats.avg)}/${Math.round(diaStats.avg)}</div></div>
      <div class="stat-mini"><div class="l">최저</div><div class="v">${sysStats.min}/${diaStats.min}</div></div>
    ` : `<div class="text-soft" style="font-size:12.5px;padding:6px 2px;">이 기간에 기록이 없습니다.</div>`;

    // Glucose chart (normalize to mg/dL)
    const glCanvas = $('#glucoseChart');
    const glVals = glucose.map(r => r.unit === 'mmol' ? Converter.mmolToMgdl(r.value) : r.value);
    Charts.drawLineChart(glCanvas, [{ points: glVals.map(v => ({ y: v })), color: getCss('--glucose') }], {
      xLabels: glucose.map(r => formatAxisDate(r.date))
    });
    const glStats = Insights.stats(glVals);
    $('#glucoseStatsRow').innerHTML = glStats ? `
      <div class="stat-mini"><div class="l">최고</div><div class="v">${Math.round(glStats.max)}</div></div>
      <div class="stat-mini"><div class="l">평균</div><div class="v">${Math.round(glStats.avg)}</div></div>
      <div class="stat-mini"><div class="l">최저</div><div class="v">${Math.round(glStats.min)}</div></div>
    ` : `<div class="text-soft" style="font-size:12.5px;padding:6px 2px;">이 기간에 기록이 없습니다.</div>`;
  }

  function getCss(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function formatAxisDate(iso) {
    const d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  // =========================================================
  // ARTICLES
  // =========================================================
  function renderArticles() {
    const list = Articles.all();
    $('#articleList').innerHTML = list.map(a => `
      <div class="card article-card" data-id="${a.id}">
        <div class="cat">${a.cat}</div>
        <h3>${a.title}</h3>
        <div class="snippet">${a.snippet}</div>
      </div>
    `).join('');
    $$('#articleList .article-card').forEach(card => {
      card.addEventListener('click', () => openArticleSheet(card.dataset.id));
    });
  }

  function bindArticleSheet() {
    $('#closeArticleSheetBtn').addEventListener('click', closeArticleSheet);
    $('#articleSheetBackdrop').addEventListener('click', e => {
      if (e.target.id === 'articleSheetBackdrop') closeArticleSheet();
    });
  }

  function openArticleSheet(id) {
    const a = Articles.byId(id);
    if (!a) return;
    $('#articleSheetTitle').textContent = a.title;
    $('#articleSheetBody').innerHTML = a.body + `<p style="font-size:11.5px;color:var(--ink-soft);margin-top:10px;">이 정보는 일반적인 건강 참고 자료이며 전문적인 의학적 조언을 대신하지 않습니다.</p>`;
    $('#articleSheetBackdrop').hidden = false;
  }
  function closeArticleSheet() {
    $('#articleSheetBackdrop').hidden = true;
  }

  // =========================================================
  // ADD / EDIT SHEET
  // =========================================================
  function bindFab() {
    $('#fabAdd').addEventListener('click', () => openSheet('bp', null));
  }

  function bindSheet() {
    $('#closeSheetBtn').addEventListener('click', closeSheet);
    $('#addSheetBackdrop').addEventListener('click', e => {
      if (e.target.id === 'addSheetBackdrop') closeSheet();
    });
    $$('#typeSegment button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.editing) return; // don't allow type switch while editing
        $$('#typeSegment button').forEach(b => b.classList.toggle('active', b === btn));
        toggleTypeFields(btn.dataset.type);
      });
    });
  }

  function toggleTypeFields(type) {
    $('#bpFields').hidden = type !== 'bp';
    $('#glucoseFields').hidden = type !== 'glucose';
  }

  function openSheet(type, existing) {
    state.editing = existing ? { type, id: existing.id } : null;
    $('#sheetTitle').textContent = existing ? '기록 수정' : '기록 추가';
    $$('#typeSegment button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === type);
      b.disabled = !!existing;
      b.style.opacity = existing ? 0.5 : 1;
    });
    toggleTypeFields(type);

    const now = existing ? new Date(existing.date) : new Date();
    $('#fDate').value = toDateInputValue(now);
    $('#fTime').value = toTimeInputValue(now);
    $('#fNotes').value = existing ? (existing.notes || '') : '';

    if (type === 'bp') {
      $('#fSystolic').value = existing ? existing.systolic : '';
      $('#fDiastolic').value = existing ? existing.diastolic : '';
      $('#fPulse').value = existing && existing.pulse ? existing.pulse : '';
    } else {
      $('#fGlucoseValue').value = existing ? existing.value : '';
      $('#fGlucoseUnit').value = existing ? existing.unit : Storage.getSettings().glucoseUnit;
      $('#fGlucoseContext').value = existing ? existing.context : 'fasting';
    }

    $('#deleteBtnWrap').hidden = !existing;
    $('#addSheetBackdrop').hidden = false;
  }

  function closeSheet() {
    $('#addSheetBackdrop').hidden = true;
    state.editing = null;
    $('#readingForm').reset();
  }

  function bindForm() {
    $('#readingForm').addEventListener('submit', e => {
      e.preventDefault();
      const type = $$('#typeSegment button.active')[0].dataset.type;
      const dateVal = $('#fDate').value;
      const timeVal = $('#fTime').value || '00:00';
      if (!dateVal) { showToast('날짜를 입력해 주세요'); return; }
      const iso = new Date(`${dateVal}T${timeVal}`).toISOString();
      const notes = $('#fNotes').value.trim();

      if (type === 'bp') {
        const systolic = parseInt($('#fSystolic').value, 10);
        const diastolic = parseInt($('#fDiastolic').value, 10);
        const pulse = $('#fPulse').value ? parseInt($('#fPulse').value, 10) : null;
        if (!systolic || !diastolic) { showToast('수축기·이완기 수치를 입력해 주세요'); return; }
        const payload = { systolic, diastolic, pulse, date: iso, notes };
        if (state.editing) Storage.update('bp', state.editing.id, payload);
        else Storage.add('bp', payload);
      } else {
        const value = parseFloat($('#fGlucoseValue').value);
        const unit = $('#fGlucoseUnit').value;
        const context = $('#fGlucoseContext').value;
        if (!value) { showToast('혈당 수치를 입력해 주세요'); return; }
        const payload = { value, unit, context, date: iso, notes };
        if (state.editing) Storage.update('glucose', state.editing.id, payload);
        else Storage.add('glucose', payload);
      }

      closeSheet();
      showToast('저장되었습니다');
      renderTab(state.tab);
    });

    $('#deleteReadingBtn').addEventListener('click', () => {
      if (!state.editing) return;
      if (!confirm('이 기록을 삭제할까요?')) return;
      Storage.remove(state.editing.type, state.editing.id);
      closeSheet();
      showToast('삭제되었습니다');
      renderTab(state.tab);
    });
  }

  // =========================================================
  // CONVERTER
  // =========================================================
  function bindConverter() {
    $('#convGlucoseInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      $('#convGlucoseResult').textContent = isFinite(v) ? Converter.round(Converter.mgdlToMmol(v), 1) : '—';
    });
    $('#convBpInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      $('#convBpResult').textContent = isFinite(v) ? Converter.round(Converter.mmHgToKpa(v), 2) : '—';
    });
  }

  // =========================================================
  // REPORTS
  // =========================================================
  function bindReport() {
    $('#printReportBtn').addEventListener('click', () => {
      const days = state.analysisRange;
      const bp = Storage.getAll('bp').filter(r => withinRange(r.date, days));
      const glucose = Storage.getAll('glucose').filter(r => withinRange(r.date, days));
      const rangeLabel = days ? `최근 ${days}일` : '전체 기간';
      Reports.print(bp, glucose, rangeLabel);
    });
  }

  // =========================================================
  // Utilities
  // =========================================================
  function toDateInputValue(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function toTimeInputValue(d) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function formatDateShort(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  let toastTimer;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
      });
    }
  }
})();
