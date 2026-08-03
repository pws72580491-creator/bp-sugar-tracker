/* =========================================================
   charts.js — lightweight canvas line chart
   Deliberately dependency-free so the PWA renders trend lines
   even fully offline (no CDN chart library to cache/fetch).
   ========================================================= */

const Charts = (() => {

  function drawLineChart(canvas, series, opts) {
    opts = opts || {};
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || canvas.parentElement.clientWidth;
    const cssHeight = opts.height || 180;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.height = cssHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const pad = { top: 14, right: 10, bottom: 22, left: 34 };
    const w = cssWidth - pad.left - pad.right;
    const h = cssHeight - pad.top - pad.bottom;

    const allVals = series.flatMap(s => s.points.map(p => p.y)).filter(v => typeof v === 'number');
    if (!allVals.length) {
      ctx.fillStyle = '#5B6B72';
      ctx.font = '13px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('표시할 데이터가 없습니다', cssWidth / 2, cssHeight / 2);
      return;
    }

    let yMin = opts.yMin !== undefined ? opts.yMin : Math.min(...allVals);
    let yMax = opts.yMax !== undefined ? opts.yMax : Math.max(...allVals);
    if (yMin === yMax) { yMin -= 5; yMax += 5; }
    const yPadAmt = (yMax - yMin) * 0.12;
    yMin -= yPadAmt; yMax += yPadAmt;

    const n = Math.max(...series.map(s => s.points.length), 2);
    const xAt = i => pad.left + (n === 1 ? 0 : (i / (n - 1)) * w);
    const yAt = v => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

    // gridlines
    ctx.strokeStyle = '#DDE2E0';
    ctx.lineWidth = 1;
    const gridLines = 4;
    ctx.fillStyle = '#5B6B72';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    for (let g = 0; g <= gridLines; g++) {
      const v = yMin + ((yMax - yMin) * g) / gridLines;
      const y = yAt(v);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + w, y);
      ctx.stroke();
      ctx.fillText(Math.round(v).toString(), pad.left - 6, y + 3);
    }

    // x labels (first, middle, last)
    if (opts.xLabels && opts.xLabels.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5B6B72';
      const idxs = [0, Math.floor((opts.xLabels.length - 1) / 2), opts.xLabels.length - 1];
      idxs.forEach(i => {
        if (opts.xLabels[i] === undefined) return;
        ctx.fillText(opts.xLabels[i], xAt(i), cssHeight - 6);
      });
    }

    // series lines
    series.forEach(s => {
      if (!s.points.length) return;
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const x = xAt(i);
        const y = yAt(p.y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = s.color || '#1C2B33';
      ctx.lineWidth = 2.25;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // points
      ctx.fillStyle = s.color || '#1C2B33';
      s.points.forEach((p, i) => {
        const x = xAt(i);
        const y = yAt(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // Renders a small static pulse-line SVG path string (used decoratively)
  function pulsePath(width) {
    width = width || 600;
    const mid = 14;
    return `M0,${mid} L${width * 0.28},${mid} L${width * 0.34},${mid - 10} L${width * 0.40},${mid + 16} L${width * 0.46},${mid - 4} L${width * 0.52},${mid} L${width},${mid}`;
  }

  return { drawLineChart, pulsePath };
})();
