/**
 * dashboard.js — UI logic for the BitBot dashboard.
 *
 * Responsibilities:
 *  - Section switching (nav)
 *  - Lives / hearts rendering
 *  - Avatar initials
 *  - Prácticas: nivel node selection + clase panel
 *
 * Data for niveles is embedded by Django via a <script> block in
 * the template (window.BITBOT_DATA). This keeps template logic in
 * Django and behaviour logic here.
 *
 * Future 3D integration:
 *  scene-prep.js will initialise a Three.js scene inside
 *  #scene-canvas-container (rendered when a nivel is selected).
 *  dashboard.js will call ScenePrep.mount(canvasContainer, nivelData)
 *  after building the panel.
 */

'use strict';

// ── Section switching ─────────────────────────────────────────────
export function switchSection(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const sectionId = btn.dataset.section;
  document.getElementById(sectionId).classList.add('active');

  // Reset prácticas nodos when returning to the section
  if (sectionId === 'practicas') resetNodos();
}

// ── Hearts ────────────────────────────────────────────────────────
export function renderHearts(container, total, current) {
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= current ? ' empty' : '');
    h.textContent = '❤️';
    container.appendChild(h);
  }
}

// ── Avatar initial ────────────────────────────────────────────────
export function setInitial(el, name) {
  if (el) el.textContent = name.charAt(0).toUpperCase();
}

// ── Prácticas — Nodo selection ────────────────────────────────────
const ring  = () => document.getElementById('nodosRing');
const panel = () => document.getElementById('clasePanel');
let activeNodo = null;

export function selectNodo(el) {
  if (activeNodo === el) return;
  activeNodo = el;

  const nodos  = Array.from(ring().querySelectorAll('.nodo'));
  const idx    = nodos.indexOf(el);
  const data   = window.BITBOT_DATA?.niveles?.[idx];
  if (!data) return;

  nodos.forEach((n, i) => {
    n.classList.toggle('selected', i === idx);
    n.classList.toggle('faded',    i !== idx);
  });

  _buildClasePanel(data);

  // Double rAF ensures CSS transition fires after class is applied
  requestAnimationFrame(() =>
    requestAnimationFrame(() => panel().classList.add('visible'))
  );
}

export function resetNodos() {
  const p = panel();
  if (p) p.classList.remove('visible');
  activeNodo = null;
  const nodos = ring()?.querySelectorAll('.nodo');
  if (nodos) nodos.forEach(n => n.classList.remove('selected', 'faded'));
}

function _buildClasePanel(data) {
  const p = panel();
  p.classList.remove('visible');

  // Si la práctica 3D asociada fue completada, todas las clases se marcan como done
  const allDone = data.practica3d && data.practica3dCompletada;

  let html = `
    <button class="clase-back" data-action="reset">← volver</button>
    <span class="clase-nivel-tag ${data.tagClass}">${data.tag}</span>
    <div class="clase-titulo">${data.titulo.replace('\n', '<br>')}</div>
    <div class="clase-list">
  `;

  data.clases.forEach((c, i) => {
    const done       = allDone || c.done;
    const stateClass = done ? 'done' : (c.active ? 'active-c' : '');
    html += `
      ${i > 0 ? '<span class="clase-connector"></span>' : ''}
      <div class="clase-item ${stateClass}">
        <span class="clase-dot"></span>
        <span class="clase-text">${c.text}</span>
        <span class="clase-xp">${c.xp}</span>
      </div>
    `;
  });

  html += `</div>`;

  p.innerHTML = html;

  if (data.practica3d && data.practica3dUrl) {
    // Cada nivel tiene su propio link por URL — no depender de un elemento fijo
    const done = !!data.practica3dCompletada;
    const btn = document.createElement('a');
    btn.href      = data.practica3dUrl;
    btn.className = 'clase-cta' + (done ? ' clase-cta--done' : '');
    btn.style.display = 'block';
    btn.textContent   = done ? '✅ Ir a práctica →' : '⚡ Ir a práctica →';
    p.appendChild(btn);
  }

  p.querySelector('[data-action="reset"]').addEventListener('click', resetNodos);
}
