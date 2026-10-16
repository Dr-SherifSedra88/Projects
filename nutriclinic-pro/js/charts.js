/* ============================================================
   NutriClinic Pro — charts.js
   Minimal dependency-free SVG charts (no green, by design).
   ============================================================ */
'use strict';
(function () {

  const W = 680, H = 250;
  const PAD = { l: 48, r: 18, t: 16, b: 34 };

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / (count || 4);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
    const start = Math.ceil(min / step) * step;
    const ticks = [];
    for (let v = start; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(8));
    return ticks;
  }

  /* series: [{name, color, points:[{x: 'YYYY-MM-DD', y: number}], dashed}] */
  function line(opts) {
    const series = (opts.series || []).filter(s => s.points && s.points.length);
    const height = opts.height || H;
    const width = opts.width || W;
    if (!series.length) return '<div class="muted small" style="padding:20px;text-align:center">—</div>';
    const all = [];
    series.forEach(s => s.points.forEach(p => { if (isFinite(p.y)) all.push(p.y); }));
    if (!all.length) return '<div class="muted small" style="padding:20px;text-align:center">—</div>';
    let ymin = Math.min.apply(null, all), ymax = Math.max.apply(null, all);
    if (opts.yZero) ymin = Math.min(0, ymin);
    const padY = (ymax - ymin) * 0.12 || 1;
    ymin -= padY; ymax += padY;
    const ticks = niceTicks(ymin, ymax, 4);
    ymin = Math.min(ymin, ticks[0]); ymax = Math.max(ymax, ticks[ticks.length - 1]);

    const xs = [];
    series.forEach(s => s.points.forEach(p => { if (xs.indexOf(p.x) < 0) xs.push(p.x); }));
    xs.sort();
    const n = xs.length;
    const px = x => PAD.l + (n <= 1 ? (width - PAD.l - PAD.r) / 2 : (xs.indexOf(x) / (n - 1)) * (width - PAD.l - PAD.r));
    const py = y => PAD.t + (1 - (y - ymin) / (ymax - ymin)) * (height - PAD.t - PAD.b);
    const fmtY = opts.yFmt || (v => Math.round(v * 10) / 10);

    let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" class="progress-svg chart-svg" role="img" aria-label="' + esc(opts.ariaLabel || 'chart') + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto">';
    /* grid */
    ticks.forEach(t => {
      const y = py(t);
      svg += '<line x1="' + PAD.l + '" y1="' + y + '" x2="' + (width - PAD.r) + '" y2="' + y + '" stroke="#ECEFF5" stroke-width="1"/>';
      svg += '<text x="' + (PAD.l - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="10.5" fill="#8A93A8">' + esc(fmtY(t)) + '</text>';
    });
    /* x labels (first, middle, last) */
    const labelIdx = n <= 4 ? xs.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    labelIdx.forEach(i => {
      const x = px(xs[i]);
      svg += '<text x="' + x + '" y="' + (height - PAD.b + 16) + '" text-anchor="middle" font-size="10.5" fill="#8A93A8">' + esc(opts.xFmt ? opts.xFmt(xs[i]) : xs[i]) + '</text>';
    });
    /* series */
    series.forEach(s => {
      const pts = s.points.slice().sort((a, b) => (a.x > b.x ? 1 : -1)).filter(p => isFinite(p.y));
      if (!pts.length) return;
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + px(p.x).toFixed(1) + ' ' + py(p.y).toFixed(1)).join(' ');
      if (s.area && pts.length > 1) {
        const dArea = d + ' L' + px(pts[pts.length - 1].x).toFixed(1) + ' ' + (height - PAD.b) + ' L' + px(pts[0].x).toFixed(1) + ' ' + (height - PAD.b) + ' Z';
        svg += '<path d="' + dArea + '" fill="' + (s.color || '#14213D') + '" opacity="0.06"/>';
      }
      svg += '<path d="' + d + '" fill="none" stroke="' + (s.color || '#14213D') + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' + (s.dashed ? ' stroke-dasharray="5 5"' : '') + '/>';
      pts.forEach(p => {
        svg += '<circle cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="3.2" fill="#fff" stroke="' + (s.color || '#14213D') + '" stroke-width="2"><title>' + esc((p.x || '') + ' · ' + fmtY(p.y)) + '</title></circle>';
      });
    });
    /* axes baseline */
    svg += '<line x1="' + PAD.l + '" y1="' + (height - PAD.b) + '" x2="' + (width - PAD.r) + '" y2="' + (height - PAD.b) + '" stroke="#D8DCE5" stroke-width="1"/>';
    svg += '</svg>';
    return svg;
  }

  function legend(series) {
    return '<div class="chart-legend">' + (series || []).map(s =>
      '<span><span class="sw" style="background:' + (s.color || '#14213D') + '"></span>' + esc(s.name || '') + '</span>').join('') + '</div>';
  }

  /* horizontal bars: items [{label, value, color, sub}] */
  function bars(opts) {
    const items = opts.items || [];
    const max = Math.max.apply(null, items.map(i => i.value).concat([1]));
    const width = opts.width || 680;
    const rowH = 34, top = 6;
    const height = top + items.length * rowH + 8;
    let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" class="progress-svg" style="width:100%;height:auto">';
    items.forEach((it, i) => {
      const y = top + i * rowH;
      const bw = Math.max(2, (it.value / max) * (width - 260));
      svg += '<text x="0" y="' + (y + 14) + '" font-size="12.5" fill="#333333">' + esc(it.label) + '</text>';
      svg += '<rect x="180" y="' + (y + 2) + '" width="' + bw.toFixed(1) + '" height="16" rx="8" fill="' + (it.color || '#14213D') + '"/>';
      svg += '<text x="' + (188 + bw) + '" y="' + (y + 14.5) + '" font-size="12" fill="#5A6478">' + esc(it.sub || it.value) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  function sparkline(values, color) {
    const pts = (values || []).filter(isFinite);
    if (pts.length < 2) return '';
    const w = 120, h = 34;
    const min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    const px = i => (i / (pts.length - 1)) * (w - 6) + 3;
    const py = v => (1 - (v - min) / ((max - min) || 1)) * (h - 10) + 5;
    const d = pts.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:120px;height:34px"><path d="' + d + '" fill="none" stroke="' + (color || '#14213D') + '" stroke-width="2" stroke-linecap="round"/><circle cx="' + px(pts.length - 1).toFixed(1) + '" cy="' + py(pts[pts.length - 1]).toFixed(1) + '" r="2.6" fill="' + (color || '#14213D') + '"/></svg>';
  }

  CN.chart = { line, legend, bars, sparkline };
  console.log('NutriClinic charts.js loaded');
})();
