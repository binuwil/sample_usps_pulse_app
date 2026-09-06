/**
 * USPS Pulse - Data Loader and Processor
 * Handles loading sample PSRA data, CSV parsing/ingestion, roll-up calculations, and export.
 */

export class DataLoader {
  constructor() {
    this.rawData = null;
    this.records = [];
    this.weeks = [];
    this.districts = [];
    this.mailClasses = [];
    this.isLoaded = false;
  }

  async loadInitialData() {
    try {
      const response = await fetch('data/usps_psra_sample.json');
      if (!response.ok) {
        throw new Error(`Failed to load sample data: ${response.statusText}`);
      }
      const data = await response.json();
      this.initFromDataset(data);
      return true;
    } catch (err) {
      console.error("Error loading sample data:", err);
      return false;
    }
  }

  initFromDataset(data) {
    this.rawData = data;
    this.records = data.records || [];
    this.weeks = data.weeks || [];
    this.districts = data.districts || [];
    this.mailClasses = data.mail_classes || [];
    this.isLoaded = true;
  }

  /**
   * Filter records based on current state filters:
   * @param {Object} filters { weekNumber, area, mailClass, stateCode }
   */
  getFilteredRecords(filters = {}) {
    let result = this.records;

    if (filters.weekNumber) {
      result = result.filter(r => r.Postal_Week_Number === Number(filters.weekNumber));
    }

    if (filters.area && filters.area !== 'ALL') {
      result = result.filter(r => r.Area_Name === filters.area);
    }

    if (filters.mailClass && filters.mailClass !== 'ALL') {
      result = result.filter(r => r.Mail_Class_Id === filters.mailClass || r.Mail_Class === filters.mailClass);
    }

    if (filters.stateCode && filters.stateCode !== 'ALL') {
      result = result.filter(r => r.State_Code === filters.stateCode);
    }

    return result;
  }

  /**
   * Calculates KPI summary metrics for given filters.
   */
  calculateKpis(filters = {}) {
    const currentRecords = this.getFilteredRecords(filters);
    if (!currentRecords.length) {
      return {
        onTimePercent: 0,
        wowDelta: 0,
        totalVolume: 0,
        avgDays: 0,
        criticalDisruptions: 0,
        warningDisruptions: 0,
        recordCount: 0
      };
    }

    // Weighted average on-time % by volume
    let totalWeightedPerf = 0;
    let totalVolume = 0;
    let totalWeightedDays = 0;
    let criticalCount = 0;
    let warningCount = 0;

    const uniqueDistDisruptions = new Map();

    for (const r of currentRecords) {
      const vol = r.Total_Volume_Sampled || 1;
      totalWeightedPerf += (r.On_Time_Percent * vol);
      totalWeightedDays += (r.Average_Days_To_Deliver * vol);
      totalVolume += vol;

      // Track disruptions per district/state
      const key = `${r.District_Name}_${r.State_Code}`;
      if (r.Disruption_Status === 'CRITICAL') {
        uniqueDistDisruptions.set(key, 'CRITICAL');
      } else if (r.Disruption_Status === 'WARNING' && uniqueDistDisruptions.get(key) !== 'CRITICAL') {
        uniqueDistDisruptions.set(key, 'WARNING');
      }
    }

    for (const status of uniqueDistDisruptions.values()) {
      if (status === 'CRITICAL') criticalCount++;
      else if (status === 'WARNING') warningCount++;
    }

    const onTimePercent = totalVolume > 0 ? (totalWeightedPerf / totalVolume) : 0;
    const avgDays = totalVolume > 0 ? (totalWeightedDays / totalVolume) : 0;

    // Calculate WoW Delta if prior week is available
    let wowDelta = 0;
    const currentWeek = filters.weekNumber ? Number(filters.weekNumber) : Math.max(...this.weeks.map(w => w.week_number));
    if (currentWeek > 1) {
      const priorFilters = { ...filters, weekNumber: currentWeek - 1 };
      const priorRecords = this.getFilteredRecords(priorFilters);
      let priorWeighted = 0;
      let priorVol = 0;
      for (const r of priorRecords) {
        const v = r.Total_Volume_Sampled || 1;
        priorWeighted += (r.On_Time_Percent * v);
        priorVol += v;
      }
      if (priorVol > 0) {
        const priorAvg = priorWeighted / priorVol;
        wowDelta = onTimePercent - priorAvg;
      }
    }

    return {
      onTimePercent: Math.round(onTimePercent * 10) / 10,
      wowDelta: Math.round(wowDelta * 10) / 10,
      totalVolume,
      avgDays: Math.round(avgDays * 100) / 100,
      criticalDisruptions: criticalCount,
      warningDisruptions: warningCount,
      recordCount: currentRecords.length
    };
  }

  /**
   * Summarizes performance by state for the Map / Cartogram.
   */
  getStatePerformanceSummary(filters = {}) {
    const currentRecords = this.getFilteredRecords(filters);
    const stateMap = new Map();

    for (const r of currentRecords) {
      const state = r.State_Code;
      if (!stateMap.has(state)) {
        stateMap.set(state, {
          stateCode: state,
          stateName: r.State_Name,
          district: r.District_Name,
          area: r.Area_Name,
          totalVol: 0,
          weightedPerf: 0,
          weightedDays: 0,
          worstStatus: 'NORMAL',
          disruptionReasons: new Set(),
          classRecords: []
        });
      }

      const entry = stateMap.get(state);
      const vol = r.Total_Volume_Sampled || 1;
      entry.totalVol += vol;
      entry.weightedPerf += (r.On_Time_Percent * vol);
      entry.weightedDays += (r.Average_Days_To_Deliver * vol);

      if (r.Disruption_Status === 'CRITICAL') {
        entry.worstStatus = 'CRITICAL';
      } else if (r.Disruption_Status === 'WARNING' && entry.worstStatus !== 'CRITICAL') {
        entry.worstStatus = 'WARNING';
      } else if (r.Disruption_Status === 'WATCH' && entry.worstStatus === 'NORMAL') {
        entry.worstStatus = 'WATCH';
      }

      if (r.Disruption_Reason && r.Disruption_Reason !== 'Normal Network Operations') {
        entry.disruptionReasons.add(r.Disruption_Reason);
      }

      entry.classRecords.push(r);
    }

    const summary = {};
    for (const [state, entry] of stateMap.entries()) {
      summary[state] = {
        stateCode: state,
        stateName: entry.stateName,
        district: entry.district,
        area: entry.area,
        onTimePercent: Math.round((entry.weightedPerf / entry.totalVol) * 10) / 10,
        avgDays: Math.round((entry.weightedDays / entry.totalVol) * 100) / 100,
        volume: entry.totalVol,
        status: entry.worstStatus,
        disruptionReason: Array.from(entry.disruptionReasons).join('; ') || 'Normal Network Operations',
        classDetails: entry.classRecords
      };
    }

    return summary;
  }

  /**
   * Get 12-week time-series data for a selected district/state or National
   */
  getTimeSeriesTrajectory(filters = {}) {
    return this.weeks.map(wk => {
      const wkFilters = { ...filters, weekNumber: wk.week_number };
      const records = this.getFilteredRecords(wkFilters);

      let totalWeighted = 0;
      let totalVol = 0;
      for (const r of records) {
        const v = r.Total_Volume_Sampled || 1;
        totalWeighted += (r.On_Time_Percent * v);
        totalVol += v;
      }

      // National baseline for comparison
      const natRecords = this.getFilteredRecords({ weekNumber: wk.week_number, mailClass: filters.mailClass });
      let natWeighted = 0;
      let natVol = 0;
      for (const nr of natRecords) {
        const nv = nr.Total_Volume_Sampled || 1;
        natWeighted += (nr.On_Time_Percent * nv);
        natVol += nv;
      }

      return {
        weekNumber: wk.week_number,
        label: wk.label,
        startDate: wk.start_date,
        onTimePercent: totalVol > 0 ? Math.round((totalWeighted / totalVol) * 10) / 10 : 0,
        nationalBaseline: natVol > 0 ? Math.round((natWeighted / natVol) * 10) / 10 : 0,
        target: 95.0,
        volume: totalVol
      };
    });
  }

  /**
   * Client-side CSV Parser (zero dependency)
   */
  parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Simple regex for CSV row parsing respecting quotes
      const values = [];
      let inQuotes = false;
      let currentVal = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const rowObj = {};
      headers.forEach((h, idx) => {
        let val = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '') : '';
        if (!isNaN(val) && val !== '') {
          val = Number(val);
        }
        rowObj[h] = val;
      });
      rows.push(rowObj);
    }
    return rows;
  }

  /**
   * Ingest user CSV and re-index dataset
   */
  ingestCsv(csvText) {
    try {
      const parsedRows = this.parseCsv(csvText);
      if (!parsedRows.length) throw new Error("No valid records found in CSV");

      // Verify required fields
      const reqFields = ['Postal_Week_Number', 'Area_Name', 'State_Code', 'Mail_Class', 'On_Time_Percent'];
      const sampleRow = parsedRows[0];
      for (const rf of reqFields) {
        if (!(rf in sampleRow)) {
          throw new Error(`Missing expected column: "${rf}"`);
        }
      }

      // Rebuild state
      this.records = parsedRows;
      
      // Extract unique weeks
      const weekNums = Array.from(new Set(parsedRows.map(r => Number(r.Postal_Week_Number)))).sort((a,b) => a-b);
      this.weeks = weekNums.map(wn => {
        const match = parsedRows.find(r => Number(r.Postal_Week_Number) === wn);
        return {
          week_number: wn,
          fiscal_year: match.Fiscal_Year || 2024,
          fiscal_quarter: match.Fiscal_Quarter || 'Q4',
          start_date: match.Week_Start_Date || '',
          end_date: match.Week_End_Date || '',
          label: `Week ${wn}`
        };
      });

      return { success: true, count: parsedRows.length };
    } catch (err) {
      console.error("CSV Ingestion Error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Export current filtered view as CSV
   */
  exportToCsv(filters = {}) {
    const currentRecords = this.getFilteredRecords(filters);
    if (!currentRecords.length) return null;

    const keys = Object.keys(currentRecords[0]);
    const headerRow = keys.join(',');
    const dataRows = currentRecords.map(r => {
      return keys.map(k => {
        let val = r[k];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }
}
