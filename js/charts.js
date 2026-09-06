/**
 * USPS Pulse - Zero-Dependency Responsive SVG Charting Engine
 * Renders time-series trajectories, multi-class performance matrices, and district benchmarks.
 */

export class ChartRenderer {
  constructor() {
    this.svgNS = "http://www.w3.org/2000/svg";
  }

  /**
   * Renders the 12-week time series trendline with federal target reference lines.
   */
  renderTimeSeries(containerId, dataPoints, selectedLabel = "Selected District") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!dataPoints || !dataPoints.length) {
      container.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:var(--text-dim);">No data available</div>';
      return;
    }

    const width = container.clientWidth || 700;
    const height = 300;
    const padLeft = 45;
    const padRight = 35;
    const padTop = 25;
    const padBottom = 35;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Determine Y scale (60% to 100%)
    const minY = 65;
    const maxY = 100;
    const scaleY = (val) => padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;
    const scaleX = (idx) => padLeft + (idx / (dataPoints.length - 1)) * plotW;

    const svg = document.createElementNS(this.svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Y Axis Grid lines & labels
    [70, 80, 90, 95, 100].forEach(tick => {
      const y = scaleY(tick);
      const line = document.createElementNS(this.svgNS, "line");
      line.setAttribute("x1", padLeft);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width - padRight);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", tick === 95 ? "rgba(245, 158, 11, 0.45)" : "rgba(255, 255, 255, 0.08)");
      line.setAttribute("stroke-width", tick === 95 ? "1.5" : "1");
      if (tick === 95) line.setAttribute("stroke-dasharray", "4 4");
      svg.appendChild(line);

      const text = document.createElementNS(this.svgNS, "text");
      text.setAttribute("x", padLeft - 8);
      text.setAttribute("y", y + 4);
      text.setAttribute("text-anchor", "end");
      text.setAttribute("fill", tick === 95 ? "#f59e0b" : "var(--text-dim)");
      text.setAttribute("font-size", "10");
      text.setAttribute("font-family", "monospace");
      text.textContent = tick === 95 ? "95% Target" : `${tick}%`;
      svg.appendChild(text);
    });

    // X Axis Labels
    dataPoints.forEach((pt, idx) => {
      if (idx % 2 === 0 || idx === dataPoints.length - 1) {
        const x = scaleX(idx);
        const text = document.createElementNS(this.svgNS, "text");
        text.setAttribute("x", x);
        text.setAttribute("y", height - 10);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--text-muted)");
        text.setAttribute("font-size", "10");
        text.textContent = `Wk ${pt.weekNumber}`;
        svg.appendChild(text);
      }
    });

    // National Baseline Line (Dotted Slate)
    let natPathD = "";
    dataPoints.forEach((pt, idx) => {
      const x = scaleX(idx);
      const y = scaleY(pt.nationalBaseline);
      natPathD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    });
    const natPath = document.createElementNS(this.svgNS, "path");
    natPath.setAttribute("d", natPathD);
    natPath.setAttribute("fill", "none");
    natPath.setAttribute("stroke", "#94a3b8");
    natPath.setAttribute("stroke-width", "1.5");
    natPath.setAttribute("stroke-dasharray", "3 3");
    svg.appendChild(natPath);

    // Selected Entity Area Fill (Gradient)
    const defs = document.createElementNS(this.svgNS, "defs");
    const grad = document.createElementNS(this.svgNS, "linearGradient");
    grad.setAttribute("id", "trendGrad");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");
    grad.innerHTML = `
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
    `;
    defs.appendChild(grad);
    svg.appendChild(defs);

    let areaD = "";
    let lineD = "";
    dataPoints.forEach((pt, idx) => {
      const x = scaleX(idx);
      const y = scaleY(pt.onTimePercent);
      lineD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
      areaD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    });
    const lastX = scaleX(dataPoints.length - 1);
    const firstX = scaleX(0);
    const baseY = scaleY(minY);
    areaD += ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    const areaPath = document.createElementNS(this.svgNS, "path");
    areaPath.setAttribute("d", areaD);
    areaPath.setAttribute("fill", "url(#trendGrad)");
    svg.appendChild(areaPath);

    // Selected Entity Trendline
    const linePath = document.createElementNS(this.svgNS, "path");
    linePath.setAttribute("d", lineD);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "#3b82f6");
    linePath.setAttribute("stroke-width", "2.5");
    svg.appendChild(linePath);

    // Data Points & Hover
    dataPoints.forEach((pt, idx) => {
      const x = scaleX(idx);
      const y = scaleY(pt.onTimePercent);

      const circle = document.createElementNS(this.svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", pt.onTimePercent >= 93 ? "#10b981" : (pt.onTimePercent >= 88 ? "#f59e0b" : "#ef4444"));
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "1.5");
      circle.style.cursor = "pointer";

      // Hover tooltip on points
      const title = document.createElementNS(this.svgNS, "title");
      title.textContent = `Week ${pt.weekNumber}: ${pt.onTimePercent}% (National: ${pt.nationalBaseline}%)`;
      circle.appendChild(title);

      svg.appendChild(circle);
    });

    container.appendChild(svg);
  }

  /**
   * Renders the Mail Class Comparison Matrix bar chart.
   */
  renderMailClassMatrix(containerId, classRecords) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!classRecords || !classRecords.length) {
      container.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:var(--text-dim);">No class breakdown available</div>';
      return;
    }

    // Aggregate by Mail Class
    const classMap = new Map();
    classRecords.forEach(r => {
      const key = r.Mail_Class;
      if (!classMap.has(key)) {
        classMap.set(key, {
          name: key,
          target: r.Service_Standard_Target || 95,
          totalVol: 0,
          weightedPerf: 0,
          avgDays: 0
        });
      }
      const entry = classMap.get(key);
      const vol = r.Total_Volume_Sampled || 1;
      entry.totalVol += vol;
      entry.weightedPerf += (r.On_Time_Percent * vol);
      entry.avgDays += (r.Average_Days_To_Deliver * vol);
    });

    const items = Array.from(classMap.values()).map(e => ({
      name: e.name,
      target: e.target,
      onTime: Math.round((e.weightedPerf / e.totalVol) * 10) / 10,
      avgDays: Math.round((e.avgDays / e.totalVol) * 10) / 10,
      volume: e.totalVol
    }));

    const width = container.clientWidth || 700;
    const barHeight = 36;
    const gap = 16;
    const padLeft = 210;
    const padRight = 80;
    const height = items.length * (barHeight + gap) + 40;

    const svg = document.createElementNS(this.svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    const barMaxWidth = width - padLeft - padRight;

    items.forEach((item, idx) => {
      const y = idx * (barHeight + gap) + 15;
      const barW = (item.onTime / 100) * barMaxWidth;
      const targetX = padLeft + (item.target / 100) * barMaxWidth;

      // Class Label
      const label = document.createElementNS(this.svgNS, "text");
      label.setAttribute("x", padLeft - 12);
      label.setAttribute("y", y + barHeight / 2 + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("fill", "var(--text-main)");
      label.setAttribute("font-size", "11");
      label.setAttribute("font-weight", "500");
      label.textContent = item.name;
      svg.appendChild(label);

      // Background Track
      const bgBar = document.createElementNS(this.svgNS, "rect");
      bgBar.setAttribute("x", padLeft);
      bgBar.setAttribute("y", y);
      bgBar.setAttribute("width", barMaxWidth);
      bgBar.setAttribute("height", barHeight);
      bgBar.setAttribute("rx", "6");
      bgBar.setAttribute("fill", "#1f2937");
      svg.appendChild(bgBar);

      // Value Fill Bar
      const color = item.onTime >= item.target ? "#10b981" : (item.onTime >= (item.target - 5) ? "#f59e0b" : "#ef4444");
      const fillBar = document.createElementNS(this.svgNS, "rect");
      fillBar.setAttribute("x", padLeft);
      fillBar.setAttribute("y", y);
      fillBar.setAttribute("width", barW);
      fillBar.setAttribute("height", barHeight);
      fillBar.setAttribute("rx", "6");
      fillBar.setAttribute("fill", color);
      svg.appendChild(fillBar);

      // Target Marker Line
      const targetLine = document.createElementNS(this.svgNS, "line");
      targetLine.setAttribute("x1", targetX);
      targetLine.setAttribute("y1", y - 2);
      targetLine.setAttribute("x2", targetX);
      targetLine.setAttribute("y2", y + barHeight + 2);
      targetLine.setAttribute("stroke", "#ffffff");
      targetLine.setAttribute("stroke-width", "2");
      targetLine.setAttribute("stroke-dasharray", "3 2");
      svg.appendChild(targetLine);

      // Value Text
      const valText = document.createElementNS(this.svgNS, "text");
      valText.setAttribute("x", padLeft + barW + 10);
      valText.setAttribute("y", y + barHeight / 2 + 4);
      valText.setAttribute("fill", "#ffffff");
      valText.setAttribute("font-size", "12");
      valText.setAttribute("font-weight", "bold");
      valText.setAttribute("font-family", "monospace");
      valText.textContent = `${item.onTime}%`;
      svg.appendChild(valText);
    });

    container.appendChild(svg);
  }

  /**
   * Renders the comparative district rankings.
   */
  renderDistrictRankings(containerId, districtList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!districtList || !districtList.length) {
      container.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:var(--text-dim);">No district data available</div>';
      return;
    }

    // Sort by on-time percent descending
    const sorted = [...districtList].sort((a,b) => b.onTimePercent - a.onTimePercent);
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5).reverse();

    let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 0.5rem 0;">
        <div>
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--color-healthy); margin-bottom: 0.75rem; text-transform: uppercase;">
            🏆 Top 5 Performing Districts
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${top5.map((d, i) => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); padding: 0.5rem 0.75rem; border-radius: 6px;">
                <span style="font-size: 0.8rem; font-weight: 600;">#${i+1} ${d.stateName} (${d.district})</span>
                <span style="font-family: monospace; font-weight: bold; color: var(--color-healthy);">${d.onTimePercent}%</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--color-critical); margin-bottom: 0.75rem; text-transform: uppercase;">
            ⚠️ Most Disrupted Districts (Bottlenecks)
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${bottom5.map((d, i) => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2); padding: 0.5rem 0.75rem; border-radius: 6px;">
                <span style="font-size: 0.8rem; font-weight: 600;">${d.stateName} (${d.district})</span>
                <span style="font-family: monospace; font-weight: bold; color: var(--color-critical);">${d.onTimePercent}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}
