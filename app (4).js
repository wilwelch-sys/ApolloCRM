// ── Apollo Flooring CRM ── app.js ──────────────────────────────────────────
'use strict';

// ── Constants ───────────────────────────────────────────────────────────────
const SK = 'apollo-crm-v1';
const GSHEET_ID = '1emlfQUVl7qv5-2RO_tV6vLxbUnYUcCn7XqBtx1hL8F4'; // Your Google Sheet ID

// Sample Apollo Flooring Pricing Data (from Moxie Distribution - MXD10050)
const APOLLO_FLOORING_PRICING = [
  {service: "Moxie/Happy Feet Alehouse — 26.00 SF/ctn · 1,430.00 SF/plt", price: "$5.32/SF"},
  {service: "Moxie/Happy Feet All Star — 7.36x48.3in · 2mm · 100% Virgin Vinyl · 49.40 SF/ctn · 2,964.00 SF/plt", price: "$0.89/SF"},
  {service: "Moxie/Happy Feet All Star II — 7x48in · 2mm · 100% Virgin PVC · 51.39 SF/ctn · 3,597.30 SF/plt", price: "$0.89/SF"},
  {service: "Moxie/Happy Feet Ambitious — 7x48in · 2mm · 51.39 SF/ctn · 3,083.40 SF/plt", price: "$0.89/SF"},
  {service: "Moxie/Happy Feet Arrival 10 — 7.68x47.83in · 10mm · 25.50 SF/ctn · 1,147.50 SF/plt", price: "$1.49/SF"},
  {service: "Moxie/Happy Feet Aspen — 9x60in · 8mm SPC · 23.39 SF/ctn · 1,029.16 SF/plt", price: "$2.85/SF"},
  {service: "Moxie/Happy Feet Atlas — 7x48in · 4.5mm · 25.72 SF/ctn · 1,543.20 SF/plt", price: "$1.89/SF"},
  {service: "Moxie/Happy Feet Blockbuster Plus — 7x48in · 4.5mm · 23.64 SF/ctn · 1,773.00 SF/plt", price: "$1.39/SF"},
  {service: "Moxie/Happy Feet Broadway — 7.2x60in · 5mm · 24.00 SF/ctn · 1,800.00 SF/plt", price: "$1.79/SF"},
  {service: "Moxie/Happy Feet Bronco — 7x60in · 5mm · 29.94 SF/ctn · 1,497.00 SF/plt", price: "$1.39/SF"},
  {service: "Moxie/Happy Feet Built-Rite — 8.98x63in · 6.5mm · 19.63 SF/ctn · 1,177.80 SF/plt", price: "$2.59/SF"},
  {service: "Moxie/Happy Feet Built-Rite II — 8.98x63in · 6.5mm · 19.63 SF/ctn · 1,177.80 SF/plt", price: "$2.59/SF"},
  {service: "Moxie/Happy Feet Cascade — 2.5mm · 39.50 SF/ctn · 2,370.00 SF/plt", price: "$1.25/SF"},
  {service: "Moxie/Happy Feet Countryside Oak — 43.00 SF/ctn · 1,935.00 SF/plt", price: "$3.45/SF"},
  {service: "Moxie/Happy Feet Decathlon — 7x48in · 2mm · 51.39 SF/ctn · 3,083.40 SF/plt", price: "$0.89/SF"},
  {service: "Moxie/Happy Feet Dynamic Fit — 9x60in · 5mm · 26.25 SF/ctn · 1,365.00 SF/plt", price: "$2.79/SF"},
  {service: "Moxie/Happy Feet Dynamic Stick — 9x60in · 3mm · 45.00 SF/ctn · 2,160.00 SF/plt", price: "$1.79/SF"},
  {service: "Moxie/Happy Feet Dynamite — 7x48in · 5mm · 21.27 SF/ctn · 1,488.90 SF/plt", price: "$1.99/SF"},
  {service: "Moxie/Happy Feet Dynamite Plus — 7.25x48in · 6.2mm · 28.70 SF/ctn · 1,435.00 SF/plt", price: "$1.99/SF"},
  {service: "Moxie/Happy Feet English Pub — 26.00 SF/ctn · 1,430.00 SF/plt", price: "$5.39/SF"},
  {service: "Moxie/Happy Feet Farmhouse Manor — 19.12 SF/ctn · 764.80 SF/plt", price: "$3.79/SF"},
  {service: "Moxie/Happy Feet Gladiator LL — 7x48in · 5mm · 23.36 SF/ctn · 1,401.60 SF/plt", price: "$1.89/SF"},
  {service: "Moxie/Happy Feet Grand Chateau — 31.30 SF/ctn · 1,252.00 SF/plt", price: "$5.90/SF"},
  {service: "Moxie/Happy Feet Ironman — 6.3x48in · 3mm · 33.89 SF/ctn · 2,440.08 SF/plt", price: "$1.89/SF"},
  {service: "Moxie/Happy Feet Marathon III — 7x48in · 2mm · 51.39 SF/ctn · 3,083.40 SF/plt", price: "$0.69/SF"},
  {service: "Moxie/Happy Feet Maverick — 7x48in · 5.7mm · 28.52 SF/ctn · 1,426.00 SF/plt", price: "$1.69/SF"},
  {service: "Moxie/Happy Feet Mustang — 7x48in · 4.5mm · 23.64 SF/ctn · 1,773.00 SF/plt", price: "$1.39/SF"},
  {service: "Moxie/Happy Feet Norden Home — 8.5x72in · 12mm · 17.73 SF/ctn · 780.12 SF/plt", price: "$3.45/SF"},
  {service: "Moxie/Happy Feet Oak Grove — 23.40 SF/ctn · 1,287.00 SF/plt", price: "$4.05/SF"},
  {service: "Moxie/Happy Feet Oak Grove Prime — 31.09 SF/ctn · 1,088.15 SF/plt", price: "$4.81/SF"},
  {service: "Moxie/Happy Feet Olde Tavern — 15.20 SF/ctn · 760.00 SF/plt", price: "$2.99/SF"},
  {service: "Moxie/Happy Feet Olympus — 42.63 SF/ctn · 1,406.79 SF/plt", price: "$5.25/SF"},
  {service: "Moxie/Happy Feet Perseverance — 9x60in · 6.5mm · 18.70 SF/ctn · 1,271.60 SF/plt", price: "$1.99/SF"},
  {service: "Moxie/Happy Feet Pinnacle — 7x60in · 11.5mm · 20.70 SF/ctn · 1,138.50 SF/plt", price: "$3.49/SF"},
  {service: "Moxie/Happy Feet Quarry Tile — 18x36in · 5mm · 27.00 SF/ctn · 1,350.00 SF/plt", price: "$2.99/SF"},
  {service: "Moxie/Happy Feet QuickFit — 9x48in · 5mm · 24.00 SF/ctn · 1,440.00 SF/plt", price: "$2.49/SF"},
  {service: "Moxie/Happy Feet Regency — 7x59.05in · 8mm · 22.96 SF/ctn · 1,607.20 SF/plt", price: "$2.59/SF"},
  {service: "Moxie/Happy Feet Rescue — 7.2x48in · 7mm · 19.20 SF/ctn · 1,152.00 SF/plt", price: "$2.59/SF"},
  {service: "Moxie/Happy Feet Showtime — 7x48in · 4.5mm · 23.64 SF/ctn · 1,891.20 SF/plt", price: "$1.69/SF"},
  {service: "Moxie/Happy Feet Skyview — 21.95 SF/ctn · 965.80 SF/plt", price: "$3.55/SF"},
  {service: "Moxie/Happy Feet Stone Elegance II — 7.25x48in · 6.2mm · 28.70 SF/ctn · 1,435.00 SF/plt", price: "$1.99/SF"},
  {service: "Moxie/Happy Feet Surfside — 7x60in · 10mm · 17.52 SF/ctn · 1,226.40 SF/plt", price: "$1.90/SF"},
  {service: "Moxie/Happy Feet Tenacious 8 — 7x48in · 2mm · 51.39 SF/ctn · 3,083.40 SF/plt", price: "$0.79/SF"},
  {service: "Moxie/Happy Feet Texas Timber — 38.90 SF/ctn · 1,750.50 SF/plt", price: "$3.45/SF"},
  {service: "Moxie/Happy Feet Thrive — 7x48in · 4.5mm · 23.64 SF/ctn · 1,891.20 SF/plt", price: "$1.39/SF"},
  {service: "Moxie/Happy Feet Titan — 7x48in · 4.5mm · 25.72 SF/ctn · 1,543.20 SF/plt", price: "$1.89/SF"},
  {service: "Moxie/Happy Feet Turnberry Hickory — 7.5in W · 14mm · 23.30 SF/ctn · 1,165.00 SF/plt", price: "$4.99/SF"},
  {service: "Moxie/Happy Feet Turnberry Oak — 7.5in W · 14mm · 23.30 SF/ctn · 1,165.00 SF/plt", price: "$4.99/SF"},
  {service: "Moxie/Happy Feet Urban Designs 12 — 7x48in · 2mm · 51.39 SF/ctn · 3,083.40 SF/plt", price: "$0.89/SF"},
  {service: "Moxie/Happy Feet Urban Designs 20 — 7x48in · 2.5mm · 39.71 SF/ctn · 2,382.60 SF/plt", price: "$1.39/SF"},
  {service: "Moxie/Happy Feet Urban Designs Click — 7x48in · 5mm · 23.78 SF/ctn · 1,307.90 SF/plt", price: "$1.99/SF"},
  {service: "Moxie/Happy Feet Urban Designs LL — 7x48in · 4.5mm · 25.72 SF/ctn · 1,543.20 SF/plt", price: "$1.89/SF"},
  {service: "Moxie Distribution Rep: Jace Frazier — jfrazier@moxieflooring.com · 520-697-3868", price: "Contact"},
  {service: "Moxie Distribution Order Desk: 480-426-9009 (9AM-5PM EST M-F) · orders@moxieflooring.com", price: "Contact"}
];

const LABOR_PRICES = {
  'Installation': [
    { service: 'Engineered Wood / Hardwood / Cork (glue/nail)', price: '$6.00/sf' },
    { service: 'Ceramic / Porcelain Tile (small-med)', price: '$6.00/sf' },
    { service: 'Large Format Tile (floor)', price: '$7.50/sf' },
    { service: 'Floating Laminate / LVP / Wood / Cork', price: '$4.00/sf' },
    { service: 'Glue Down LVP / Sheet Vinyl', price: '$3.25/sf' },
    { service: 'Wall Tile (small-med)', price: '$18.00/sf' },
    { service: 'Wall Tile (large) / Natural Stone / Mosaics', price: '$25.00-$30.00/sf' },
    { service: 'Carpet Install (tack)', price: '$2.00/sf' },
    { service: 'Carpet Install (glue)', price: '$1.50/sf' },
  ],
  'Baseboard & Trim': [
    { service: 'Remove/Replace 3.25" Baseboard', price: '$4.25/lf' },
    { service: 'Remove/Replace 4.25" Baseboard', price: '$4.75/lf' },
    { service: 'Remove/Replace 4" Cove Base', price: '$3.50/lf' },
  ],
  'Removal': [
    { service: 'Remove Carpet', price: '$0.75/sf' },
    { service: 'Remove Floating Laminate / LVP / Wood', price: '$1.50/sf' },
    { service: 'Remove Glue-Down Vinyl / Sheet Vinyl', price: '$2.50/sf' },
    { service: 'Remove Tile', price: '$2.50/sf' },
    { service: 'Remove Hardwood', price: '$2.00/sf' },
  ]
};

// ── Global State ───────────────────────────────────────────────────────────
const state = {
  page: 'dashboard',
  sidebar: false,
  priceTab: 'mfr',
  laborSec: 'Installation',
  activeMfrId: null,
  activeSheetId: null,
  sheetSearch: '',
  editSheetId: null,
  mfrs: [],
  sheets: []
};

// Default manufacturers
const DEFAULT_MFRS = [
  { id: 'moxie', name: 'Moxie Distribution (Apollo Flooring)', rep: 'Jace Frazier', phone: '520-697-3868', email: 'jfrazier@moxieflooring.com' },
  { id: 'masland', name: 'Masland Carpets' },
  { id: 'tarkett', name: 'Tarkett' },
  { id: 'duchateau', name: 'DuChateau Hardwood' },
  { id: 'triwest', name: 'Triwest Distributors' },
  { id: 'armstrong', name: 'Armstrong' },
  { id: 'ahf', name: 'AHF (American Hardwood Flooring)' },
];

const DEFAULT_SHEETS = [
  {
    id: 'sheet-moxie-2026',
    mfrId: 'moxie',
    name: 'Moxie Distribution — Apollo Flooring MXD10050',
    effectiveDate: '2026-06-16',
    pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
    items: APOLLO_FLOORING_PRICING
  }
];

// ── Initialization ────────────────────────────────────────────────────────
function init() {
  const saved = localStorage.getItem(SK);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.mfrs = data.mfrs || DEFAULT_MFRS;
      state.sheets = data.sheets || DEFAULT_SHEETS;
    } catch(e) {
      state.mfrs = DEFAULT_MFRS;
      state.sheets = DEFAULT_SHEETS;
    }
  } else {
    state.mfrs = DEFAULT_MFRS;
    state.sheets = DEFAULT_SHEETS;
  }
  attachEventListeners();
  render();
}

// ── Save State ────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem(SK, JSON.stringify({ mfrs: state.mfrs, sheets: state.sheets }));
}

// ── Utility Functions ────────────────────────────────────────────────────
function esc(s) { return String(s||'').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
function fmt(d) { return new Date(d).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}); }
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// ── Event Listeners ───────────────────────────────────────────────────────
function attachEventListeners() {
  // Navigation
  document.addEventListener('click', e => {
    if (e.target.closest('[data-nav]')) {
      state.page = e.target.closest('[data-nav]').dataset.nav;
      state.sheetSearch = '';
      state.activeMfrId = null;
      state.activeSheetId = null;
      render();
    }
    if (e.target.closest('[data-price-tab]')) {
      state.priceTab = e.target.closest('[data-price-tab]').dataset.priceTab;
      render();
    }
    if (e.target.closest('[data-labor-sec]')) {
      state.laborSec = e.target.closest('[data-labor-sec]').dataset.laborSec;
      render();
    }
    if (e.target.closest('[data-open-sheet]')) {
      state.activeSheetId = e.target.closest('[data-open-sheet]').dataset.openSheet;
      state.sheetSearch = '';
      render();
    }
    if (e.target.closest('[data-open-mfr]')) {
      state.activeMfrId = e.target.closest('[data-open-mfr]').dataset.openMfr;
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    }
    if (e.target.closest('[data-back-to-list]')) {
      state.activeMfrId = null;
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    }
    if (e.target.closest('[data-back-to-mfr]')) {
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    }
    if (e.target.closest('[data-add-sheet]')) {
      const mfrId = e.target.closest('[data-add-sheet]').dataset.addSheet;
      openAddSheetModal(mfrId);
    }
    if (e.target.closest('[data-edit-sheet]')) {
      const sheetId = e.target.closest('[data-edit-sheet]').dataset.editSheet;
      openEditSheetModal(sheetId);
    }
    if (e.target.closest('[data-delete-sheet]')) {
      const sheetId = e.target.closest('[data-delete-sheet]').dataset.deleteSheet;
      if (confirm('Delete this price sheet?')) {
        state.sheets = state.sheets.filter(s => s.id !== sheetId);
        save();
        render();
        toast('Price sheet deleted');
      }
    }
  });

  // Search input
  document.addEventListener('input', e => {
    if (e.target.id === 'sheet-search') {
      state.sheetSearch = e.target.value;
      render();
    }
  });

  // Modal buttons
  document.addEventListener('click', e => {
    if (e.target.closest('.modal-close') || e.target.id === 'close-sheet-modal') {
      document.getElementById('modal-sheet').classList.remove('show');
      state.editSheetId = null;
    }
    if (e.target.id === 'save-sheet') {
      saveSheet();
    }
  });
}

// ── Modal Functions ───────────────────────────────────────────────────────
function openAddSheetModal(mfrId) {
  const mfr = state.mfrs.find(m => m.id === mfrId);
  const html = `
    <div class="modal-header">
      <div class="modal-title">+ Add Price Sheet — ${esc(mfr.name)}</div>
      <button id="close-sheet-modal" class="modal-close">✕</button>
    </div>
    <div class="field"><label>Sheet Name *</label><input class="inp" id="sheet-name" placeholder="e.g. June 2026 Pricing"/></div>
    <div class="field"><label>Effective Date</label><input class="inp" id="sheet-date" type="date"/></div>
    <div class="field"><label>Items (JSON format or paste from spreadsheet)</label><textarea class="inp" id="sheet-items" rows="6" placeholder='[{"service":"Item name","price":"$X.XX"}]' style="resize:vertical;font-family:monospace;font-size:12px"></textarea></div>
    <div style="font-size:12px;color:#4A6080;margin-bottom:14px">Paste pricing data as JSON array or tab-separated rows (service\\tprice)</div>
    <button class="btn-gold" id="save-sheet">Save Price Sheet</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px;text-align:center" id="cancel-sheet">Cancel</button>
  `;
  document.getElementById('sheet-modal-body').innerHTML = html;
  document.getElementById('modal-sheet').classList.add('show');
  
  document.getElementById('cancel-sheet').addEventListener('click', () => {
    document.getElementById('modal-sheet').classList.remove('show');
  });
}

function openEditSheetModal(sheetId) {
  const sheet = state.sheets.find(s => s.id === sheetId);
  const mfr = state.mfrs.find(m => m.id === sheet.mfrId);
  const itemsStr = JSON.stringify(sheet.items, null, 2);
  const html = `
    <div class="modal-header">
      <div class="modal-title">✎ Edit Price Sheet</div>
      <button id="close-sheet-modal" class="modal-close">✕</button>
    </div>
    <div class="field"><label>Manufacturer</label><input class="inp" value="${esc(mfr.name)}" disabled/></div>
    <div class="field"><label>Sheet Name *</label><input class="inp" id="sheet-name" value="${esc(sheet.name)}"/></div>
    <div class="field"><label>Effective Date</label><input class="inp" id="sheet-date" type="date" value="${sheet.effectiveDate||''}"/></div>
    <div class="field"><label>Items (JSON format)</label><textarea class="inp" id="sheet-items" rows="6" style="resize:vertical;font-family:monospace;font-size:12px">${esc(itemsStr)}</textarea></div>
    <button class="btn-gold" id="save-sheet">Update Price Sheet</button>
    <button class="btn-danger" style="width:100%;margin-top:8px;text-align:center;color:#F87171" onclick="if(confirm('Delete this sheet?')){state.sheets=state.sheets.filter(s=>s.id!=='${esc(sheetId)}');save();document.getElementById('modal-sheet').classList.remove('show');render();toast('Sheet deleted')}">Delete Sheet</button>
  `;
  document.getElementById('sheet-modal-body').innerHTML = html;
  document.getElementById('modal-sheet').classList.add('show');
  state.editSheetId = sheetId;
}

function saveSheet() {
  const name = document.getElementById('sheet-name').value.trim();
  const date = document.getElementById('sheet-date').value;
  const itemsInput = document.getElementById('sheet-items').value.trim();
  
  if (!name) { alert('Sheet name required'); return; }
  
  // Parse items
  let items = [];
  try {
    if (itemsInput.startsWith('[')) {
      items = JSON.parse(itemsInput);
    } else {
      // Parse tab-separated or line-separated format
      items = itemsInput.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [service, price] = line.split('\t').map(s => s.trim());
          return { service, price };
        });
    }
    if (!Array.isArray(items)) items = [items];
  } catch(e) {
    alert('Invalid items format. Use JSON array or tab-separated values.');
    return;
  }
  
  if (state.editSheetId) {
    // Update existing
    const sheet = state.sheets.find(s => s.id === state.editSheetId);
    sheet.name = name;
    sheet.effectiveDate = date;
    sheet.items = items;
  } else {
    // Add new
    const mfrId = document.querySelector('#sheet-modal-body').innerHTML.includes('[data-add-sheet]') 
      ? document.querySelector('[data-add-sheet]')?.dataset.addSheet
      : null;
    if (!mfrId) { alert('No manufacturer selected'); return; }
    
    const newSheet = {
      id: 'sheet-' + Date.now(),
      mfrId,
      name,
      effectiveDate: date,
      items
    };
    state.sheets.push(newSheet);
  }
  
  save();
  document.getElementById('modal-sheet').classList.remove('show');
  state.editSheetId = null;
  render();
  toast(state.editSheetId ? 'Price sheet updated' : 'Price sheet added');
}

// ── Main Render Function ───────────────────────────────────────────────────
function render() {
  const content = document.getElementById('content');
  const title = document.getElementById('page-title');
  
  switch(state.page) {
    case 'dashboard': 
      title.textContent = '📊 Dashboard';
      content.innerHTML = renderDashboard();
      break;
    case 'prices':
      title.textContent = '💰 Pricing';
      content.innerHTML = renderPrices();
      break;
    default:
      title.textContent = 'Apollo CRM';
      content.innerHTML = '<div style="padding:20px">Page not found</div>';
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────
function renderDashboard() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-val">${state.mfrs.length}</div>
        <div class="stat-lbl">Manufacturers</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${state.sheets.length}</div>
        <div class="stat-lbl">Price Sheets</div>
      </div>
    </div>

    <div class="sec-lbl">Quick Actions</div>
    <button class="btn-ghost" style="width:100%;padding:12px;margin-bottom:8px" data-nav="prices">
      💰 View Pricing
    </button>
  `;
}

// ── Pricing Page ────────────────────────────────────────────────────────
function renderPrices() {
  const tabs = `
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="filter-tab ${state.priceTab==='labor'?'active':''}" data-price-tab="labor">Apollo Labor</button>
      <button class="filter-tab ${state.priceTab==='mfr'?'active':''}" data-price-tab="mfr">Manufacturers</button>
    </div>`;

  // ── LABOR TAB
  if (state.priceTab === 'labor') {
    const q = (state.sheetSearch||'').toLowerCase();
    const secTabs = Object.keys(LABOR_PRICES).map(s =>
      `<button class="filter-tab ${state.laborSec===s?'active':''}" data-labor-sec="${esc(s)}">${s}</button>`
    ).join('');
    const filtered = q
      ? Object.values(LABOR_PRICES).flat().filter(it => it.service.toLowerCase().includes(q))
      : LABOR_PRICES[state.laborSec];
    const rows = filtered.map(item =>
      `<div class="price-row"><div class="price-service">${esc(item.service)}</div><div class="price-val">${esc(item.price)}</div></div>`
    ).join('') || `<div class="empty">No results</div>`;
    return `${tabs}
      <input class="inp" id="sheet-search" placeholder="🔍 Search labor rates..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:16px"/>
      <div style="font-size:10px;color:#7EB3E8;letter-spacing:3px;text-transform:uppercase;margin-bottom:2px">Apollo Flooring</div>
      <div style="font-size:20px;font-weight:bold;margin-bottom:2px">Installation Labor Rates</div>
      ${q ? '' : `<div class="filter-tabs">${secTabs}</div>`}
      ${rows}`;
  }

  // ── MANUFACTURER TAB
  const sortedMfrs = [...state.mfrs].sort((a,b) => a.name.localeCompare(b.name));

  // Single sheet view
  if (state.activeSheetId) {
    const sheet = state.sheets.find(s => s.id === state.activeSheetId);
    const mfr = sheet ? state.mfrs.find(m => m.id === sheet.mfrId) : null;
    if (!sheet) { state.activeSheetId = null; return renderPrices(); }

    const q = (state.sheetSearch||'').toLowerCase();
    const filteredItems = q
      ? sheet.items.filter(it => (it.service||'').toLowerCase().includes(q) || (it.price||'').toLowerCase().includes(q))
      : sheet.items;

    const rows = filteredItems.map(it =>
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:11px 0;border-bottom:1px solid #0A1525;gap:12px">
        <div style="font-size:14px;color:#C8D8E8;flex:1;line-height:1.5">${esc(it.service)}</div>
        <div style="font-size:15px;font-weight:bold;color:#7EB3E8;white-space:nowrap;flex-shrink:0">${esc(it.price)}</div>
      </div>`
    ).join('') || `<div class="empty">No items match</div>`;

    const pdfSection = sheet.pdfUrl ? `
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #1A3555">
        <div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">📄 Original PDF</div>
        <iframe src="${esc(sheet.pdfUrl)}" style="width:100%;height:500px;border:1px solid #1A3555;border-radius:10px;background:white"></iframe>
      </div>
    ` : '';

    return `${tabs}
      <button style="background:none;border:none;color:#7EB3E8;cursor:pointer;padding:0;font-size:14px;margin-bottom:16px;font-family:Georgia,serif;display:flex;align-items:center;gap:6px" data-back-to-mfr>← Back</button>

      <div style="background:#0F2035;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #1A3555">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="font-size:10px;color:#7EB3E8;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">${esc(mfr?mfr.name:'')}</div>
            <div style="font-size:20px;font-weight:bold;margin-bottom:2px">${esc(sheet.name)}</div>
            ${sheet.effectiveDate?`<div style="font-size:12px;color:#4A6080;margin-bottom:2px">Effective: ${fmt(sheet.effectiveDate)}</div>`:''}
            <div style="font-size:12px;color:#4A6080">${sheet.items.length} items total</div>
          </div>
          <button class="btn-ghost" data-edit-sheet="${esc(sheet.id)}" style="padding:8px 12px;font-size:12px">✎ Edit</button>
        </div>
      </div>

      <input class="inp" id="sheet-search" placeholder="🔍 Search within sheet..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:4px"/>
      ${q ? `<div style="font-size:12px;color:#4A6080;margin-bottom:14px">${filteredItems.length} result${filteredItems.length!==1?'s':''}</div>` : `<div style="margin-bottom:16px"></div>`}
      ${rows}
      ${pdfSection}`;
  }

  // Manufacturer detail view
  if (state.activeMfrId) {
    const mfr = state.mfrs.find(m => m.id === state.activeMfrId);
    if (!mfr) { state.activeMfrId = null; return renderPrices(); }
    const mfrSheets = state.sheets.filter(s => s.mfrId === mfr.id);

    const sheetCards = mfrSheets.length
      ? mfrSheets.map(sheet => {
          return `<div class="cust-row" style="flex-direction:column;align-items:flex-start;gap:8px;cursor:default">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:8px">
              <div style="flex:1;min-width:0" data-open-sheet="${esc(sheet.id)}" style="cursor:pointer">
                <div style="font-weight:bold;font-size:15px">${esc(sheet.name)}</div>
                ${sheet.effectiveDate?`<div style="font-size:12px;color:#4A6080;margin-top:2px">Effective: ${fmt(sheet.effectiveDate)}</div>`:''}
                <div style="font-size:12px;color:#4A6080;margin-top:2px">${sheet.items.length} items</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn-ghost" data-open-sheet="${esc(sheet.id)}" style="padding:6px 10px;font-size:12px">View</button>
                <button class="btn-ghost" data-edit-sheet="${esc(sheet.id)}" style="padding:6px 10px;font-size:12px">✎</button>
              </div>
            </div>
          </div>`;
        }).join('')
      : `<div class="empty">No price sheets for this manufacturer</div>`;

    return `${tabs}
      <button style="background:none;border:none;color:#7EB3E8;cursor:pointer;padding:0;font-size:14px;margin-bottom:16px;font-family:Georgia,serif;display:flex;align-items:center;gap:6px" data-back-to-list>← All Manufacturers</button>

      <div style="background:#0F2035;border-radius:14px;padding:18px;margin-bottom:16px;border:1px solid #1A3555">
        <div style="font-size:22px;font-weight:bold;margin-bottom:4px">${esc(mfr.name)}</div>
        ${mfr.rep?`<div style="font-size:14px;color:#E8EEF5;margin-bottom:2px">👤 ${esc(mfr.rep)}</div>`:''}
        ${mfr.phone?`<a href="tel:${esc(mfr.phone)}" style="color:#7EB3E8;font-size:14px;display:block;margin-top:4px">📞 ${esc(mfr.phone)}</a>`:''}
      </div>

      <div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Price Sheets</div>
      ${sheetCards}
      <button class="btn-ghost" style="width:100%;padding:12px;margin-top:12px" data-add-sheet="${esc(mfr.id)}">+ Add Price Sheet</button>`;
  }

  // Top level - all manufacturers
  const mfrCards = sortedMfrs.map(mfr => {
    const sheetCount = state.sheets.filter(s => s.mfrId === mfr.id).length;
    return `<div class="cust-row" data-open-mfr="${esc(mfr.id)}" style="flex-direction:column;align-items:flex-start;gap:4px">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:bold;font-size:15px">${esc(mfr.name)}</div>
          ${mfr.rep?`<div style="font-size:12px;color:#4A6080;margin-top:2px">${esc(mfr.rep)}</div>`:''}
          <div style="font-size:12px;color:#4A6080;margin-top:2px">${sheetCount} price sheet${sheetCount!==1?'s':''}</div>
        </div>
        <div style="color:#7EB3E8;font-size:22px;flex-shrink:0">›</div>
      </div>
    </div>`;
  }).join('');

  return `${tabs}
    <input class="inp" id="sheet-search" placeholder="🔍 Search manufacturers..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:16px"/>
    <div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">All Manufacturers</div>
    ${mfrCards}`;
}

// ── Initialize on load ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
