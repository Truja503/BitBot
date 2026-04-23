// tutorial_manager.js — Step-by-step tutorial flow manager

import { TUTORIAL_STEPS } from './data/tutorial_steps.js';
import { METRICS }        from './data/metrics_data.js';

export class TutorialManager {
  constructor(scene, camera, interaction) {
    this._scene           = scene;
    this._camera          = camera;
    this._interaction     = interaction;
    this._currentStep     = 0;
    this._htmlPanel       = null;
    this._active          = false;
    this._metricsInterval = null;

    this._buildHTMLPanel();
  }

  _buildHTMLPanel() {
    const el = document.createElement('div');
    el.id        = 'tutorial-panel';
    el.className = 'tp-panel';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="tp-header">
        <span class="tp-step-counter" id="tpCounter">Step 1 / ${TUTORIAL_STEPS.length}</span>
        <button class="tp-close" id="tpClose">✕</button>
      </div>
      <div class="tp-content">
        <div class="tp-subtitle" id="tpSubtitle"></div>
        <h2 class="tp-title" id="tpTitle"></h2>
        <p class="tp-body" id="tpBody"></p>
        <div class="tp-extra" id="tpExtra"></div>
      </div>
      <div class="tp-footer">
        <button class="tp-btn tp-prev" id="tpPrev">← Prev</button>
        <div class="tp-dots" id="tpDots"></div>
        <button class="tp-btn tp-next" id="tpNext">Next →</button>
      </div>
    `;
    document.body.appendChild(el);
    this._htmlPanel = el;

    document.getElementById('tpClose').addEventListener('click', () => this.stop());
    document.getElementById('tpPrev').addEventListener('click',  () => this.prev());
    document.getElementById('tpNext').addEventListener('click',  () => this.next());

    window.addEventListener('keydown', e => {
      if (!this._active) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
      if (e.key === 'ArrowLeft')  this.prev();
      if (e.key === 'Escape')     this.stop();
    });
  }

  start(stepIndex = 0) {
    this._active      = true;
    this._currentStep = stepIndex;
    this._htmlPanel.style.display = 'flex';
    this._renderStep();
  }

  stop() {
    this._active = false;
    this._htmlPanel.style.display = 'none';
    if (this._metricsInterval) {
      clearInterval(this._metricsInterval);
      this._metricsInterval = null;
    }
  }

  next() {
    if (this._currentStep < TUTORIAL_STEPS.length - 1) {
      this._currentStep++;
      this._renderStep();
    } else {
      this.stop();
      window.dispatchEvent(new CustomEvent('tutorial:complete'));
    }
  }

  prev() {
    if (this._currentStep > 0) {
      this._currentStep--;
      this._renderStep();
    }
  }

  goToStep(id) {
    const idx = TUTORIAL_STEPS.findIndex(s => s.id === id);
    if (idx !== -1) { this._currentStep = idx; this._renderStep(); }
  }

  _renderStep() {
    const step  = TUTORIAL_STEPS[this._currentStep];
    const total = TUTORIAL_STEPS.length;

    document.getElementById('tpCounter').textContent  = `Step ${this._currentStep + 1} / ${total}`;
    document.getElementById('tpSubtitle').textContent = step.subtitle || '';
    document.getElementById('tpTitle').textContent    = step.title;
    document.getElementById('tpBody').innerHTML       = (step.body || '').replace(/\n/g, '<br>');

    // Dots
    const dotsEl = document.getElementById('tpDots');
    dotsEl.innerHTML = '';
    TUTORIAL_STEPS.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'tp-dot' + (i === this._currentStep ? ' active' : '');
      d.addEventListener('click', () => { this._currentStep = i; this._renderStep(); });
      dotsEl.appendChild(d);
    });

    document.getElementById('tpPrev').disabled        = this._currentStep === 0;
    document.getElementById('tpNext').textContent     = this._currentStep === total - 1 ? 'Finish ✓' : 'Next →';

    // Extra content
    const extraEl = document.getElementById('tpExtra');
    extraEl.innerHTML = '';
    if (this._metricsInterval) { clearInterval(this._metricsInterval); this._metricsInterval = null; }

    if (step.hasForm) {
      extraEl.innerHTML = this._buildSettingsFormHTML();
    } else if (step.hasMetrics) {
      extraEl.innerHTML = this._buildMetricsHTML();
      this._metricsInterval = setInterval(() => {
        METRICS.forEach(m => {
          const el = document.getElementById('metric-val-' + m.id);
          if (el) el.textContent = m.sim();
        });
      }, 2000);
    }

    window.dispatchEvent(new CustomEvent('tutorial:step', {
      detail: { step, index: this._currentStep }
    }));
  }

  _buildSettingsFormHTML() {
    return `
      <div class="tp-form">
        <div class="tp-form-title">⚙️ AxeOS Settings Simulation</div>
        <div class="tp-form-grid">
          <div class="tp-field">
            <label>WiFi SSID</label>
            <input type="text" placeholder="YourNetwork" class="tp-input">
          </div>
          <div class="tp-field">
            <label>WiFi Password</label>
            <input type="password" placeholder="••••••••" class="tp-input">
          </div>
          <div class="tp-field tp-field--full">
            <label>Stratum URL</label>
            <input type="text" placeholder="stratum+tcp://eu.stratum.braiins.com:3333" class="tp-input tp-input--pool" id="stratumInput">
            <span class="tp-hint" id="stratumHint"></span>
          </div>
          <div class="tp-field">
            <label>Stratum Port</label>
            <input type="text" placeholder="3333" class="tp-input" id="portInput">
          </div>
          <div class="tp-field">
            <label>Worker Name</label>
            <input type="text" placeholder="bc1q...wallet.worker1" class="tp-input">
          </div>
          <div class="tp-field">
            <label>Frequency (MHz)</label>
            <input type="number" placeholder="490" min="400" max="600" class="tp-input" value="490">
          </div>
          <div class="tp-field">
            <label>Core Voltage (mV)</label>
            <input type="number" placeholder="1200" min="1100" max="1300" class="tp-input" value="1200">
          </div>
        </div>
        <button class="tp-save-btn" onclick="this.textContent='✅ Saved! (Simulation)'; this.disabled=true">Save &amp; Restart</button>
      </div>
    `;
  }

  _buildMetricsHTML() {
    return `
      <div class="tp-metrics">
        ${METRICS.map(m => `
          <div class="tp-metric-card" title="${m.desc}" style="border-color:${m.color}22">
            <div class="tp-metric-label" style="color:${m.color}">${m.label}</div>
            <div class="tp-metric-val" id="metric-val-${m.id}">${m.sim()}</div>
            <div class="tp-metric-unit">${m.unit}</div>
            <div class="tp-metric-desc">${m.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  isActive()       { return this._active; }
  getCurrentStep() { return TUTORIAL_STEPS[this._currentStep]; }
}
