// Warm Palette High-DPI Canvas Chart Renderer for Wasm Zero-Copy buffers

export class SimulationCharts {
  constructor(convergenceCanvasId, barCanvasId) {
    this.convCanvas = document.getElementById(convergenceCanvasId);
    this.barCanvas = document.getElementById(barCanvasId);
    this.convCtx = this.convCanvas ? this.convCanvas.getContext('2d') : null;
    this.barCtx = this.barCanvas ? this.barCanvas.getContext('2d') : null;

    window.addEventListener('resize', () => {
      this.refreshSize();
    });
  }

  setupCanvas(canvas, ctx) {
    if (!canvas || !ctx) return { w: 0, h: 0 };
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h, dpr };
  }

  refreshSize() {
    if (this.lastConvergenceData) {
      this.drawConvergence(this.lastConvergenceData.stay, this.lastConvergenceData.switch, this.lastConvergenceData.trials);
    }
    if (this.lastBarData) {
      this.drawBars(this.lastBarData);
    }
  }

  drawBars(stats) {
    this.lastBarData = stats;
    if (!this.barCanvas || !this.barCtx) return;
    const { w, h, dpr } = this.setupCanvas(this.barCanvas, this.barCtx);
    if (w === 0 || h === 0) return;

    const ctx = this.barCtx;
    ctx.clearRect(0, 0, w, h);

    const padTop = 32 * dpr;
    const padBottom = 38 * dpr;
    const padX = 48 * dpr;
    const chartH = h - padTop - padBottom;
    const chartW = w - padX * 2;

    const barW = Math.min(84 * dpr, chartW / 3.8);
    const stayX = padX + chartW * 0.28 - barW / 2;
    const switchX = padX + chartW * 0.72 - barW / 2;

    const stayRate = stats.stay_win_rate || 0;
    const switchRate = stats.switch_win_rate || 0;

    const stayBarH = chartH * stayRate;
    const switchBarH = chartH * switchRate;

    // Grid baseline
    ctx.strokeStyle = '#E5DACB';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(padX, padTop + chartH);
    ctx.lineTo(w - padX, padTop + chartH);
    ctx.stroke();

    // 50% line
    const y50 = padTop + chartH * 0.5;
    ctx.strokeStyle = '#D5C8B5';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(padX, y50);
    ctx.lineTo(w - padX, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    // 66.7% line (2/3 target)
    const y66 = padTop + chartH * (1 - 2 / 3);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(padX, y66);
    ctx.lineTo(w - padX, y66);
    ctx.stroke();
    ctx.setLineDash([]);

    // 33.3% line (1/3 target)
    const y33 = padTop + chartH * (1 - 1 / 3);
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(padX, y33);
    ctx.lineTo(w - padX, y33);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stay Bar (Teal #0284C7)
    const gradStay = ctx.createLinearGradient(0, padTop + chartH - stayBarH, 0, padTop + chartH);
    gradStay.addColorStop(0, '#0284C7');
    gradStay.addColorStop(1, '#0369A1');
    ctx.fillStyle = gradStay;
    ctx.beginPath();
    ctx.roundRect(stayX, padTop + chartH - stayBarH, barW, stayBarH, [8 * dpr, 8 * dpr, 0, 0]);
    ctx.fill();

    // Switch Bar (Sage Green #10B981)
    const gradSwitch = ctx.createLinearGradient(0, padTop + chartH - switchBarH, 0, padTop + chartH);
    gradSwitch.addColorStop(0, '#10B981');
    gradSwitch.addColorStop(1, '#059669');
    ctx.fillStyle = gradSwitch;
    ctx.beginPath();
    ctx.roundRect(switchX, padTop + chartH - switchBarH, barW, switchBarH, [8 * dpr, 8 * dpr, 0, 0]);
    ctx.fill();

    // Text Labels
    ctx.textAlign = 'center';

    // Stay Label
    ctx.font = `bold ${13 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#0284C7';
    ctx.fillText(`${(stayRate * 100).toFixed(1)}%`, stayX + barW / 2, padTop + chartH - stayBarH - 8 * dpr);
    ctx.font = `bold ${11 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#586071';
    ctx.fillText('ALWAYS STAY', stayX + barW / 2, padTop + chartH + 18 * dpr);
    ctx.font = `${10 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#8A92A3';
    ctx.fillText(`(${stats.stay_wins || 0} wins)`, stayX + barW / 2, padTop + chartH + 32 * dpr);

    // Switch Label
    ctx.font = `bold ${13 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.fillText(`${(switchRate * 100).toFixed(1)}%`, switchX + barW / 2, padTop + chartH - switchBarH - 8 * dpr);
    ctx.font = `bold ${11 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#586071';
    ctx.fillText('ALWAYS SWITCH', switchX + barW / 2, padTop + chartH + 18 * dpr);
    ctx.font = `${10 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = '#8A92A3';
    ctx.fillText(`(${stats.switch_wins || 0} wins)`, switchX + barW / 2, padTop + chartH + 32 * dpr);
  }

  drawConvergence(stayArray, switchArray, totalTrials) {
    this.lastConvergenceData = { stay: stayArray, switch: switchArray, trials: totalTrials };
    if (!this.convCanvas || !this.convCtx) return;
    const { w, h, dpr } = this.setupCanvas(this.convCanvas, this.convCtx);
    if (w === 0 || h === 0) return;

    const ctx = this.convCtx;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 50 * dpr;
    const padRight = 24 * dpr;
    const padTop = 26 * dpr;
    const padBottom = 32 * dpr;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Grid lines
    const gridY = [0, 0.25, 0.3333, 0.5, 0.6667, 0.75, 1.0];
    ctx.lineWidth = 1 * dpr;
    gridY.forEach(val => {
      const y = padTop + chartH * (1 - val);
      const isTarget = Math.abs(val - 0.3333) < 0.001 || Math.abs(val - 0.6667) < 0.001;

      if (isTarget) {
        ctx.strokeStyle = val > 0.5 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(2, 132, 199, 0.45)';
        ctx.setLineDash([4 * dpr, 4 * dpr]);
      } else {
        ctx.strokeStyle = '#EBE2D5';
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = isTarget ? (val > 0.5 ? '#10B981' : '#0284C7') : '#8A92A3';
      ctx.font = `bold ${9 * dpr}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'right';
      const label = isTarget ? (val > 0.5 ? '2/3 (66.7%)' : '1/3 (33.3%)') : `${Math.round(val * 100)}%`;
      ctx.fillText(label, padLeft - 8 * dpr, y + 3.5 * dpr);
    });
    ctx.setLineDash([]);

    const len = stayArray ? stayArray.length : 0;
    if (len < 2) {
      ctx.fillStyle = '#8A92A3';
      ctx.font = `bold ${12 * dpr}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Click Run to generate live convergence stream', padLeft + chartW / 2, padTop + chartH / 2);
      return;
    }

    const stepX = chartW / (len - 1);

    // Switch line (Sage Green #10B981)
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = padLeft + i * stepX;
      const y = padTop + chartH * (1 - switchArray[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Stay line (Teal #0284C7)
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = padLeft + i * stepX;
      const y = padTop + chartH * (1 - stayArray[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bottom axis labels
    ctx.fillStyle = '#8A92A3';
    ctx.font = `bold ${9 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('1', padLeft, padTop + chartH + 18 * dpr);
    ctx.textAlign = 'center';
    ctx.fillText(`Trials (N = ${(totalTrials || len).toLocaleString()})`, padLeft + chartW / 2, padTop + chartH + 20 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText(`${(totalTrials || len).toLocaleString()}`, padLeft + chartW, padTop + chartH + 18 * dpr);
  }
}
