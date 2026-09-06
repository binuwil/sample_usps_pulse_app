/**
 * USPS Pulse - Anomaly & Disruption Detection Engine
 * Analyzes performance deviations, detects acute bottlenecks, and populates the Disruption Radar.
 */

export class AnomalyEngine {
  constructor(radarContainerId, onIncidentClick) {
    this.container = document.getElementById(radarContainerId);
    this.onIncidentClick = onIncidentClick;
  }

  /**
   * Detects operational disruptions and renders the Disruption Radar cards.
   */
  processDisruptions(stateSummaries, allRecords, currentWeekNum) {
    if (!this.container) return;
    this.container.innerHTML = '';

    const disruptions = [];

    Object.values(stateSummaries).forEach(summary => {
      // Condition 1: Tagged Critical in data (e.g. RPDC or facility modernization delay)
      if (summary.status === 'CRITICAL') {
        disruptions.push({
          stateCode: summary.stateCode,
          stateName: summary.stateName,
          district: summary.district,
          area: summary.area,
          severity: 'critical',
          onTimePercent: summary.onTimePercent,
          reason: summary.disruptionReason || 'Severe Processing Bottleneck',
          impact: 'High Impact (>10% drop vs target)'
        });
      }
      // Condition 2: Warning Status or On-Time < 89%
      else if (summary.status === 'WARNING' || summary.onTimePercent < 89.0) {
        disruptions.push({
          stateCode: summary.stateCode,
          stateName: summary.stateName,
          district: summary.district,
          area: summary.area,
          severity: 'warning',
          onTimePercent: summary.onTimePercent,
          reason: summary.disruptionReason || 'Elevated Transit Delay',
          impact: 'Moderate Delay (>5% drop)'
        });
      }
      // Condition 3: Watch status
      else if (summary.status === 'WATCH' || summary.onTimePercent < 91.5) {
        disruptions.push({
          stateCode: summary.stateCode,
          stateName: summary.stateName,
          district: summary.district,
          area: summary.area,
          severity: 'watch',
          onTimePercent: summary.onTimePercent,
          reason: summary.disruptionReason || 'Regional Dispatch Advisory',
          impact: 'Minor Anomaly'
        });
      }
    });

    // Sort: Critical first, then Warning, then by lowest on-time %
    const severityOrder = { critical: 1, warning: 2, watch: 3 };
    disruptions.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.onTimePercent - b.onTimePercent;
    });

    if (!disruptions.length) {
      this.container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✅</div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-healthy);">Network Stable</div>
          <div style="font-size: 0.75rem;">No acute bottlenecks detected in this reporting window.</div>
        </div>
      `;
      return;
    }

    disruptions.forEach(item => {
      const card = document.createElement('div');
      card.className = `disruption-card ${item.severity}`;
      card.setAttribute('data-state', item.stateCode);

      const badgeClass = item.severity === 'critical' ? 'badge-critical' : (item.severity === 'warning' ? 'badge-warning' : 'badge-watch');
      const badgeText = item.severity.toUpperCase();

      card.innerHTML = `
        <div class="disruption-header">
          <span class="disruption-district">${item.stateName} (${item.stateCode})</span>
          <span class="badge-severity ${badgeClass}">${badgeText}</span>
        </div>
        <div class="disruption-reason">
          ${item.reason}
        </div>
        <div class="disruption-metrics-row">
          <span>District: <b>${item.district}</b></span>
          <span>On-Time: <b style="color: ${item.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)'}">${item.onTimePercent}%</b></span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.onIncidentClick) {
          this.onIncidentClick(item.stateCode);
        }
      });

      this.container.appendChild(card);
    });
  }
}
