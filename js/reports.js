/* =========================================================
   reports.js — printable report builder
   Renders a clean, print-optimized summary table into the
   hidden #print-area, then triggers window.print().
   ========================================================= */

const Reports = (() => {

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function buildBpRows(readings) {
    if (!readings.length) return '<tr><td colspan="5" style="padding:10px;color:#5B6B72;">기록 없음</td></tr>';
    return readings.map(r => {
      const cat = Insights.categorizeBp(r.systolic, r.diastolic);
      return `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${r.systolic}</td>
        <td>${r.diastolic}</td>
        <td>${r.pulse || '-'}</td>
        <td>${cat.label}</td>
      </tr>`;
    }).join('');
  }

  function buildGlucoseRows(readings) {
    if (!readings.length) return '<tr><td colspan="4" style="padding:10px;color:#5B6B72;">기록 없음</td></tr>';
    const ctxLabel = { fasting: '공복', before_meal: '식전', after_meal: '식후', bedtime: '취침 전', random: '무작위' };
    return readings.map(r => {
      const mgdl = r.unit === 'mmol' ? Converter.mmolToMgdl(r.value) : r.value;
      const cat = Insights.categorizeGlucose(mgdl, r.context);
      const displayVal = r.unit === 'mmol' ? `${r.value} mmol/L` : `${r.value} mg/dL`;
      return `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${displayVal}</td>
        <td>${ctxLabel[r.context] || r.context}</td>
        <td>${cat.label}</td>
      </tr>`;
    }).join('');
  }

  function render(bpReadings, glucoseReadings, rangeLabel) {
    const area = document.getElementById('print-area');
    const bpStats = Insights.stats(bpReadings.map(r => r.systolic));
    const diaStats = Insights.stats(bpReadings.map(r => r.diastolic));
    const glStats = Insights.stats(glucoseReadings.map(r => r.unit === 'mmol' ? Converter.mmolToMgdl(r.value) : r.value));

    area.innerHTML = `
      <div style="font-family: 'Noto Sans KR', sans-serif; color:#1C2B33;">
        <h1 style="font-size:20px;margin:0 0 4px;">혈압·혈당 기록 보고서</h1>
        <p style="font-size:12px;color:#5B6B72;margin:0 0 18px;">기간: ${rangeLabel} · 생성일: ${fmtDate(new Date().toISOString())}</p>

        <h2 style="font-size:14px;margin:18px 0 8px;">혈압 요약</h2>
        <p style="font-size:12px;color:#5B6B72;margin:0 0 8px;">
          ${bpStats ? `수축기 평균 ${Math.round(bpStats.avg)} (최고 ${bpStats.max} / 최저 ${bpStats.min}) &nbsp;·&nbsp; 이완기 평균 ${Math.round(diaStats.avg)} (최고 ${diaStats.max} / 최저 ${diaStats.min})` : '기록 없음'}
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="text-align:left;border-bottom:1px solid #ccc;">
            <th style="padding:6px 4px;">일시</th><th style="padding:6px 4px;">수축기</th><th style="padding:6px 4px;">이완기</th><th style="padding:6px 4px;">맥박</th><th style="padding:6px 4px;">범위</th>
          </tr></thead>
          <tbody>${buildBpRows(bpReadings)}</tbody>
        </table>

        <h2 style="font-size:14px;margin:22px 0 8px;">혈당 요약</h2>
        <p style="font-size:12px;color:#5B6B72;margin:0 0 8px;">
          ${glStats ? `평균 ${Math.round(glStats.avg)} mg/dL (최고 ${glStats.max} / 최저 ${glStats.min})` : '기록 없음'}
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="text-align:left;border-bottom:1px solid #ccc;">
            <th style="padding:6px 4px;">일시</th><th style="padding:6px 4px;">수치</th><th style="padding:6px 4px;">측정 시점</th><th style="padding:6px 4px;">범위</th>
          </tr></thead>
          <tbody>${buildGlucoseRows(glucoseReadings)}</tbody>
        </table>

        <p style="font-size:10.5px;color:#8a9599;margin-top:24px;">
          본 보고서의 범위 표시는 일반적인 참고 기준이며 의학적 진단이 아닙니다. 정확한 해석은 의료진과 상담하세요.
        </p>
      </div>
    `;
  }

  function print(bpReadings, glucoseReadings, rangeLabel) {
    render(bpReadings, glucoseReadings, rangeLabel);
    window.print();
  }

  return { print, render };
})();
