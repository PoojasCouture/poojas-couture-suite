/* ============================================================
   POOJA'S COUTURE — Lightweight Canvas Charts
   Custom, high-DPI responsive canvas-based chart renderers
   ============================================================ */

const Charts = (() => {
  
  // Setup canvas for High-DPI screens
  function setupCanvas(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set display size in CSS pixels
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Set actual size in memory (scaled for DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to ensure all drawing operations are scaled
    ctx.scale(dpr, dpr);
    
    return { ctx, width: rect.width, height: rect.height };
  }

  // ---------- Donut Chart ----------
  // Data: [{ label, value, color }]
  function Donut(canvasId, data, options = {}) {
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { ctx, width, height } = setup;
    const padding = options.padding || 20;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - padding;
    const innerRadius = radius * (options.innerRadiusRatio || 0.6);

    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    if (total === 0) {
      // Draw empty state
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#222230';
      ctx.lineWidth = radius - innerRadius;
      ctx.stroke();
      ctx.font = '12px var(--font-body)';
      ctx.fillStyle = '#6B6780';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data available', centerX, centerY);
      return;
    }

    let startAngle = -0.5 * Math.PI; // Start at 12 o'clock

    data.forEach((item, index) => {
      const sliceAngle = ((item.value || 0) / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius + innerRadius) / 2, startAngle, endAngle);
      ctx.strokeStyle = item.color || Utils.getChartColor(index);
      ctx.lineWidth = radius - innerRadius;
      ctx.lineCap = 'butt';
      ctx.stroke();

      startAngle = endAngle;
    });

    // Draw center text if provided
    if (options.centerText) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Value text
      ctx.font = 'bold 20px var(--font-mono)';
      ctx.fillStyle = options.textColor || '#F5F0EB';
      ctx.fillText(options.centerText.value || '', centerX, centerY - 6);
      
      // Label text
      ctx.font = '10px var(--font-body)';
      ctx.fillStyle = '#6B6780';
      ctx.fillText(options.centerText.label || '', centerX, centerY + 14);
    }
  }

  // ---------- Line Chart ----------
  // Data: { labels: [], datasets: [{ label, data, color }] }
  function Line(canvasId, chartData, options = {}) {
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    const labels = chartData.labels || [];
    const datasets = chartData.datasets || [];
    if (labels.length === 0 || datasets.length === 0) return;

    // Dimensions
    const paddingLeft = options.paddingLeft !== undefined ? options.paddingLeft : 45;
    const paddingRight = options.paddingRight !== undefined ? options.paddingRight : 15;
    const paddingTop = options.paddingTop !== undefined ? options.paddingTop : 20;
    const paddingBottom = options.paddingBottom !== undefined ? options.paddingBottom : 30;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Find min and max Y values
    let minY = 0;
    let maxY = 10;
    datasets.forEach(ds => {
      ds.data.forEach(val => {
        if (val > maxY) maxY = val;
        if (val < minY) minY = val;
      });
    });

    // Make Y axis nice round numbers
    const yGridCount = options.yGridCount || 4;
    const yStep = Math.ceil(maxY / yGridCount);
    maxY = yStep * yGridCount;

    // ---------- Draw Grid & Y Labels ----------
    ctx.font = '10px var(--font-mono)';
    ctx.fillStyle = '#6B6780';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yGridCount; i++) {
      const yVal = minY + (maxY - minY) * (i / yGridCount);
      const yPos = height - paddingBottom - (i / yGridCount) * graphHeight;

      // Grid line
      if (i > 0 && i < yGridCount) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yPos);
        ctx.lineTo(width - paddingRight, yPos);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Y Label
      const displayLabel = options.yFormatter ? options.yFormatter(yVal) : yVal;
      ctx.fillText(displayLabel, paddingLeft - 8, yPos);
    }

    // ---------- Draw X Labels ----------
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStep = graphWidth / (labels.length - 1 || 1);

    labels.forEach((label, i) => {
      const xPos = paddingLeft + i * xStep;
      ctx.fillText(label, xPos, height - paddingBottom + 8);
    });

    // ---------- Draw Data Lines ----------
    datasets.forEach((ds, dsIdx) => {
      const color = ds.color || Utils.getChartColor(dsIdx);
      
      // Gradient for fill underneath
      const fillGradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
      fillGradient.addColorStop(0, color + '25'); // 15% opacity
      fillGradient.addColorStop(1, color + '00'); // 0% opacity

      // Draw fill area first
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const xPos = paddingLeft + i * xStep;
        const yPos = height - paddingBottom - ((val - minY) / (maxY - minY)) * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      });
      // Close path to X-axis
      ctx.lineTo(paddingLeft + (ds.data.length - 1) * xStep, height - paddingBottom);
      ctx.lineTo(paddingLeft, height - paddingBottom);
      ctx.closePath();
      ctx.fillStyle = fillGradient;
      ctx.fill();

      // Draw the main line
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const xPos = paddingLeft + i * xStep;
        const yPos = height - paddingBottom - ((val - minY) / (maxY - minY)) * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          // Curved line
          const prevX = paddingLeft + (i - 1) * xStep;
          const prevY = height - paddingBottom - ((ds.data[i - 1] - minY) / (maxY - minY)) * graphHeight;
          const cpX1 = prevX + (xPos - prevX) / 2;
          const cpY1 = prevY;
          const cpX2 = prevX + (xPos - prevX) / 2;
          const cpY2 = yPos;
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, xPos, yPos);
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw Dots
      ds.data.forEach((val, i) => {
        const xPos = paddingLeft + i * xStep;
        const yPos = height - paddingBottom - ((val - minY) / (maxY - minY)) * graphHeight;
        
        ctx.beginPath();
        ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#16161F';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }

  // ---------- Bar Chart ----------
  // Data: { labels: [], datasets: [{ label, data, color }] }
  function Bar(canvasId, chartData, options = {}) {
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    const labels = chartData.labels || [];
    const datasets = chartData.datasets || [];
    if (labels.length === 0 || datasets.length === 0) return;

    const paddingLeft = options.paddingLeft !== undefined ? options.paddingLeft : 45;
    const paddingRight = options.paddingRight !== undefined ? options.paddingRight : 15;
    const paddingTop = options.paddingTop !== undefined ? options.paddingTop : 20;
    const paddingBottom = options.paddingBottom !== undefined ? options.paddingBottom : 30;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Find max value
    let maxVal = 10;
    datasets.forEach(ds => {
      ds.data.forEach(val => {
        if (val > maxVal) maxVal = val;
      });
    });

    const yGridCount = options.yGridCount || 4;
    const yStep = Math.ceil(maxVal / yGridCount);
    maxVal = yStep * yGridCount;

    // ---------- Draw Y Axis & Grid ----------
    ctx.font = '10px var(--font-mono)';
    ctx.fillStyle = '#6B6780';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yGridCount; i++) {
      const yVal = (maxVal * i) / yGridCount;
      const yPos = height - paddingBottom - (i / yGridCount) * graphHeight;

      if (i > 0 && i < yGridCount) {
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yPos);
        ctx.lineTo(width - paddingRight, yPos);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const displayLabel = options.yFormatter ? options.yFormatter(yVal) : yVal;
      ctx.fillText(displayLabel, paddingLeft - 8, yPos);
    }

    // ---------- Draw X Axis Labels ----------
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const groupCount = labels.length;
    const datasetCount = datasets.length;
    const groupWidth = graphWidth / groupCount;
    const barSpacing = options.barSpacing || 4;
    const totalBarsWidth = groupWidth * 0.7; // Use 70% of group width for bars
    const barWidth = (totalBarsWidth - barSpacing * (datasetCount - 1)) / datasetCount;

    labels.forEach((label, i) => {
      const groupCenterX = paddingLeft + i * groupWidth + groupWidth / 2;
      ctx.fillText(label, groupCenterX, height - paddingBottom + 8);
    });

    // ---------- Draw Bars ----------
    for (let i = 0; i < groupCount; i++) {
      const groupCenterX = paddingLeft + i * groupWidth + groupWidth / 2;
      const groupStartX = groupCenterX - totalBarsWidth / 2;

      datasets.forEach((ds, dsIdx) => {
        const val = ds.data[i] || 0;
        const color = ds.color || Utils.getChartColor(dsIdx);
        const barHeight = (val / maxVal) * graphHeight;
        const barX = groupStartX + dsIdx * (barWidth + barSpacing);
        const barY = height - paddingBottom - barHeight;

        // Draw rounded top bar
        ctx.fillStyle = color;
        const radius = Math.min(barWidth / 2, 4);

        ctx.beginPath();
        ctx.moveTo(barX, barY + radius);
        ctx.arcTo(barX, barY, barX + radius, barY, radius);
        ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + radius, radius);
        ctx.lineTo(barX + barWidth, height - paddingBottom);
        ctx.lineTo(barX, height - paddingBottom);
        ctx.closePath();
        ctx.fill();
      });
    }
  }

  // ---------- Sparkline ----------
  // Data: array of numbers
  function Sparkline(canvasId, data, options = {}) {
    const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    if (data.length <= 1) return;

    const padding = 2;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const xStep = graphWidth / (data.length - 1);
    const color = options.color || '#ECB676';

    // Draw area fill
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * xStep;
      const y = height - padding - ((val - min) / range) * graphHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + (data.length - 1) * xStep, height);
    ctx.lineTo(padding, height);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, color + '20');
    fillGradient.addColorStop(1, color + '00');
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // Draw stroke
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * xStep;
      const y = height - padding - ((val - min) / range) * graphHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return {
    Donut,
    Line,
    Bar,
    Sparkline
  };
})();
