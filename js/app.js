/**
 * USPS Pulse - Main Application Controller
 * Coordinates data flow, user interactions, filters, animations, and renders.
 */

import { DataLoader } from './data_loader.js';
import { MapVisualizer } from './map.js';
import { ChartRenderer } from './charts.js';
import { AnomalyEngine } from './anomaly_engine.js';

class App {
  constructor() {
    this.loader = new DataLoader();
    this.charts = new ChartRenderer();
    this.map = null;
    this.anomalyEngine = null;

    this.state = {
      weekNumber: 1,
      area: 'ALL',
      mailClass: 'ALL',
      selectedState: 'ALL',
      mapView: 'grid', // 'grid' or 'geo'
      activeTab: 'trajectory',
      isPlaying: false,
      playInterval: null
    };
  }

  async init() {
    console.log("Initializing USPS Pulse Dashboard...");

    // Setup map and anomaly engine
    this.map = new MapVisualizer('mapContainer', 'mapTooltip', (stateCode) => {
      this.handleStateSelect(stateCode);
    });
    await this.map.init();

    this.anomalyEngine = new AnomalyEngine('disruptionList', (stateCode) => {
      this.handleStateSelect(stateCode);
    });

    // Load initial sample data
    const success = await this.loader.loadInitialData();
    if (!success) {
      alert("Failed to load initial dataset. Please check console.");
      return;
    }

    // Set initial week to latest or week 1
    this.state.weekNumber = this.loader.weeks.length ? this.loader.weeks[0].week_number : 1;

    this.populateFilterDropdowns();
    this.setupEventListeners();
    this.updateDashboard();
  }

  populateFilterDropdowns() {
    // Populate Area dropdown
    const areaSelect = document.getElementById('areaFilter');
    if (areaSelect) {
      const areas = ['ALL', 'Atlantic', 'Central', 'Southern', 'WestPac'];
      areaSelect.innerHTML = areas.map(a => `<option value="${a}">${a === 'ALL' ? 'All Areas (National)' : a + ' Area'}</option>`).join('');
    }

    // Populate Mail Class dropdown
    const classSelect = document.getElementById('classFilter');
    if (classSelect) {
      let options = `<option value="ALL">All Mail Classes</option>`;
      this.loader.mailClasses.forEach(mc => {
        options += `<option value="${mc.id}">${mc.name}</option>`;
      });
      classSelect.innerHTML = options;
    }

    // Configure timeline slider
    const slider = document.getElementById('timelineSlider');
    if (slider && this.loader.weeks.length) {
      slider.min = 1;
      slider.max = this.loader.weeks.length;
      slider.value = this.state.weekNumber;
    }
  }

  setupEventListeners() {
    // Area Filter
    const areaSelect = document.getElementById('areaFilter');
    areaSelect?.addEventListener('change', (e) => {
      this.state.area = e.target.value;
      this.updateDashboard();
    });

    // Mail Class Filter
    const classSelect = document.getElementById('classFilter');
    classSelect?.addEventListener('change', (e) => {
      this.state.mailClass = e.target.value;
      this.updateDashboard();
    });

    // Timeline Slider
    const slider = document.getElementById('timelineSlider');
    slider?.addEventListener('input', (e) => {
      this.state.weekNumber = Number(e.target.value);
      this.updateDashboard();
    });

    // Play/Pause Timeline Scrubber
    const playBtn = document.getElementById('playTimelineBtn');
    playBtn?.addEventListener('click', () => {
      this.togglePlayTimeline();
    });

    // Reset Filters
    const resetBtn = document.getElementById('resetFiltersBtn');
    resetBtn?.addEventListener('click', () => {
      this.resetFilters();
    });

    // Map View Toggle (Grid vs Geo)
    const btnGrid = document.getElementById('btnViewGrid');
    const btnGeo = document.getElementById('btnViewGeo');

    btnGrid?.addEventListener('click', () => {
      this.state.mapView = 'grid';
      btnGrid.classList.add('active');
      btnGeo?.classList.remove('active');
      this.map.setView('grid');
    });

    btnGeo?.addEventListener('click', () => {
      this.state.mapView = 'geo';
      btnGeo.classList.add('active');
      btnGrid?.classList.remove('active');
      this.map.setView('geo');
    });

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Ingest / Upload Modal controls
    const openIngestBtn = document.getElementById('openIngestModalBtn');
    const closeIngestBtn = document.getElementById('closeIngestModalBtn');
    const modal = document.getElementById('ingestModal');

    openIngestBtn?.addEventListener('click', () => modal?.classList.add('open'));
    closeIngestBtn?.addEventListener('click', () => modal?.classList.remove('open'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // File Drag and Drop / Input
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Export CSV Button
    const exportBtn = document.getElementById('exportCsvBtn');
    exportBtn?.addEventListener('click', () => {
      this.exportFilteredData();
    });

    // Table Search Input
    const tableSearch = document.getElementById('tableSearchInput');
    tableSearch?.addEventListener('input', (e) => {
      this.filterTableData(e.target.value);
    });
  }

  handleStateSelect(stateCode) {
    this.state.selectedState = stateCode;
    const badge = document.getElementById('selectedDistrictBadge');
    if (badge) {
      badge.textContent = stateCode === 'ALL' ? 'Nationwide' : `State / District: ${stateCode}`;
      badge.style.display = stateCode === 'ALL' ? 'none' : 'inline-block';
    }
    this.updateDashboard();
  }

  togglePlayTimeline() {
    const playBtn = document.getElementById('playTimelineBtn');
    if (this.state.isPlaying) {
      clearInterval(this.state.playInterval);
      this.state.isPlaying = false;
      if (playBtn) playBtn.innerHTML = '▶';
    } else {
      this.state.isPlaying = true;
      if (playBtn) playBtn.innerHTML = '⏸';
      this.state.playInterval = setInterval(() => {
        let nextWk = this.state.weekNumber + 1;
        if (nextWk > this.loader.weeks.length) nextWk = 1;
        this.state.weekNumber = nextWk;
        const slider = document.getElementById('timelineSlider');
        if (slider) slider.value = nextWk;
        this.updateDashboard();
      }, 1500);
    }
  }

  resetFilters() {
    this.state.area = 'ALL';
    this.state.mailClass = 'ALL';
    this.state.selectedState = 'ALL';
    
    const areaSelect = document.getElementById('areaFilter');
    if (areaSelect) areaSelect.value = 'ALL';

    const classSelect = document.getElementById('classFilter');
    if (classSelect) classSelect.value = 'ALL';

    const badge = document.getElementById('selectedDistrictBadge');
    if (badge) badge.style.display = 'none';

    this.updateDashboard();
  }

  switchTab(tabId) {
    this.state.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tabContent-${tabId}`);
    });
    this.renderActiveTab();
  }

  handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const res = this.loader.ingestCsv(text);
      if (res.success) {
        alert(`Successfully loaded ${res.count} records from ${file.name}!`);
        document.getElementById('ingestModal')?.classList.remove('open');
        this.state.weekNumber = this.loader.weeks.length ? this.loader.weeks[0].week_number : 1;
        this.populateFilterDropdowns();
        this.updateDashboard();
      } else {
        alert(`Failed to ingest CSV: ${res.error}`);
      }
    };
    reader.readAsText(file);
  }

  exportFilteredData() {
    const csvContent = this.loader.exportToCsv(this.getFilters());
    if (!csvContent) {
      alert("No records to export.");
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usps_pulse_export_wk${this.state.weekNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFilters() {
    return {
      weekNumber: this.state.weekNumber,
      area: this.state.area,
      mailClass: this.state.mailClass,
      stateCode: this.state.selectedState !== 'ALL' ? this.state.selectedState : null
    };
  }

  updateDashboard() {
    const filters = this.getFilters();

    // 1. Update Timeline Label
    const currentWeekObj = this.loader.weeks.find(w => w.week_number === this.state.weekNumber);
    const weekLabelEl = document.getElementById('currentWeekLabel');
    if (weekLabelEl && currentWeekObj) {
      weekLabelEl.textContent = `${currentWeekObj.label} (${currentWeekObj.start_date} to ${currentWeekObj.end_date})`;
    }

    // 2. Calculate and render KPIs
    const kpis = this.loader.calculateKpis(filters);
    this.renderKpis(kpis);

    // 3. Update Map
    const stateSummary = this.loader.getStatePerformanceSummary({
      weekNumber: this.state.weekNumber,
      area: this.state.area,
      mailClass: this.state.mailClass
    });
    this.map.updateData(stateSummary, this.state.selectedState !== 'ALL' ? this.state.selectedState : null);

    // 4. Update Disruption Radar
    this.anomalyEngine.processDisruptions(stateSummary, this.loader.records, this.state.weekNumber);

    // 5. Render Active Tab (Charts / Table)
    this.renderActiveTab();
  }

  renderKpis(kpis) {
    // Composite On-time %
    const onTimeEl = document.getElementById('kpiOnTime');
    const onTimeBar = document.getElementById('kpiOnTimeBar');
    if (onTimeEl) {
      onTimeEl.textContent = `${kpis.onTimePercent}%`;
      const color = kpis.onTimePercent >= 93 ? 'var(--color-healthy)' : (kpis.onTimePercent >= 88 ? 'var(--color-warning)' : 'var(--color-critical)');
      onTimeEl.style.color = color;
      if (onTimeBar) {
        onTimeBar.style.width = `${Math.min(100, Math.max(0, kpis.onTimePercent))}%`;
        onTimeBar.style.backgroundColor = color;
      }
    }

    // WoW Delta
    const deltaEl = document.getElementById('kpiDelta');
    if (deltaEl) {
      const isUp = kpis.wowDelta >= 0;
      deltaEl.textContent = `${isUp ? '+' : ''}${kpis.wowDelta}% WoW`;
      deltaEl.className = `kpi-delta ${isUp ? 'delta-up' : 'delta-down'}`;
    }

    // Active Disruptions
    const disruptEl = document.getElementById('kpiDisruptions');
    if (disruptEl) {
      disruptEl.textContent = `${kpis.criticalDisruptions}`;
      disruptEl.style.color = kpis.criticalDisruptions > 0 ? 'var(--color-critical)' : 'var(--color-healthy)';
    }

    // Total Volume Sampled
    const volEl = document.getElementById('kpiVolume');
    if (volEl) {
      volEl.textContent = `${(kpis.totalVolume / 1000000).toFixed(1)}M`;
    }

    // Avg Transit Days
    const daysEl = document.getElementById('kpiDays');
    if (daysEl) {
      daysEl.textContent = `${kpis.avgDays}d`;
    }
  }

  renderActiveTab() {
    const filters = this.getFilters();

    if (this.state.activeTab === 'trajectory') {
      const trajectoryData = this.loader.getTimeSeriesTrajectory({
        area: this.state.area,
        mailClass: this.state.mailClass,
        stateCode: this.state.selectedState !== 'ALL' ? this.state.selectedState : null
      });
      const label = this.state.selectedState !== 'ALL' ? `State: ${this.state.selectedState}` : (this.state.area !== 'ALL' ? `${this.state.area} Area` : 'National Trend');
      this.charts.renderTimeSeries('trajectoryChartContainer', trajectoryData, label);
    } 
    else if (this.state.activeTab === 'classes') {
      const currentRecords = this.loader.getFilteredRecords({
        weekNumber: this.state.weekNumber,
        area: this.state.area,
        stateCode: this.state.selectedState !== 'ALL' ? this.state.selectedState : null
      });
      this.charts.renderMailClassMatrix('classChartContainer', currentRecords);
    } 
    else if (this.state.activeTab === 'rankings') {
      const stateSummary = this.loader.getStatePerformanceSummary({
        weekNumber: this.state.weekNumber,
        area: this.state.area,
        mailClass: this.state.mailClass
      });
      this.charts.renderDistrictRankings('rankingsContainer', Object.values(stateSummary));
    } 
    else if (this.state.activeTab === 'table') {
      this.renderDataTable();
    }
  }

  renderDataTable(filterQuery = '') {
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) return;

    const stateSummary = this.loader.getStatePerformanceSummary({
      weekNumber: this.state.weekNumber,
      area: this.state.area,
      mailClass: this.state.mailClass
    });

    let list = Object.values(stateSummary);
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      list = list.filter(item => 
        item.stateCode.toLowerCase().includes(q) ||
        item.stateName.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.disruptionReason.toLowerCase().includes(q)
      );
    }

    // Sort by on-time percent ascending (worst first to spot bottlenecks)
    list.sort((a, b) => a.onTimePercent - b.onTimePercent);

    tableBody.innerHTML = list.map(item => {
      const statusPillClass = item.status === 'CRITICAL' ? 'badge-critical' : (item.status === 'WARNING' ? 'badge-warning' : 'badge-watch');
      return `
        <tr style="cursor: pointer;" onclick="window.__uspsApp.handleStateSelect('${item.stateCode}')">
          <td style="font-weight: bold; color: var(--usps-blue-light);">${item.stateCode}</td>
          <td>${item.stateName}</td>
          <td>${item.district}</td>
          <td>${item.area}</td>
          <td style="font-family: monospace; font-weight: bold; color: ${item.onTimePercent >= 93 ? 'var(--color-healthy)' : (item.onTimePercent >= 88 ? 'var(--color-warning)' : 'var(--color-critical)')};">
            ${item.onTimePercent}%
          </td>
          <td style="font-family: monospace;">${item.avgDays} days</td>
          <td style="font-family: monospace;">${(item.volume || 0).toLocaleString()}</td>
          <td><span class="status-pill ${statusPillClass}">${item.status}</span></td>
          <td style="font-size: 0.72rem; color: var(--text-dim); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${item.disruptionReason}
          </td>
        </tr>
      `;
    }).join('');
  }

  filterTableData(query) {
    this.renderDataTable(query);
  }
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.__uspsApp = app;
  app.init();
});
