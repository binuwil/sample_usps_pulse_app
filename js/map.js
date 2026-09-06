/**
 * USPS Pulse - Interactive Map Visualizer
 * Supports Tile Grid Cartogram and Regional Geographic Map views with dynamic choropleth color scales.
 */

export class MapVisualizer {
  constructor(containerId, tooltipId, onSelectCallback) {
    this.container = document.getElementById(containerId);
    this.tooltip = document.getElementById(tooltipId);
    this.onSelectState = onSelectCallback;
    this.currentView = 'grid'; // 'grid' or 'geo'
    this.stateData = {};
    this.selectedState = null;
    this.gridPositions = [];
  }

  async init() {
    try {
      const res = await fetch('data/state_grid.json');
      this.gridPositions = await res.json();
    } catch (e) {
      console.warn("Could not load state_grid.json, using fallback", e);
      this.gridPositions = this.getFallbackGrid();
    }
  }

  updateData(stateSummary, selectedState = null) {
    this.stateData = stateSummary || {};
    this.selectedState = selectedState;
    this.render();
  }

  setView(viewType) {
    this.currentView = viewType;
    this.render();
  }

  getColor(onTimePercent) {
    if (onTimePercent === undefined || onTimePercent === null) return '#374151'; // no data
    if (onTimePercent >= 93.0) return 'var(--color-healthy)';   // #10b981
    if (onTimePercent >= 88.0) return 'var(--color-warning)';   // #f59e0b
    return 'var(--color-critical)';                              // #ef4444
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (this.currentView === 'grid') {
      this.renderTileGrid();
    } else {
      this.renderRegionalGeoMap();
    }
  }

  renderTileGrid() {
    const gridEl = document.createElement('div');
    gridEl.className = 'tile-grid-container';

    // 12 columns x 8 rows = 96 grid cells
    const cellMap = new Map();
    this.gridPositions.forEach(item => {
      const key = `${item.row}_${item.col}`;
      cellMap.set(key, item.code);
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 12; c++) {
        const key = `${r}_${c}`;
        const stateCode = cellMap.get(key);

        if (stateCode) {
          const sData = this.stateData[stateCode] || {
            stateCode,
            stateName: stateCode,
            district: 'N/A',
            area: 'Unknown',
            onTimePercent: 0,
            avgDays: 0,
            status: 'NORMAL',
            volume: 0
          };

          const tile = document.createElement('div');
          tile.className = `state-tile ${this.selectedState === stateCode ? 'selected' : ''}`;
          tile.setAttribute('data-state', stateCode);

          const color = this.getColor(sData.onTimePercent);
          tile.style.backgroundColor = `${color}20`; // 20% opacity bg
          tile.style.borderColor = `${color}80`;

          // Inner content
          tile.innerHTML = `
            <span class="tile-code" style="color: ${color}">${stateCode}</span>
            <span class="tile-val">${sData.onTimePercent ? sData.onTimePercent + '%' : '-'}</span>
            ${sData.status === 'CRITICAL' ? '<span class="disrupting-dot" style="position: absolute; top: 4px; right: 4px;"></span>' : ''}
          `;

          tile.addEventListener('mouseenter', (e) => this.showTooltip(e, sData));
          tile.addEventListener('mousemove', (e) => this.moveTooltip(e));
          tile.addEventListener('mouseleave', () => this.hideTooltip());
          tile.addEventListener('click', () => {
            if (this.selectedState === stateCode) {
              this.onSelectState('ALL');
            } else {
              this.onSelectState(stateCode);
            }
          });

          gridEl.appendChild(tile);
        } else {
          // Empty placeholder slot
          const emptySlot = document.createElement('div');
          emptySlot.style.visibility = 'hidden';
          gridEl.appendChild(emptySlot);
        }
      }
    }

    this.container.appendChild(gridEl);
  }

  renderRegionalGeoMap() {
    // Interactive SVG Regional & Area Map
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 960 550");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.maxWidth = "850px";

    // Draw 4 USPS Regional Area zones with background shading
    const areas = [
      { name: "WestPac", x: 40, y: 50, w: 260, h: 420, label: "WestPac Area", color: "#3b82f6" },
      { name: "Central", x: 320, y: 50, w: 240, h: 420, label: "Central Area", color: "#10b981" },
      { name: "Southern", x: 580, y: 240, w: 340, h: 230, label: "Southern Area", color: "#f59e0b" },
      { name: "Atlantic", x: 580, y: 50, w: 340, h: 170, label: "Atlantic Area", color: "#8b5cf6" },
    ];

    areas.forEach(a => {
      const g = document.createElementNS(svgNS, "g");
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", a.x);
      rect.setAttribute("y", a.y);
      rect.setAttribute("width", a.w);
      rect.setAttribute("height", a.h);
      rect.setAttribute("rx", "12");
      rect.setAttribute("fill", `${a.color}08`);
      rect.setAttribute("stroke", `${a.color}30`);
      rect.setAttribute("stroke-width", "1.5");
      rect.setAttribute("stroke-dasharray", "4 4");

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", a.x + 14);
      text.setAttribute("y", a.y + 24);
      text.setAttribute("fill", a.color);
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("letter-spacing", "0.05em");
      text.textContent = a.label.toUpperCase();

      g.appendChild(rect);
      g.appendChild(text);
      svg.appendChild(g);
    });

    // Plot states as interactive geographic nodes positioned relative to US geography
    Object.keys(this.stateData).forEach(stateCode => {
      const sData = this.stateData[stateCode];
      // Convert lat/lon to approximate SVG coordinate
      // Contiguous US: Lat 24-50 -> Y 480-80, Lon -125 to -67 -> X 60-900
      let x = ((-sData.classDetails?.[0]?.Longitude || -98) - (-125)) / (125 - 67) * 780 + 80;
      let y = (50 - (sData.classDetails?.[0]?.Latitude || 39)) / (50 - 24) * 380 + 70;

      // Special placement for AK, HI, PR
      if (stateCode === 'AK') { x = 90; y = 430; }
      else if (stateCode === 'HI') { x = 200; y = 450; }
      else if (stateCode === 'PR') { x = 860; y = 450; }

      const color = this.getColor(sData.onTimePercent);
      const isSelected = this.selectedState === stateCode;

      const nodeG = document.createElementNS(svgNS, "g");
      nodeG.style.cursor = "pointer";

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", isSelected ? "18" : "14");
      circle.setAttribute("fill", `${color}30`);
      circle.setAttribute("stroke", isSelected ? "#ffffff" : color);
      circle.setAttribute("stroke-width", isSelected ? "2.5" : "1.5");

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#ffffff");
      label.setAttribute("font-size", "10");
      label.setAttribute("font-weight", "bold");
      label.textContent = stateCode;

      nodeG.appendChild(circle);
      nodeG.appendChild(label);

      nodeG.addEventListener('mouseenter', (e) => this.showTooltip(e, sData));
      nodeG.addEventListener('mousemove', (e) => this.moveTooltip(e));
      nodeG.addEventListener('mouseleave', () => this.hideTooltip());
      nodeG.addEventListener('click', () => {
        if (this.selectedState === stateCode) {
          this.onSelectState('ALL');
        } else {
          this.onSelectState(stateCode);
        }
      });

      svg.appendChild(nodeG);
    });

    this.container.appendChild(svg);
  }

  showTooltip(e, sData) {
    if (!this.tooltip) return;
    const color = this.getColor(sData.onTimePercent);
    const statusPill = sData.status === 'CRITICAL'
      ? `<span class="badge-severity badge-critical">CRITICAL</span>`
      : sData.status === 'WARNING'
      ? `<span class="badge-severity badge-warning">WARNING</span>`
      : `<span class="badge-severity badge-watch" style="color:#10b981;background:rgba(16,185,129,0.15)">HEALTHY</span>`;

    this.tooltip.innerHTML = `
      <div class="tooltip-title">
        <span>${sData.stateName} (${sData.stateCode})</span>
        ${statusPill}
      </div>
      <div class="tooltip-row">
        <span>District:</span>
        <span class="tooltip-val">${sData.district}</span>
      </div>
      <div class="tooltip-row">
        <span>Postal Area:</span>
        <span class="tooltip-val">${sData.area}</span>
      </div>
      <div class="tooltip-row">
        <span>On-Time Rate:</span>
        <span class="tooltip-val" style="color: ${color}">${sData.onTimePercent}%</span>
      </div>
      <div class="tooltip-row">
        <span>Avg Transit:</span>
        <span class="tooltip-val">${sData.avgDays} days</span>
      </div>
      <div class="tooltip-row">
        <span>Volume Sampled:</span>
        <span class="tooltip-val">${(sData.volume || 0).toLocaleString()}</span>
      </div>
      ${sData.disruptionReason && sData.disruptionReason !== 'Normal Network Operations' ? `
        <div style="margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed rgba(255,255,255,0.15); font-size: 0.72rem; color: #fca5a5;">
          ⚠️ ${sData.disruptionReason}
        </div>
      ` : ''}
    `;

    this.tooltip.classList.add('visible');
    this.moveTooltip(e);
  }

  moveTooltip(e) {
    if (!this.tooltip) return;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.classList.remove('visible');
  }

  getFallbackGrid() {
    return [
      {"code": "WA", "row": 1, "col": 1},
      {"code": "CA", "row": 3, "col": 1},
      {"code": "NY", "row": 2, "col": 9},
      {"code": "TX", "row": 6, "col": 4},
      {"code": "FL", "row": 6, "col": 8},
      {"code": "GA", "row": 5, "col": 8}
    ];
  }
}
