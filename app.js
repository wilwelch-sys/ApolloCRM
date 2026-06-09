// ── Apollo Flooring CRM ── app.js ──────────────────────────────────────────
'use strict';

// ── Constants ───────────────────────────────────────────────────────────────
const SK = 'apollo-crm-v1';
const SP_ENABLED = true; // SharePoint sync enabled
const SP_FILE    = 'apollo-crm-customers.json'; // File saved in SharePoint/OneDrive

// ── SharePoint Sync via Anthropic API + Microsoft 365 MCP ────────────────────
// Saves customer data to SharePoint so ALL team members see the same customers
// Falls back to localStorage if SharePoint is unavailable

async function spLoad() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: 'You are a SharePoint file reader. When asked to read a file from OneDrive, search for it and return ONLY the raw JSON content of the file, nothing else. If the file does not exist, return exactly: {"customers":[],"mfrs":null,"sheets":null}',
        messages: [{ role: 'user', content: 'Read the file named "' + SP_FILE + '" from OneDrive and return its exact JSON content.' }],
        mcp_servers: [{ type: 'url', url: 'https://microsoft365.mcp.claude.com/mcp', name: 'microsoft365' }]
      })
    });
    clearTimeout(timeout);
    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    if (!clean || clean.startsWith('{') === false) return null;
    return JSON.parse(clean);
  } catch(e) {
    console.warn('SharePoint load failed, using local:', e);
    return null;
  }
}async function spLoad() {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: 'You are a SharePoint file reader. When asked to read a file from OneDrive, search for it and return ONLY the raw JSON content of the file, nothing else. If the file does not exist, return exactly: {"customers":[],"mfrs":null,"sheets":null}',
        messages: [{ role: 'user', content: 'Read the file named "' + SP_FILE + '" from OneDrive and return its exact JSON content.' }],
        mcp_servers: [{ type: 'url', url: 'https://microsoft365.mcp.claude.com/mcp', name: 'microsoft365' }]
      })
    });
    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    if (!clean || clean.startsWith('{') === false) return null;
    return JSON.parse(clean);
  } catch(e) {
    console.warn('SharePoint load failed, using local:', e);
    return null;
  }
}

async function spSave(customers) {
  try {
    const jsonStr = JSON.stringify({ customers, savedAt: new Date().toISOString() });
    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a SharePoint file writer. Save the provided JSON to OneDrive as the specified filename. Reply with only: SAVED',
        messages: [{ role: 'user', content: 'Save this JSON as "' + SP_FILE + '" in OneDrive: ' + jsonStr }],
        mcp_servers: [{ type: 'url', url: 'https://microsoft365.mcp.claude.com/mcp', name: 'microsoft365' }]
      })
    });
  } catch(e) {
    console.warn('SharePoint save failed:', e);
  }
}

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
    { service: 'Remove Glue Down Wood / Ceramic / Porcelain Tile', price: '$3.50/sf' },
    { service: 'Dustless Tile / Wood Removal', price: '$4.50/sf' },
    { service: 'Remove Sheet Vinyl', price: '$2.00/sf' },
  ],
  'Floor Prep': [
    { service: 'Floor Prep (patch / skimcoat / self-level)', price: '$80.00/hr' },
    { service: 'Grinding', price: '$150.00/hr' },
  ],
};

const DEFAULT_MFRS = [
  { id: 'shaw',     name: 'Shaw',            rep: '', phone: '', email: '', portal: 'https://www.shawfloors.com',      notes: '' },
  { id: 'mohawk',   name: 'Mohawk',          rep: '', phone: '', email: '', portal: 'https://www.mohawkflooring.com', notes: '' },
  { id: 'armstrong',name: 'Armstrong',       rep: '', phone: '', email: '', portal: 'https://www.armstrongflooring.com', notes: '' },
  { id: 'paradigm', name: 'Paradigm Flooring', rep: '', phone: '1-800-669-6696', email: '', portal: 'https://www.triwestltd.com', notes: 'Owned by Tri-West Ltd · FOB Santa Fe Springs · Terms Net 30 · Min return 5 ctns · 20% restocking fee',
    pdfs: [
      { file: 'triwest-paradigm-clean.pdf', label: 'Paradigm WPC/SPC Price List — May 2026 (Clean PDF)' },
    ]
  },
  { id: 'pergo',    name: 'Pergo',           rep: '', phone: '', email: '', portal: 'https://www.pergo.com',           notes: '' },
  { id: 'karndean', name: 'Karndean',        rep: '', phone: '', email: '', portal: 'https://www.karndean.com',        notes: '' },
  { id: 'coretec',  name: 'COREtec',         rep: '', phone: '', email: '', portal: 'https://www.coretecfloors.com',   notes: '' },
  { id: 'anderson', name: 'Anderson Tuftex', rep: '', phone: '', email: '', portal: 'https://www.andersontuftex.com',  notes: '' },
  { id: 'dixiehome',name: 'Dixie Home',      rep: '', phone: '', email: '', portal: 'https://www.dixiegroup.com',      notes: 'Parent company of Fabrica and Masland' },
  { id: 'fabrica',  name: 'Fabrica',         rep: 'Jon Bingham', phone: '602-809-1077', email: 'jon.bingham@dixiegroup.com', portal: 'https://www.fabricacarpets.com', notes: 'Owned by Dixie Home', pdfs: [
      { file: 'fabrica-original-clean.pdf', label: 'Fabrica Pricing — April 2026 (Clean PDF)' },
    ] },
  { id: 'masland',  name: 'Masland',         rep: 'Jon Bingham', phone: '602-809-1077', email: 'jon.bingham@dixiegroup.com', portal: 'https://www.maslandcarpets.com', notes: 'Owned by Dixie Home', pdfs: [
      { file: 'masland-original-clean.pdf', label: 'Masland Pricing — April 2026 (Clean PDF)' },
    ] },
  { id: 'duchateau', name: 'DuChateau', rep: 'Kristy Stevenson', phone: '602-245-8841', email: '', portal: 'https://www.duchateau.com', notes: 'Territory Manager AZ/NM · Mobile: 602-245-8841 · Office: 858-790-3139 · 8480 Miralani Dr, San Diego, CA 92126',
    pdfs: [
      { file: 'duchateau-vernal-original.pdf',   label: 'Vernal — Signature (Original)' },
      { file: 'duchateau-vernal-mar-2026.pdf',   label: 'Vernal — Signature (Clean Format)' },
      { file: 'duchateau-botteva-original.pdf',  label: 'Botteva — Guild Hardwood (Original)' },
      { file: 'duchateau-botteva-mar-2026.pdf',  label: 'Botteva — Guild Hardwood (Clean Format)' },
      { file: 'duchateau-boiselle-original.pdf', label: 'Boiselle — Guild Hardwood (Original)' },
      { file: 'duchateau-boiselle-mar-2026.pdf', label: 'Boiselle — Guild Hardwood (Clean Format)' },
      { file: 'duchateau-beaujou-original.pdf',  label: 'Beaujou — Guild Hardwood (Original)' },
      { file: 'duchateau-beaujou-mar-2026.pdf',  label: 'Beaujou — Guild Hardwood (Clean Format)' },
    ]
  },
  { id: 'southwind', name: 'Southwind Building Products', rep: 'Michael & Assoc Intl LLC', phone: '480-216-8545', email: '', portal: 'https://www.southwindinc.com', notes: 'Sales Rep 19-116 · Ext 3455 · Furniture Distributors Inc · Account 024391-0000 · FOB Dalton GA · Terms 1%/15 Net 30',
    pdfs: [
      { file: 'southwind-original.pdf', label: 'Southwind Price List — May 2026 (Original)' },
      { file: 'southwind-clean.pdf',    label: 'Southwind Price List — May 2026 (Clean PDF)' },
    ]
  },
  { id: 'bigd', name: 'Big D Floor Covering Supplies', rep: 'Sean Webner', phone: '602-442-2299', email: 'krystal.bancroft@bigdsupply.com', portal: '', notes: 'Order Desk: (602) 442-2299 · Tarkett FiberFloor/TruTex distributor · Versa Core Pure Edge LVP · Reserve Collection Engineered Hardwood · Q2 2026 Spiff ends June 30',
    pdfs: [
      { file: 'tarkett-fiberfloor-original.pdf',                  label: 'Tarkett FiberFloor/TruTex VIP — May 2026 (Original)' },
      { file: 'tarkett-fiberfloor-clean.pdf',                     label: 'Tarkett FiberFloor/TruTex VIP — May 2026 (Clean PDF)' },
      { file: 'Versacore_Pure_Edge_Sell_Sheet_062425.pdf',        label: 'Versa Core Pure Edge — Sell Sheet' },
      { file: 'Versa_Core_Dealer_Price_List_2-2026__1___1_.pdf',  label: 'Versa Core Pure Edge — Dealer Price List Feb 2026' },
      { file: 'Reserve_Dealer_Price_Sheet_2025_11_23.pdf',        label: 'Reserve Collection Hardwood — Dealer Price List Nov 2025' },
      { file: 'Big_D_Reserve_Sell_Sheet_050125.pdf',              label: 'Reserve Collection Hardwood — Sell Sheet' },
      { file: 'Big_D_Spiff_Redemption_Form_Q2_2026__1_.pdf',     label: 'Big D Q2 2026 Spiff Redemption Form (ends June 30)' },
    ]
  },
  { id: 'tarkett',  name: 'Tarkett',        rep: 'Michael Moore', phone: '480-216-8545', email: '', portal: 'https://www.tarkett.com', notes: 'Agent: Michael Moore · Furniture Distributors Inc · Account 107416-0000',
    pdfs: [
      { file: 'tarkett-original.pdf', label: 'Tarkett Home Residential — May 2026 (Original)' },
      { file: 'tarkett-residential-may-2026.pdf', label: 'Tarkett Home Residential — May 2026 (Clean Format)' },
    ]
  },
  { id: 'triwest',  name: 'Tri West',        rep: '', phone: '', email: '', portal: '', notes: 'Furniture Distributors Inc — Account 001866',
    pdfs: [
      { file: 'triwest-quickstep-clean.pdf',     label: 'Quick Step Laminate — June 2026 (Clean PDF)' },
      { file: 'triwest-artisan-clean.pdf',       label: 'Artisan Collection Laminate — June 2026 (Clean PDF)' },
      { file: 'triwest-armstrong-clean.pdf',     label: 'Armstrong Commercial Sheet Vinyl — June 2026 (Clean PDF)' },
      { file: 'triwest-ahf-clean.pdf',           label: 'AHF Contract Commercial — June 2026 (Clean PDF)' },
      { file: 'armstrong-residential-may-2026.pdf',    label: 'Armstrong Residential — May 2026 (Sheet, LVT, LVP, SPC)' },
      { file: 'armstrong-commercial-may-2026.pdf',     label: 'Armstrong Commercial — May 2026 (Sheet Vinyl, VCT, LVT, Hardwood)' },
      { file: 'ahf-contract-commercial-may-2026.pdf',  label: 'AHF Contract Commercial — May 2026 (Sheet, LVT, VCT)' },
      { file: 'provenza-hardwood-apr-2026.pdf',         label: 'Provenza Hardwood — April 2026' },
      { file: 'grandpacific-hardwood-apr-2026.pdf',     label: 'Grand Pacific Hardwood — April 2026' },
      { file: 'californiaclassics-hardwood-apr-2026.pdf', label: 'California Classics Hardwood — April 2026' },
      { file: 'bravada-hardwood-apr-2026.pdf',          label: 'Bravada Hardwood — April 2026' },
    ]
  },
];

const PIPELINE = ['Lead','Quote Sent','Measure Scheduled','Ordered','In Transit','Ready','Scheduled','Installed'];
const PIPELINE_WITH_FOLLOWUP = [...PIPELINE, 'Follow-Up'];
const DEFAULT_SHEETS = [
  {
    id: 'sheet-fabrica-2026',
    mfrId: 'fabrica',
    name: 'Fabrica Pricing — April 27, 2026',
    effectiveDate: '2026-04-27',
    items: [{"service": "Absolute \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$57.49"}, {"service": "Accolade \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Adulation \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$32.99"}, {"service": "Alluvial \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$47.99"}, {"service": "Artisan \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$32.99"}, {"service": "Aspen \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.49"}, {"service": "Bangladesh \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$42.99"}, {"service": "Barcelona \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.99"}, {"service": "Bel Air \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$54.49"}, {"service": "Belcarra \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$46.49"}, {"service": "Beverly Hills \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$54.99"}, {"service": "Bodega Bay \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$65.99"}, {"service": "Breakers \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.99"}, {"service": "BRUSHstrokes \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.49"}, {"service": "Buckingham \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$35.49"}, {"service": "Cape Town \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$47.99"}, {"service": "Captiva \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$41.99"}, {"service": "Chantrel \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.99"}, {"service": "Chez \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$77.49"}, {"service": "Chez Cote \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$53.99"}, {"service": "Chinois \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.99"}, {"service": "Cirrus \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.99"}, {"service": "Classic Elegance \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Cotton Club \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$59.99"}, {"service": "Denali \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Desert Vista \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.99"}, {"service": "Dolce \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$56.49"}, {"service": "Dominique \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.99"}, {"service": "Donegal \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$37.49"}, {"service": "Dover \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.99"}, {"service": "Element \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.49"}, {"service": "Esperanza \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Garbo \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$44.49"}, {"service": "Habitat \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.99"}, {"service": "Hollywood Nights \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$53.49"}, {"service": "Homage \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$30.99"}, {"service": "Imperial Point \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.99"}, {"service": "Ink Wash \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.99"}, {"service": "Ithaca \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.99"}, {"service": "Kings Canyon \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.99"}, {"service": "La Femme \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$50.99"}, {"service": "La Jolla \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Lexington \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Luxe \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$74.99"}, {"service": "Madonna \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$74.99"}, {"service": "Madrid \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.99"}, {"service": "Mia Bella \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$83.99"}, {"service": "Milan \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.49"}, {"service": "Montage \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Montalcino \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$55.49"}, {"service": "Monterey \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$50.49"}, {"service": "Nepali \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$46.49"}, {"service": "Nibbana Anew \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$43.99"}, {"service": "Occasion \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$37.99"}, {"service": "Pacific Grove \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$57.99"}, {"service": "Pandora \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$41.49"}, {"service": "Patina Nouveau \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$46.99"}, {"service": "Phenomena \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.49"}, {"service": "Power Point \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$43.99"}, {"service": "Radiance \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.99"}, {"service": "River Song \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Savannah Weave \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$42.99"}, {"service": "Seduction \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$56.49"}, {"service": "Shimmer \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$47.99"}, {"service": "Silkweave Nouveau \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.49"}, {"service": "Splendore \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$77.99"}, {"service": "St. Croix \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$54.49"}, {"service": "St. Moritz \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$36.99"}, {"service": "Stratus \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$42.49"}, {"service": "Tattersall \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$53.99"}, {"service": "Tribute \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$30.99"}, {"service": "Tundra \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$43.99"}, {"service": "Verona \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.49"}, {"service": "Visage \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.49"}, {"service": "Wanderlust \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.99"}, {"service": "WATERcolor \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$51.49"}, {"service": "Waterford \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$30.99"}, {"service": "Amsterdam \u2014 Wool, Hand Loomed Jacquard, 15'", "price": "$48.59"}, {"service": "Aristocrat \u2014 Wool/Nylon, Hand Loomed, 15'", "price": "$67.99"}, {"service": "Bangkok \u2014 Wool, Hand Tufted, 15'", "price": "$44.59"}, {"service": "Canberra \u2014 Wool, Machine Tufted, 12'", "price": "$67.99"}, {"service": "Canyon Ridge \u2014 Wool, Machine Tufted, 13'2\"", "price": "$48.59"}, {"service": "Chatham \u2014 Wool/Nylon, Wire Wilton, 13'", "price": "$68.59"}, {"service": "Clearwater \u2014 Polyester, Hand Loomed, 15'", "price": "$50.59"}, {"service": "Decora \u2014 Wool, Machine Tufted, 12'", "price": "$56.49"}, {"service": "Dubai \u2014 Wool/Linen, Hand Loomed, 15'", "price": "$60.59"}, {"service": "Eastside \u2014 Wool, Wire Wilton, 13'", "price": "$68.59"}, {"service": "Hilo \u2014 Wool/Polyester, Hand Loomed Jacquard, 15'", "price": "$64.59"}, {"service": "Hirst \u2014 Wool, Wire Wilton, 12'", "price": "$76.49"}, {"service": "Hyperian \u2014 Wool, Machine Tufted, 12'", "price": "$71.99"}, {"service": "Jubilee \u2014 Wool, Hand Tufted, 15'", "price": "$63.59"}, {"service": "Kaanapali \u2014 Wool/Polyester, Hand Loomed Jacquard, 15'", "price": "$64.59"}, {"service": "Kennedy Point \u2014 Wool, Machine Tufted, 12'", "price": "$53.49"}, {"service": "London \u2014 Wool, Hand Loomed, 15'", "price": "$58.59"}, {"service": "Majestic \u2014 Wool, Wire Wilton, 13'", "price": "$68.59"}, {"service": "Mallorca \u2014 Wool, Machine Tufted, 12'", "price": "$75.99"}, {"service": "Needle Point \u2014 Wool, Machine Tufted, 12'", "price": "$42.49"}, {"service": "New Mallorca \u2014 Wool, Machine Tufted, 12'", "price": "$68.59"}, {"service": "New Saba \u2014 Wool, Machine Tufted, 12'", "price": "$68.59"}, {"service": "Noble \u2014 Wool, Machine Tufted, 12'", "price": "$61.49"}, {"service": "Olivia \u2014 Wool, Machine Tufted, 12'", "price": "$48.59"}, {"service": "Palladium \u2014 Wool, Wire Wilton, 13'", "price": "$68.59"}, {"service": "Paragon \u2014 Wool, Machine Tufted, 12'", "price": "$65.99"}, {"service": "Paris \u2014 Wool, Hand Loomed, 15'", "price": "$58.59"}, {"service": "Petit Point \u2014 Wool, Machine Tufted, 12'", "price": "$37.99"}, {"service": "Pure \u2014 Wool, Machine Tufted, 12'", "price": "$51.99"}, {"service": "Regal Treasures \u2014 Wool, Face 2 Face Woven, 13'2\"", "price": "$63.59"}, {"service": "Riverside \u2014 Wool, Wire Wilton, 13'", "price": "$68.59"}, {"service": "Saba \u2014 Wool, Machine Tufted, 12'", "price": "$74.99"}, {"service": "Savant \u2014 Wool, Machine Tufted, 12'", "price": "$47.49"}, {"service": "Seville \u2014 Wool, Wire Wilton, 13'2\"", "price": "$87.99"}, {"service": "Sophia \u2014 Wool, Hand Tufted, 15'", "price": "$63.59"}, {"service": "Sovereign \u2014 Wool/Nylon, Hand Loomed, 15'", "price": "$67.99"}, {"service": "TrendFabulous \u2014 Wool, Hand Loomed, 15'", "price": "$53.59"}, {"service": "TrendTastic \u2014 Wool, Hand Loomed, 15'", "price": "$53.59"}, {"service": "Trousseau \u2014 Wool, Wire Wilton, 12'", "price": "$80.99"}, {"service": "Valencia \u2014 Wool, Wire Wilton, 15'", "price": "$87.99"}, {"service": "Valerio \u2014 Wool, Machine Tufted, 12'", "price": "$68.49"}, {"service": "Venice \u2014 Wool, Machine Tufted, 12'", "price": "$51.49"}, {"service": "Veranda \u2014 Wool, Machine Tufted, 12'", "price": "$51.49"}, {"service": "Vienna \u2014 Wool, Hand Loomed Jacquard, 15'", "price": "$48.59"}, {"service": "Waimea \u2014 Wool, Machine Tufted, 12'", "price": "$61.49"}, {"service": "Whitaker \u2014 Wool, Wire Wilton, 12'", "price": "$73.49"}, {"service": "White Noise \u2014 Wool, Wire Wilton, 12'", "price": "$76.49"}]
  },
  {
    id: 'sheet-masland-2026',
    mfrId: 'masland',
    name: 'Masland Pricing — April 2026',
    effectiveDate: '2026-04-01',
    items: [{"service": "Americana \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.49"}, {"service": "Artist View \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$23.49"}, {"service": "Artistic Vision \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$26.49"}, {"service": "Bandala Jazz \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$23.99"}, {"service": "Beachfront \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$17.99"}, {"service": "Beacon Hill \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$37.49"}, {"service": "Beguiling \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Belmond \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$35.99"}, {"service": "Blurred Lines \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$30.49"}, {"service": "Boca Raton \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$25.99"}, {"service": "Bombay Vibration \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Braided Opulence \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$37.99"}, {"service": "Buena Vida \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$25.49"}, {"service": "Bungalow \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$29.99"}, {"service": "Casa Grande \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Cedarbrook \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Chalet \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$26.99"}, {"service": "Cheval \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$43.49"}, {"service": "Defined \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$18.99"}, {"service": "Delray \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$43.99"}, {"service": "Distinctive \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$18.99"}, {"service": "Distinguished \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$31.99"}, {"service": "Dorado \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$33.99"}, {"service": "Embrace \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.99"}, {"service": "FREEstyle \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$44.99"}, {"service": "Grace \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$34.49"}, {"service": "Granique \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$39.49"}, {"service": "Harbor Town \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$22.49"}, {"service": "Hudson Valley \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$24.49"}, {"service": "Hunter \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$25.99"}, {"service": "Imagine \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$35.99"}, {"service": "Jag \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.49"}, {"service": "Key West \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$28.99"}, {"service": "Knockout \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$49.49"}, {"service": "La Parade \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Lineage \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$28.99"}, {"service": "Lynx \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$42.99"}, {"service": "Marina Del Mar \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Marquis \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$30.99"}, {"service": "Matisse \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$52.99"}, {"service": "Mesa Bella \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$29.49"}, {"service": "Mesa Verde \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Miami \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$46.49"}, {"service": "Modern Mesh \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$30.99"}, {"service": "Montauk \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$37.49"}, {"service": "Morgan Bay \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$29.49"}, {"service": "Nature's Essence \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$44.99"}, {"service": "New Hope \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$50.49"}, {"service": "Nueva Vista \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$24.99"}, {"service": "Oceanside \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Opalesque \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.99"}, {"service": "Panache \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$41.49"}, {"service": "Patriot \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$39.49"}, {"service": "Pedigree \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$28.99"}, {"service": "Pinehurst \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$34.99"}, {"service": "Private Collection \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "Ravishing \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$53.49"}, {"service": "Rhapsody \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$44.99"}, {"service": "Rivulet \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$25.49"}, {"service": "Santa Barbara \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$32.49"}, {"service": "Santa Rosa \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$22.99"}, {"service": "Sea Grass \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$46.99"}, {"service": "Seascape \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$17.99"}, {"service": "Sequoia \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$35.99"}, {"service": "Serene Touch \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$36.99"}, {"service": "Seurat \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$58.49"}, {"service": "Shangri La \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$87.49"}, {"service": "Shangri La Too \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$87.49"}, {"service": "Silk Touch \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$48.99"}, {"service": "Sisal Weave \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$32.49"}, {"service": "Sisaltex \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$32.99"}, {"service": "St. Augustine \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$21.99"}, {"service": "Staccato \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$37.49"}, {"service": "Style Sense \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$27.49"}, {"service": "Sunset Key \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$25.49"}, {"service": "TAPdance \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$45.49"}, {"service": "This and That \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$33.49"}, {"service": "Tracker \u2014 EnVisionSD, Machine Tufted, 12'", "price": "$29.99"}, {"service": "True Luxury \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.49"}, {"service": "TWOstep \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$44.99"}, {"service": "Urban Escape \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$26.49"}, {"service": "Ventura \u2014 EnVision Nylon, Machine Tufted, 12'", "price": "$38.99"}]
  }
,
{
  "id": "sheet-tarkett-2026",
  "mfrId": "tarkett",
  "name": "Tarkett Home Residential \u2014 May 2026",
  "effectiveDate": "2026-05-19",
  "items": [
    {
      "service": "Adorn (TH941) \u2014 Carpet, 1200, AG Back, Roll $11.62/SY",
      "price": "$11.62/SY"
    },
    {
      "service": "Aesthetic (TH939) \u2014 Carpet, 1200, AG Back, Roll $12.35/SY",
      "price": "$12.35/SY"
    },
    {
      "service": "Allure (TH905) \u2014 Carpet, 1200, AG Back, Roll $16.84/SY",
      "price": "$16.84/SY"
    },
    {
      "service": "Anthropology (TH912) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    },
    {
      "service": "Antiquity (TH909) \u2014 Carpet, 1200, AG Back, Roll $16.84/SY",
      "price": "$16.84/SY"
    },
    {
      "service": "Arabesque (T2406) \u2014 Carpet, 1200, SG Back, Roll $15.62/SY",
      "price": "$15.62/SY"
    },
    {
      "service": "Arabesque II (TH938) \u2014 Carpet, 1200, AG Back, Roll $13.47/SY",
      "price": "$13.47/SY"
    },
    {
      "service": "Artistry (TH940) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Avalon (TH914) \u2014 Carpet, 1200, AG Back, Roll $17.91/SY",
      "price": "$17.91/SY"
    },
    {
      "service": "Balmoral (TH915) \u2014 Carpet, 1200, AG Back, Roll $14.43/SY",
      "price": "$14.43/SY"
    },
    {
      "service": "Bar Harbor (R3030) \u2014 Carpet, 1200, AG Back, Roll $10.32/SY",
      "price": "$10.32/SY"
    },
    {
      "service": "Cadence (R3085) \u2014 Carpet, 1200, SG Back, Roll $12.63/SY",
      "price": "$12.63/SY"
    },
    {
      "service": "Candler Park (R1148) \u2014 Carpet, 1200, AG Back, Roll $14.57/SY",
      "price": "$14.57/SY"
    },
    {
      "service": "Captivation (T3303) \u2014 Carpet, 1200, SG Back, Roll $17.90/SY",
      "price": "$17.90/SY"
    },
    {
      "service": "Captivation II (TH937) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    },
    {
      "service": "Catwalk Chic (TH502) \u2014 Carpet, 1200, AT Back, Roll $19.52/SY",
      "price": "$19.52/SY"
    },
    {
      "service": "Cheshire (TH919) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Collective (TH933) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Commotion (R8300) \u2014 Carpet, 1200, SG Back, Roll $12.71/SY",
      "price": "$12.71/SY"
    },
    {
      "service": "Crosswalk (T2110) \u2014 Carpet, 1200, SG Back, Roll $18.04/SY",
      "price": "$18.04/SY"
    },
    {
      "service": "Crosswalk II (TH935) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    },
    {
      "service": "Del Rio (R6200) \u2014 Carpet, 1200, AG Back, Roll $9.53/SY",
      "price": "$9.53/SY"
    },
    {
      "service": "Downy (R1070) \u2014 Carpet, 1200, SG Back, Roll $19.74/SY",
      "price": "$19.74/SY"
    },
    {
      "service": "Embellish (TH942) \u2014 Carpet, 1200, AG Back, Roll $9.38/SY",
      "price": "$9.38/SY"
    },
    {
      "service": "Enamour (TH906) \u2014 Carpet, 1200, AG Back, Roll $13.47/SY",
      "price": "$13.47/SY"
    },
    {
      "service": "Eterna (TH948) \u2014 Carpet, 1200, AG Back, Roll $16.84/SY",
      "price": "$16.84/SY"
    },
    {
      "service": "Fresco (TH922) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    },
    {
      "service": "Hidden Gem (TH944) \u2014 Carpet, 1200, AG Back, Roll $14.03/SY",
      "price": "$14.03/SY"
    },
    {
      "service": "Hypnotize (TH907) \u2014 Carpet, 1200, AG Back, Roll $11.11/SY",
      "price": "$11.11/SY"
    },
    {
      "service": "Icon (TH946) \u2014 Carpet, 1200, AG Back, Roll $16.84/SY",
      "price": "$16.84/SY"
    },
    {
      "service": "Impress (TH904) \u2014 Carpet, 1200, AG Back, Roll $7.13/SY",
      "price": "$7.13/SY"
    },
    {
      "service": "Influence (TH903) \u2014 Carpet, 1200, AG Back, Roll $9.53/SY",
      "price": "$9.53/SY"
    },
    {
      "service": "Inman Park (R1166) \u2014 Carpet, 1200, AG Back, Roll $17.80/SY",
      "price": "$17.80/SY"
    },
    {
      "service": "Inspire (TH901) \u2014 Carpet, 1200, AG Back, Roll $14.71/SY",
      "price": "$14.71/SY"
    },
    {
      "service": "Intrigue (TH902) \u2014 Carpet, 1200, AG Back, Roll $12.23/SY",
      "price": "$12.23/SY"
    },
    {
      "service": "Key West (R3035) \u2014 Carpet, 1200, AG Back, Roll $9.53/SY",
      "price": "$9.53/SY"
    },
    {
      "service": "K9 Cozy I (TH506) \u2014 Carpet, 1200, AT Back, Roll $15.84/SY",
      "price": "$15.84/SY"
    },
    {
      "service": "K9 Cozy II (TH505) \u2014 Carpet, 1200, AT Back, Roll $18.95/SY",
      "price": "$18.95/SY"
    },
    {
      "service": "Lost Jewel (TH945) \u2014 Carpet, 1200, AG Back, Roll $11.60/SY",
      "price": "$11.60/SY"
    },
    {
      "service": "Loyal Luxe (TH510) \u2014 Carpet, 1200, AT Back, Roll $24.79/SY",
      "price": "$24.79/SY"
    },
    {
      "service": "Manchester (TH916) \u2014 Carpet, 1200, AG Back, Roll $11.11/SY",
      "price": "$11.11/SY"
    },
    {
      "service": "Manhattan (R3000) \u2014 Carpet, 1200, SG Back, Roll $12.63/SY",
      "price": "$12.63/SY"
    },
    {
      "service": "Manhattan II (TH929) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Marguerite (TH923) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    },
    {
      "service": "Mesmerize (TH908) \u2014 Carpet, 1200, AG Back, Roll $9.26/SY",
      "price": "$9.26/SY"
    },
    {
      "service": "Mont Blanc (R3010) \u2014 Carpet, 1200, SG Back, Roll $12.63/SY",
      "price": "$12.63/SY"
    },
    {
      "service": "Mont Blanc II (TH930) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Montecito (TH925) \u2014 Carpet, 1200, AG Back, Roll $16.28/SY",
      "price": "$16.28/SY"
    },
    {
      "service": "No Ruff Days (TH503) \u2014 Carpet, 1200, AT Back, Roll $17.61/SY",
      "price": "$17.61/SY"
    },
    {
      "service": "Noble (T2315) \u2014 Carpet, 1200, SG Back, Roll $16.62/SY",
      "price": "$16.62/SY"
    },
    {
      "service": "Pacific Heights (R3028) \u2014 Carpet, 1200, AG Back, Roll $9.53/SY",
      "price": "$9.53/SY"
    },
    {
      "service": "Palisades (TH924) \u2014 Carpet, 1200, AG Back, Roll $14.60/SY",
      "price": "$14.60/SY"
    },
    {
      "service": "Papyrus 46oz (R8302) \u2014 Carpet, 1200, SG Back, Roll $15.36/SY",
      "price": "$15.36/SY"
    },
    {
      "service": "Passageway (TH921) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Pleasantries (R8031) \u2014 Carpet, 1200, SG Back, Roll $13.38/SY",
      "price": "$13.38/SY"
    },
    {
      "service": "Providence (TH917) \u2014 Carpet, 1200, AG Back, Roll $8.98/SY",
      "price": "$8.98/SY"
    },
    {
      "service": "Purrfect Plush I (TH509) \u2014 Carpet, 1200, AT Back, Roll $13.61/SY",
      "price": "$13.61/SY"
    },
    {
      "service": "Purrfect Plush II (TH508) \u2014 Carpet, 1200, AT Back, Roll $15.84/SY",
      "price": "$15.84/SY"
    },
    {
      "service": "Purrfect Plush III (TH507) \u2014 Carpet, 1200, AT Back, Roll $18.95/SY",
      "price": "$18.95/SY"
    },
    {
      "service": "Quite Fetching (TH500) \u2014 Carpet, 1200, AT Back, Roll $19.52/SY",
      "price": "$19.52/SY"
    },
    {
      "service": "Refine (TH943) \u2014 Carpet, 1200, AG Back, Roll $7.13/SY",
      "price": "$7.13/SY"
    },
    {
      "service": "Riviera (TH926) \u2014 Carpet, 1200, AG Back, Roll $13.47/SY",
      "price": "$13.47/SY"
    },
    {
      "service": "Sanctuary (TH910) \u2014 Carpet, 1200, AG Back, Roll $14.60/SY",
      "price": "$14.60/SY"
    },
    {
      "service": "Sedona (R3025) \u2014 Carpet, 1200, SG Back, Roll $12.63/SY",
      "price": "$12.63/SY"
    },
    {
      "service": "Sedona II (TH931) \u2014 Carpet, 1200, AG Back, Roll $11.22/SY",
      "price": "$11.22/SY"
    },
    {
      "service": "Soft Spoken (S1068) \u2014 Carpet, 1200, SG Back, Roll $16.67/SY",
      "price": "$16.67/SY"
    },
    {
      "service": "Summerland (TH927) \u2014 Carpet, 1200, AG Back, Roll $11.11/SY",
      "price": "$11.11/SY"
    },
    {
      "service": "Talk of the Town (R8051) \u2014 Carpet, 1200, SG Back, Roll $12.72/SY",
      "price": "$12.72/SY"
    },
    {
      "service": "Tucson (R3032) \u2014 Carpet, 1200, AG Back, Roll $10.25/SY",
      "price": "$10.25/SY"
    },
    {
      "service": "Tucson II (TH932) \u2014 Carpet, 1200, AG Back, Roll $9.53/SY",
      "price": "$9.53/SY"
    },
    {
      "service": "Verona (T2101) \u2014 Carpet, 1200, SG Back, Roll $14.60/SY",
      "price": "$14.60/SY"
    },
    {
      "service": "Verona II (TH936) \u2014 Carpet, 1200, AG Back, Roll $13.47/SY",
      "price": "$13.47/SY"
    },
    {
      "service": "Vibe (TH947) \u2014 Carpet, 1200, AG Back, Roll $14.60/SY",
      "price": "$14.60/SY"
    },
    {
      "service": "Wag-Worthy (TH504) \u2014 Carpet, 1200, AT Back, Roll $17.61/SY",
      "price": "$17.61/SY"
    },
    {
      "service": "Whisper (S1058) \u2014 Carpet, 1200, AG Back, Roll $14.63/SY",
      "price": "$14.63/SY"
    },
    {
      "service": "Windham (TH920) \u2014 Carpet, 1200, AG Back, Roll $15.72/SY",
      "price": "$15.72/SY"
    }
  ]
},
{
  "id": "sheet-duchateau-vernal-2026",
  "mfrId": "duchateau",
  "name": "DuChateau Vernal \u2014 Signature Collection",
  "effectiveDate": "2026-03-18",
  "items": [
    {
      "service": "Agno (VERAGN7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Collino D'oro (VERCLN7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Alpe Foppa (VERALF7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Montagnola (VERMTG7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Monte Bre (VERMTB7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Belvedere (VERBLV7-SS) \u2014 Vernal Signature, European White Oak, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    }
  ]
},
{
  "id": "sheet-duchateau-botteva-2026",
  "mfrId": "duchateau",
  "name": "DuChateau Botteva \u2014 Guild Hardwood",
  "effectiveDate": "2026-03-04",
  "items": [
    {
      "service": "Aspra (GBTASP7-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Serra (GBTSRA8-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Lucra (GBTLUC7-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Toura (GBTTUR8-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Natura (GBTNAT7-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Spata (GBTSPAV7-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Ambra (GBTAMB7-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Teyva (GBTTYVA8-SS) \u2014 Botteva Plank 7.5\", European White Oak, Character, Random to 74.8\"",
      "price": "$5.39/SF"
    },
    {
      "service": "Serra (GBTSRA8-SS) \u2014 Botteva Plank 8.66\", European White Oak, Character, Random to 75\"",
      "price": "$5.99/SF"
    },
    {
      "service": "Toura (GBTTUR8-SS) \u2014 Botteva Plank 8.66\", European White Oak, Character, Random to 75\"",
      "price": "$5.99/SF"
    },
    {
      "service": "Ambra (GBTAMB7-SS) \u2014 Botteva Plank 8.66\", European White Oak, Character, Random to 75\"",
      "price": "$5.99/SF"
    },
    {
      "service": "Teyva (GBTTYVA8-SS) \u2014 Botteva Plank 8.66\", European White Oak, Character, Random to 75\"",
      "price": "$5.99/SF"
    },
    {
      "service": "Aspra Herringbone (GBTASP7-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Serra Herringbone (GBTSRA8-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Lucra Herringbone (GBTLUC7-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Natura Herringbone (GBTNAT7-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Toura Herringbone (GBTTUR8-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Spata Herringbone (GBTSPAV7-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Ambra Herringbone (GBTAMB7-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    },
    {
      "service": "Teyva Herringbone (GBTTYVA8-SS) \u2014 Botteva Herringbone 3.5\", European White Oak",
      "price": "$5.39/SF"
    }
  ]
},
{
  "id": "sheet-duchateau-boiselle-2026",
  "mfrId": "duchateau",
  "name": "DuChateau Boiselle \u2014 Guild Hardwood",
  "effectiveDate": "2026-03-04",
  "items": [
    {
      "service": "Ivore (GBLIVR7-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Fauve (GBLFAU8-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Sable (GBLSBL7-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Alure (GBLALR7-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Selle (GBLSEL8-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Marune (GBLMRU7-SS) \u2014 Boiselle Plank 7.5\", European White Oak, Select, Random to 74.8\"",
      "price": "$6.69/SF"
    },
    {
      "service": "Selle (GBLSEL8-SS) \u2014 Boiselle Plank 8.66\", European White Oak, Select, Random to 74.8\"",
      "price": "$7.29/SF"
    },
    {
      "service": "Fauve (GBLFAU8-SS) \u2014 Boiselle Plank 8.66\", European White Oak, Select, Random to 74.8\"",
      "price": "$7.29/SF"
    },
    {
      "service": "Sable (GBLSBL7-SS) \u2014 Boiselle Plank 8.66\", European White Oak, Select, Random to 74.8\"",
      "price": "$7.29/SF"
    },
    {
      "service": "Marune (GBLMRU7-SS) \u2014 Boiselle Plank 8.66\", European White Oak, Select, Random to 74.8\"",
      "price": "$7.29/SF"
    },
    {
      "service": "Ivore Herringbone (GBLIVR7-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Fauve Herringbone (GBLFAU8-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Sable Herringbone (GBLSBL7-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Alure Herringbone (GBLALR7-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Selle Herringbone (GBLSEL8-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Marune Herringbone (GBLMRU7-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Brune Herringbone (GBLBRU8-SS) \u2014 Boiselle Herringbone 3.5\", European White Oak",
      "price": "$6.69/SF"
    },
    {
      "service": "Selle Herringbone (GBLSEL8-SS) \u2014 Boiselle Herringbone 8.66\", European White Oak",
      "price": "$7.29/SF"
    },
    {
      "service": "Fauve Herringbone (GBLFAU8-SS) \u2014 Boiselle Herringbone 8.66\", European White Oak",
      "price": "$7.29/SF"
    },
    {
      "service": "Sable Herringbone (GBLSBL7-SS) \u2014 Boiselle Herringbone 8.66\", European White Oak",
      "price": "$7.29/SF"
    },
    {
      "service": "Marune Herringbone (GBLMRU7-SS) \u2014 Boiselle Herringbone 8.66\", European White Oak",
      "price": "$7.29/SF"
    }
  ]
},
{
  "id": "sheet-duchateau-beaujou-2026",
  "mfrId": "duchateau",
  "name": "DuChateau Beaujou \u2014 Guild Hardwood",
  "effectiveDate": "2026-03-04",
  "items": [
    {
      "service": "Clou (GBECLU7-SS) \u2014 Beaujou, European White Oak, Character, 7.5\" wide, 5/8\" thick",
      "price": "$7.49/SF"
    },
    {
      "service": "Ekru (GBEKRU7-SS) \u2014 Beaujou, European White Oak, Character, 7.5\" wide, 5/8\" thick",
      "price": "$7.49/SF"
    },
    {
      "service": "Coteu (GBECTU7-SS) \u2014 Beaujou, European White Oak, Character, 7.5\" wide, 5/8\" thick",
      "price": "$7.49/SF"
    },
    {
      "service": "Modeu (GBEMDU7-SS) \u2014 Beaujou, Black Walnut, Character, 7.5\" wide, 5/8\" thick",
      "price": "$10.35/SF"
    },
    {
      "service": "Toru (GBETRU7-SS) \u2014 Beaujou, European White Oak, Character, 7.5\" wide, 5/8\" thick",
      "price": "$7.49/SF"
    },
    {
      "service": "Obsu (GBEBSU7-SS) \u2014 Beaujou, European White Oak, Character, 7.5\" wide, 5/8\" thick",
      "price": "$7.49/SF"
    }
  ]
},
{"id": "sheet-triwest-quickstep-2026", "mfrId": "triwest", "name": "Quick Step Laminate — June 2026", "effectiveDate": "2026-06-01", "items": [{"service": "Quick Step Laminate Jetstream Oak (UPR7966) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Glider Oak (UPR7967) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Aviator Oak (UPR9816) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Cargo Oak (UPR9817) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Horizon Hickory (UPR9994) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Eclipse Hickory (UPR9995) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Solstice Hickory (UPR6135) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Sunbeam Hickory (UPR6134) — NatureTEK Waterproof, 22.04 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Tapioca Oak (UPB5880) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Burrow Oak (UPB5881) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Tannin Oak (UPB5882) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Hutia Oak (UPB5883) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Parchment Oak (USB7320) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Gilded Page Oak (USB7323) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Leather Bound Oak (USB7324) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Caligraphy Oak (USB7326) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Buttertoast Oak (UP3432) — NatureTEK Waterproof, 22.09 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Landor Oak (UP4021) — NatureTEK Waterproof, 22.09 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Wheat Oak (UP4022) — NatureTEK Waterproof, 22.09 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Summit Oak (UP4023) — NatureTEK Waterproof, 22.09 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Woodland Oak (UP3230) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Dutch Oak (UP3231) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Gable Oak (UP1858) — NatureTEK Waterproof, 22.58 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Requisite Oak (UP5426) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Rocky River Oak (UP5424) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Russet Oak (UP5423) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Garner Oak (UC3924) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Denali Oak (UC3926) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Nomad Oak (UPB3571) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Cloudburst Oak (UPB3862) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Russet Oak (UPB3551) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Honeycomb Oak (UPB3545) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Ashen Oak (UPB3552) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Providence Oak (UC4043) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Grain Oak (UP5877) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Dried Clay Oak (UP5878) — NatureTEK Waterproof, 26.48 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Heathered Oak (UF1574W) — NatureTEK Waterproof, 16.93 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Malted Tawny Oak (UF1548W) — NatureTEK Waterproof, 16.93 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Heathered Oak (UF1574G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Malted Tawny Oak (UF1548G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Mocha Oak (UF1578G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate White Wash Oak (UF1667G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Jefferson Oak (UF4202G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Hamilton Oak (UF4204G) — NatureTEK Waterproof, 19.76 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Golden Nest Oak (US5856) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Brown Thrasher Oak (US4897) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Pampas Grass (US4217) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Portland Taupe EIR (US6561) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Smokey Taupe EIR (US6562) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}, {"service": "Quick Step Laminate Sonoran Beige EIR (US6564) — NatureTEK Waterproof, 19.63 SF/ctn", "price": "Call for pricing"}]},
{"id": "sheet-triwest-artisan-2026", "mfrId": "triwest", "name": "Artisan Collection Laminate — June 2026", "effectiveDate": "2026-06-01", "items": [{"service": "Artisan Select Croft Oak Light (NEUP02) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Malibu Chestnut (NEUP03) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Vermont Maple (NEUP04) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Croft Oak Fawn (NEUP08) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Croft Oak Natural (NEUP09) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Croft Oak Rust (NEUP10) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Heirloom Oak (NEUP11) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Salt Glaze Oak (NEUP14) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Craftsman Natural (NEUP16) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Cashew Oak (NEUP17) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Craftsman Bark (NEUP18) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Almond Oak (NEUP19) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Peanut Oak (NEUP20) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Artisan Select Craftsman Cedar (NEUP21) — Laminate 10mm+2mm pad, 7.48x47.24, AC4, Made in USA, 22.09 SF/ctn", "price": "$3.99/SF · $88.14/ctn"}, {"service": "Underlayment Platinum Wood/Lam (LU39D) — IIC-72 3mm, 100 SF/roll", "price": "$37.99/roll"}, {"service": "Underlayment Platinum Vinyl (VU39D) — IIC-71 1.5mm, 100 SF/roll", "price": "$51.99/roll"}, {"service": "Underlayment Real Sound (LU10D) — IIC-68 2mm, 100 SF/roll", "price": "$28.99/roll"}, {"service": "Underlayment Moisture Guard (LU8AD) — IIC-68 3mm, 100 SF/roll", "price": "$21.99/roll"}, {"service": "Quick Step Unifix Tool (QSUNIFIXTO) — 6 units/ctn", "price": "$80.00/each"}, {"service": "Uniclic Installation Kit (QSK300) — tapping block, crowbar, spacers, 10 kits/ctn", "price": "$23.00/each"}]},
{
  "id": "sheet-triwest-armstrong-2026",
  "mfrId": "triwest",
  "name": "Armstrong Commercial Sheet Vinyl \u2014 June 2026",
  "effectiveDate": "2026-06-01",
  "items": [
    {
      "service": "Armstrong Crown Texture 1/8\" \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$1.87/SF"
    },
    {
      "service": "Armstrong Imperial Texture & Multicolor 1/8\" \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$1.69/SF"
    },
    {
      "service": "Armstrong Stonetex Premium Excelon \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$3.57/SF"
    },
    {
      "service": "Armstrong Safety Zone \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$7.17/SF"
    },
    {
      "service": "Armstrong Excelon SDT Static Dissipative \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$8.02/SF"
    },
    {
      "service": "Armstrong Feature Tile Group I Black \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$6.43/SF"
    },
    {
      "service": "Armstrong Feature Tile Group II All Others \u2014 Commercial Vinyl Tile, 45 SF/Ctn",
      "price": "$7.92/SF"
    },
    {
      "service": "Armstrong S515 Adhesive Gallon \u2014 Commercial Thin Spread, 350-400 SF/gal",
      "price": "$24.10/gal"
    },
    {
      "service": "Armstrong S515 Adhesive 4 Gallon \u2014 Commercial Thin Spread, 350-400 SF/gal",
      "price": "$79.91/pail"
    },
    {
      "service": "Armstrong Floor Polish S480 Gallon \u2014 1500-2000 SF coverage",
      "price": "$37.28/gal"
    },
    {
      "service": "Armstrong Floor Cleaner S485 Gallon",
      "price": "$31.51/gal"
    }
  ]
},
{
  "id": "sheet-triwest-ahf-2026",
  "mfrId": "triwest",
  "name": "AHF Contract Commercial \u2014 June 2026",
  "effectiveDate": "2026-06-01",
  "items": [
    {
      "service": "AHF Homogeneous Sheet Mixed & Variegated \u2014 6'7\" .080, Full Spread, Roll price",
      "price": "$21.99/SY"
    },
    {
      "service": "AHF Homogeneous Sheet Mixed & Variegated \u2014 6'7\" .080, Full Spread, Cut price",
      "price": "$23.99/SY"
    },
    {
      "service": "AHF Heterogeneous Sheet Concepts of Landscape \u2014 6'7\" .080, Full Spread, Roll",
      "price": "$21.99/SY"
    },
    {
      "service": "AHF Heterogeneous Sheet Concepts of Landscape \u2014 6'7\" .080, Full Spread, Cut",
      "price": "$23.99/SY"
    },
    {
      "service": "AHF Inlaid Sheet Distinct \u2014 6' .080, Full Spread, Roll price",
      "price": "$19.99/SY"
    },
    {
      "service": "AHF Inlaid Sheet Distinct \u2014 6' .080, Full Spread, Cut price",
      "price": "$21.99/SY"
    },
    {
      "service": "Nod to Nature Rewilding 2.5mm LVT Plank 7\"x48\" \u2014 Dry Back",
      "price": "$2.55/SF"
    },
    {
      "service": "Nod to Nature Rewilding 2.5mm LVT Plank 9\"x60\" \u2014 Dry Back",
      "price": "$2.55/SF"
    },
    {
      "service": "Nod to Nature Rewilding 2.5mm LVT Tile 12\"x24\" \u2014 Dry Back",
      "price": "$2.55/SF"
    },
    {
      "service": "Nod to Nature Rewilding 2.5mm LVT Tile 16\"x32\" \u2014 Dry Back",
      "price": "$2.55/SF"
    },
    {
      "service": "Nod to Nature Individuality 5.0mm LVT Plank 7\"x48\"",
      "price": "$3.90/SF"
    },
    {
      "service": "Nod to Nature Individuality 5.0mm LVT Plank 9\"x60\"",
      "price": "$3.90/SF"
    },
    {
      "service": "Nod to Nature Individuality 5.0mm LVT Tile 12\"x24\"",
      "price": "$3.90/SF"
    },
    {
      "service": "Bruce Bondlink Adhesive \u2014 Hardset Transitional PS, 220-260 SF/gal",
      "price": "Call"
    },
    {
      "service": "S763 Seam Sealer 8oz",
      "price": "$14.65"
    },
    {
      "service": "Solid Color Welding Rod Vinyl \u2014 165 lin ft/spool",
      "price": "$76.52/spool"
    }
  ]
}
,
{
  "id": "sheet-armstrong-residential-2026",
  "mfrId": "triwest",
  "name": "Armstrong Residential — May 5, 2026",
  "effectiveDate": "2026-05-05",
  "items": [
    {"service": "Armstrong CushionStep Better w/D10 — Sheet Flooring, 12', Full Roll", "price": "$15.59/SY"},
    {"service": "Armstrong CushionStep Better w/D10 — Sheet Flooring, 12', Custom Order", "price": "$17.09/SY"},
    {"service": "Armstrong Flexstep Value Plus — Sheet Flooring, 12', Full Roll", "price": "$5.59/SY"},
    {"service": "Armstrong Flexstep Value Plus — Sheet Flooring, 12', Custom Order", "price": "$7.59/SY"},
    {"service": "Armstrong Traditions — Sheet Flooring, 6' & 12', Full Roll", "price": "$6.39/SY"},
    {"service": "Armstrong Traditions — Sheet Flooring, 6' & 12', Custom Order", "price": "$7.39/SY"},
    {"service": "Armstrong Progressions — Sheet Flooring, 6' & 12', Full Roll", "price": "$7.69/SY"},
    {"service": "Armstrong Progressions — Sheet Flooring, 6' & 12', Custom Order", "price": "$8.69/SY"},
    {"service": "Armstrong StrataMax Pro w/D10 — Sheet Flooring, 12', Full Roll", "price": "$6.69/SY"},
    {"service": "Armstrong StrataMax Pro w/D10 — Sheet Flooring, 12', Custom Order", "price": "$8.69/SY"},
    {"service": "Armstrong Flexstep Pro w/D10 — Sheet Flooring, 12', Full Roll", "price": "$8.99/SY"},
    {"service": "Armstrong Flexstep Pro w/D10 — Sheet Flooring, 12', Custom Order", "price": "$9.99/SY"},
    {"service": "Armstrong American Charm 6 — LVT Tile, 35.95 SF/ctn", "price": "$1.69/SF"},
    {"service": "Armstrong American Charm 12 — LVT Tile, 35.95 SF/ctn", "price": "$1.75/SF"},
    {"service": "Armstrong American Personality Pro D10 — LVP Plank, 38.88 SF/ctn", "price": "$1.75/SF"},
    {"service": "Armstrong Lutea Zen 12mil — SPC Plank, 29.53 SF/ctn", "price": "$2.99/SF"},
    {"service": "Armstrong Lutea Paradise 20mil — SPC Plank, 29.67 SF/ctn", "price": "$3.49/SF"},
    {"service": "Armstrong SPC Quarter Round — 94\" length", "price": "$8.98/ea"},
    {"service": "Armstrong SPC T Molding — 94\" length", "price": "$43.00/ea"},
    {"service": "Armstrong SPC Reducer — 94\" length", "price": "$47.28/ea"},
    {"service": "Armstrong SPC Threshold — 94\" length", "price": "$43.00/ea"},
    {"service": "Armstrong SPC Flush Stair Nose — 94\" length", "price": "$50.57/ea"},
    {"service": "Armstrong LVT/LVP Multi Purpose Trim — 94\" length", "price": "$42.97/ea"},
    {"service": "Armstrong LVT/LVP Stair Nose — 94\" length", "price": "$46.04/ea"},
    {"service": "Armstrong S299-108 Sheet Adhesive — 220-260 SF/gal", "price": "$46.68/ea"},
    {"service": "Armstrong S299-418 Sheet Adhesive — 4-gal pail", "price": "$171.25/pail"},
    {"service": "Armstrong S295-108 Sheet Adhesive — 220-260 SF/gal", "price": "$41.42/ea"},
    {"service": "Armstrong S295-418 Sheet Adhesive — 4-gal pail", "price": "$171.25/pail"},
    {"service": "Armstrong S-761 Seam Adhesive — Fiber Glass Back", "price": "$14.65/ea"},
    {"service": "Armstrong S-309 New Beginning Deep Cleaning Stripper — 1 qt", "price": "$110.66/ctn"},
    {"service": "Armstrong S-330 Once N Done Cleaner No-Rinse — 1 qt", "price": "$93.66/ctn"},
    {"service": "Armstrong S-330 Once N Done Cleaner No-Rinse — 1 gal", "price": "$84.70/ctn"},
    {"service": "Armstrong S-338 Once N Done Cleaner Concentrate — 1 qt", "price": "$98.30/ctn"},
    {"service": "Armstrong S-338 Once N Done Cleaner Concentrate — 1 gal", "price": "$106.34/ctn"},
    {"service": "Armstrong S-390 Shine Keeper Floor Polish — 1 qt", "price": "$106.03/ctn"},
    {"service": "Armstrong S-390 Shine Keeper Floor Polish — 1/2 gal", "price": "$165.07/ctn"},
    {"service": "Armstrong S-391 Shine Keeper Resilient Floor Finish — 32 oz", "price": "$85.94/ctn"},
    {"service": "Armstrong S-385 Satin Keeper Floor Finish — 1 qt", "price": "$13.55/ea"}
  ]
},
{
  "id": "sheet-armstrong-commercial-2026",
  "mfrId": "triwest",
  "name": "Armstrong Commercial — May 5, 2026",
  "effectiveDate": "2026-05-05",
  "items": [
    {"service": "Armstrong Medintone w/D10 — Commercial Sheet, 6.5', Roll", "price": "$29.99/SY"},
    {"service": "Armstrong Medintone w/D10 — Commercial Sheet, 6.5', Cut", "price": "$31.99/SY"},
    {"service": "Armstrong Medinpure w/D10 — Commercial Sheet, 6.56', Roll", "price": "$73.67/SY"},
    {"service": "Armstrong Medinpure w/D10 — Commercial Sheet, 6.56', Cut", "price": "$75.67/SY"},
    {"service": "Armstrong Natralis — Commercial Sheet, 6', Roll", "price": "$44.99/SY"},
    {"service": "Armstrong Natralis — Commercial Sheet, 6', Cut", "price": "$46.99/SY"},
    {"service": "Armstrong Nidra — Commercial Sheet, 6.56', Roll", "price": "$38.99/SY"},
    {"service": "Armstrong Nidra — Commercial Sheet, 6.56', Cut", "price": "$40.99/SY"},
    {"service": "Armstrong Zenscape — Commercial Sheet, 6.56', Roll", "price": "$38.99/SY"},
    {"service": "Armstrong Zenscape — Commercial Sheet, 6.56', Cut", "price": "$40.99/SY"},
    {"service": "Armstrong Crown Texture 1/8 — VCT, 45 SF/ctn", "price": "$1.87/SF"},
    {"service": "Armstrong Imperial Texture & Multicolor 1/8 — VCT, 45 SF/ctn", "price": "$1.69/SF"},
    {"service": "Armstrong Stonetex Premium Excelon — VCT, 45 SF/ctn", "price": "$3.57/SF"},
    {"service": "Armstrong Safety Zone — VCT, 45 SF/ctn", "price": "$7.17/SF"},
    {"service": "Armstrong Excelon SDT Static Dissipative Tile — VCT, 45 SF/ctn", "price": "$8.02/SF"},
    {"service": "Armstrong Feature Tile Group I Black — VCT, 45 SF/ctn", "price": "$6.43/SF"},
    {"service": "Armstrong Feature Tile Group II All Others — VCT, 45 SF/ctn", "price": "$7.92/SF"},
    {"service": "Armstrong Feature Strip 2x24 — 48 lineal feet", "price": "$142.88/pkg"},
    {"service": "Armstrong Feature Strip 4x24 (200 ft) — Special Order", "price": "$1,372.75"},
    {"service": "Armstrong Feature Strip 6x24 (100 ft) — Special Order", "price": "$1,032.69"},
    {"service": "Armstrong Basketball Court 1/8 #50517 — Black", "price": "$2,171.55"},
    {"service": "Armstrong Shuffleboard Unit #50509-831 — Red/White/Blue", "price": "$532.47"},
    {"service": "Armstrong Parallel USA 20mil Plank — LVT, 6x48, 36 SF/ctn", "price": "$1.85/SF"},
    {"service": "Armstrong Parallel USA 20mil Tile — LVT, 18x18, 36 SF/ctn", "price": "$1.85/SF"},
    {"service": "Armstrong Parallel USA 12mil Plank — LVT, 6x48, 36 SF/ctn", "price": "$1.62/SF"},
    {"service": "Armstrong Parallel USA 12mil Tile — LVT, 18x18, 36 SF/ctn", "price": "$1.62/SF"},
    {"service": "Armstrong Unify 20mil Plank 6x36 — LVT, 36 SF/ctn", "price": "$2.67/SF"},
    {"service": "Armstrong Unify 20mil Plank 6x48 — LVT, 36 SF/ctn", "price": "$2.67/SF"},
    {"service": "Armstrong Unify 20mil Tile 18x18 — LVT, 36 SF/ctn", "price": "$2.67/SF"},
    {"service": "Armstrong Natural Creations w/D10 — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Earth Cuts w/D10 — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Mystix w/D10 — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Theorem 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Exchange 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Coalesce 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Biome 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Terra 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Duo 20mil — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Armstrong Mixtera — Commercial LVT (Call for project pricing)", "price": "CALL"},
    {"service": "Timbertones 3/8x6.5 Engineered Hardwood — 34 SF/ctn (Call for project pricing)", "price": "CALL"},
    {"service": "Timbertones 1/2x7.5 Engineered Hardwood — 29.5 SF/ctn (Call for project pricing)", "price": "CALL"},
    {"service": "Timbertones 7/16x7.5 Engineered Hardwood — 28 SF/ctn (Call for project pricing)", "price": "CALL"},
    {"service": "Timbertones 1/2x8.5 Engineered Hardwood — 32 SF/ctn (Call for project pricing)", "price": "CALL"},
    {"service": "Timbertones Reducer Molding — 78 inch", "price": "$63.96/ea"},
    {"service": "Timbertones Threshold Molding — 78 inch", "price": "$104.47/ea"},
    {"service": "Timbertones T-Molding — 78 inch", "price": "$68.22/ea"},
    {"service": "Timbertones Quarter Round — 78 inch", "price": "$27.72/ea"},
    {"service": "Timbertones Flush Stair Nose — 78 inch", "price": "$104.47/ea"},
    {"service": "Armstrong S202-108 Static Dissipative Tile Adhesive", "price": "$183.09/ea"},
    {"service": "Armstrong S202-418 Static Dissipative Tile Adhesive 4-gal", "price": "$402.84/pail"},
    {"service": "Armstrong S-515-408 Clear Thin Spread Adhesive Gallon", "price": "$24.10/gal"},
    {"service": "Armstrong S515-418 Clear Thin Spread Adhesive 4-gal", "price": "$79.91/pail"},
    {"service": "Armstrong 00SPR601 Spray Adhesive 22oz", "price": "$45.48/ea"},
    {"service": "Armstrong S319-108 LVT Adhesive", "price": "$53.63/ea"},
    {"service": "Armstrong S319-418 LVT Adhesive 4-gal", "price": "$200.19/pail"},
    {"service": "Armstrong S995-108 LVT Adhesive Gallon", "price": "$69.41/gal"},
    {"service": "Armstrong S995-418 LVT Adhesive 4-gal", "price": "$213.37/pail"},
    {"service": "Armstrong S-1000-208 LVT Adhesive 2-gal", "price": "$275.56/pail"},
    {"service": "Armstrong S-995 Sheet Vinyl Adhesive Gallon", "price": "$69.41/gal"},
    {"service": "Armstrong S-995 Sheet Vinyl Adhesive 4-gal", "price": "$213.37/pail"},
    {"service": "Armstrong S-1000 Sheet Vinyl Adhesive 2-gal", "price": "$275.56/pail"},
    {"service": "Armstrong Solid Color Welding Rod Vinyl — 164 lin ft/spool", "price": "$76.52/spool"},
    {"service": "Armstrong S-763 Seam Sealer — 144 lin ft/8oz", "price": "$14.65/ea"},
    {"service": "Armstrong S-762 Seam Coat Pen", "price": "$15.41/ea"},
    {"service": "Armstrong Floor Polish S480-408 Gallon", "price": "$37.28/gal"},
    {"service": "Armstrong Floor Polish S480-508 5-Gallon", "price": "$162.50"},
    {"service": "Armstrong Floor Cleaner S485-408 Gallon", "price": "$31.51/gal"},
    {"service": "Armstrong Floor Cleaner S485-508 5-Gallon", "price": "$141.08"},
    {"service": "Armstrong Static Dissipative Tile Polish S392-408 Gallon", "price": "$82.17/gal"},
    {"service": "Armstrong S462 Floor Prep Epoxy Part A&B — 1.65 gal", "price": "$373.80/ea"},
    {"service": "Armstrong S463 Level Strong — 50 lb bag", "price": "$68.59/ea"},
    {"service": "Armstrong S466 Patch Strong — 10 lb bag", "price": "$28.22/ea"},
    {"service": "Armstrong S465 Prime Strong Non-Porous — 1 gal", "price": "$96.00/ea"},
    {"service": "Armstrong S464 Prime Strong Porous — 2.6 gal", "price": "$52.93/ea"},
    {"service": "Armstrong S185-418 Latex Primer — 4 gal", "price": "$69.86/ea"},
    {"service": "Armstrong S195-408 Underlayment Additive Gallon", "price": "$30.28/ea"},
    {"service": "Armstrong S725-125 Cove Base Adhesive — 30 oz", "price": "$8.17/ea"},
    {"service": "Armstrong S725-418 Cove Base Adhesive — 4 gal", "price": "$98.04/pail"}
  ]
},
{
  "id": "sheet-ahf-contract-commercial-2026",
  "mfrId": "triwest",
  "name": "AHF Contract Commercial — May 5, 2026",
  "effectiveDate": "2026-05-05",
  "items": [
    {"service": "AHF Mixed & Variegated Homogeneous Sheet — 6ft7 .080, Roll", "price": "$21.99/SY"},
    {"service": "AHF Mixed & Variegated Homogeneous Sheet — 6ft7 .080, Cut", "price": "$23.99/SY"},
    {"service": "AHF Concepts of Landscape Heterogeneous Sheet — 6ft7 .080, Roll", "price": "$21.99/SY"},
    {"service": "AHF Concepts of Landscape Heterogeneous Sheet — 6ft7 .080, Cut", "price": "$23.99/SY"},
    {"service": "AHF Distinct Inlaid Sheet — 6ft .080, Roll", "price": "$19.99/SY"},
    {"service": "AHF Distinct Inlaid Sheet — 6ft .080, Cut", "price": "$21.99/SY"},
    {"service": "AHF Nod to Nature Rewilding 2.5mm LVT Plank 7x48 — Dry Back", "price": "$2.55/SF"},
    {"service": "AHF Nod to Nature Rewilding 2.5mm LVT Plank 9x60 — Dry Back", "price": "$2.55/SF"},
    {"service": "AHF Nod to Nature Rewilding 2.5mm LVT Tile 12x24 — Dry Back", "price": "$2.55/SF"},
    {"service": "AHF Nod to Nature Rewilding 2.5mm LVT Tile 16x32 — Dry Back", "price": "$2.55/SF"},
    {"service": "AHF Nod to Nature Individuality 5.0mm LVT Plank 7x48", "price": "$3.90/SF"},
    {"service": "AHF Nod to Nature Individuality 5.0mm LVT Plank 9x60", "price": "$3.90/SF"},
    {"service": "AHF Nod to Nature Individuality 5.0mm LVT Tile 12x24", "price": "$3.90/SF"},
    {"service": "AHF Nod to Nature Individuality 5.0mm LVT Tile 16x32", "price": "$3.90/SF"},
    {"service": "AHF Nod to Nature USA 4.5mm LVT Plank 9x48 — Call for project pricing", "price": "CALL"},
    {"service": "AHF Nod to Nature USA 2.5mm LVT Plank 9x48 — Call for project pricing", "price": "CALL"},
    {"service": "AHF Nod to Nature USA 2.5mm LVT Tile 6x48", "price": "CALL"},
    {"service": "AHF Nod to Nature USA 2.5mm LVT Tile 18x18", "price": "CALL"},
    {"service": "AHF Nod to Nature USA 2.5mm LVT Tile 18x36", "price": "CALL"},
    {"service": "AHF Nod to Nature USA 2.5mm LVT Tile 12x24", "price": "CALL"},
    {"service": "AHF Expressive Ideas VBT Tile 12x12 — 36.04 SF/ctn", "price": "$2.29/SF"},
    {"service": "AHF Iliad VCT 12x12 1/8 — 45 SF/ctn", "price": "$2.28/SF"},
    {"service": "AHF Highlights VCT 12x12 1/8 — 45 SF/ctn", "price": "$2.28/SF"},
    {"service": "Bruce Bondlink Adhesive 4-gal WFTBRUCE-BLINK-4", "price": "$137.90"},
    {"service": "Bruce Bondlink Adhesive 1-gal WFTBRUCE-BLINK-1", "price": "$37.52"},
    {"service": "Bruce Apex Pro 2-gal WFTBRUCE-APRO-2", "price": "$171.25"},
    {"service": "AHF S763 Seam Sealer 8oz", "price": "$14.65/ea"},
    {"service": "AHF Solid Color Welding Rod Vinyl — 165 lin ft/spool", "price": "$76.52/spool"},
    {"service": "AHF S995-108 LVT Adhesive Gallon", "price": "$69.41/gal"},
    {"service": "AHF S995-418 LVT Adhesive 4-gal", "price": "$213.37/pail"},
    {"service": "AHF S-515-408 Clear Thin Spread Gallon", "price": "$24.10/gal"},
    {"service": "AHF S515-418 Clear Thin Spread 4-gal", "price": "$79.91/pail"},
    {"service": "AHF S319-108 LVT Adhesive", "price": "$53.63/ea"},
    {"service": "AHF S319-418 LVT Adhesive 4-gal", "price": "$200.19/pail"},
    {"service": "AHF S-1000-208 LVT Adhesive 2-gal", "price": "$275.56"},
    {"service": "AHF S462 Floor Prep Epoxy Part A&B — 1.65 gal", "price": "$373.80/ea"},
    {"service": "AHF S463 Level Strong — 50 lb bag", "price": "$68.59/ea"},
    {"service": "AHF S466 Patch Strong — 10 lb bag", "price": "$28.22/ea"},
    {"service": "AHF S465 Prime Strong Non-Porous — 1 gal", "price": "$96.00/ea"},
    {"service": "AHF S464 Prime Strong Porous — 2.6 gal", "price": "$52.93/ea"}
  ]
},
{
  "id": "sheet-versacore-pure-edge-2026",
  "mfrId": "bigd",
  "name": "Versa Core Pure Edge LVP — Feb 2026",
  "effectiveDate": "2026-02-01",
  "items": [{"service": "Versa Core Pure Edge Baha Bay (VPE9972BB) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Bluff (VPE5972BF) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Buckhead (VPE9972BH) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Cobblestone (VPE9972CB) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Hillcrest Trail (VPE9972HL) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Havana Tan (VPE9972HT) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Macaroon (VPE9972MC) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Navajo (VPE9972NV) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Palm Mist (VPE9972PM) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge Sand Dune (VPE9972SD) — LVP 9mm x 9x72, 28mil EIR, 27 SF/ctn", "price": "$3.69/SF · $99.63/ctn"}, {"service": "Versa Core Pure Edge 48in Round Stair Tread — 48x12x1.18in", "price": "$85.00/ea"}, {"service": "Versa Core Pure Edge 48in Square Stair Tread — 48x12x1.57in", "price": "$85.00/ea"}, {"service": "Versa Core Pure Edge 94in Flush Round Stair Nose — 94.5x4.5x1.18in", "price": "$33.00/ea"}, {"service": "Versa Core Pure Edge 94in Flush Square Stair Nose — 94.5x4.5x1.57in", "price": "$33.00/ea"}, {"service": "Versa Core Pure Edge 94in Quarter Round — 94.5x1.1x0.59in", "price": "$11.00/ea"}, {"service": "Versa Core Pure Edge 94in Flat Reducer — 94.5x1.7x0.43in", "price": "$16.00/ea"}, {"service": "Versa Core Pure Edge 94in Threshold/End Cap — 94.5in", "price": "$16.00/ea"}, {"service": "Versa Core Pure Edge 94in Flat T-Mold — 94.5x1.7x0.47in", "price": "$16.00/ea"}, {"service": "Versa Core Pure Edge 94in Square Nose — 94.5x1.4x0.43in", "price": "$16.00/ea"}]
},
{
  "id": "sheet-bigd-reserve-2025",
  "mfrId": "bigd",
  "name": "Reserve Collection Hardwood — Nov 2025",
  "effectiveDate": "2025-11-23",
  "items": [{"service": "Reserve Collection Cream (SORSV-101) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Coastal Fog (SORSV-103) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Forest (SORSV-105) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Cafe Mocha (SORSV-107) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Hazel (SORSV-108) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Pearl (SORSV-109) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Estate (SORSV-110) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Truffle (SORSV-111) — European Oak 1/2x8-5/8 Wire Brushed, 31.26 SF/ctn", "price": "$5.29/SF · $165.37/ctn"}, {"service": "Reserve Collection Quarter Round 90in — all colors", "price": "$49.00/ea"}, {"service": "Reserve Collection Reducer 90in — all colors", "price": "$79.00/ea"}, {"service": "Reserve Collection Flush Round Stair Nose 90in — all colors", "price": "$116.00/ea"}, {"service": "Reserve Collection Square Stair Nose 90in — all colors", "price": "$116.00/ea"}, {"service": "Reserve Collection Threshold 90in — all colors", "price": "$79.00/ea"}, {"service": "Reserve Collection T-Mold 90in — all colors", "price": "$79.00/ea"}, {"service": "Big D Q2 2026 Spiff — Reserve Collection earns $3.00 per carton (April 1 - June 30 2026)", "price": "$3.00/ctn spiff"}]
},
{"id": "sheet-provenza-hardwood-2026", "mfrId": "triwest", "name": "Provenza Hardwood — April 2026", "effectiveDate": "2026-04-14", "items": [{"service": "Provenza Old World Desert Haze (664) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Fossil Stone (667) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Warm Sand (668) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Aged Alabaster (693) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Weathered Ash (695) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Toasted Sesame (634) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Grey Rocks (643) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Mink (644) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Old World Pearl Grey (645) — Siberian Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$7.49/SF · $222.90/ctn"}, {"service": "Provenza Pompeii Oak Lipari (720) — European Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$9.79/SF · $291.35/ctn"}, {"service": "Provenza Pompeii Oak Vesuvius (721) — European Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$9.79/SF · $291.35/ctn"}, {"service": "Provenza Pompeii Oak Amiata (722) — European Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$9.79/SF · $291.35/ctn"}, {"service": "Provenza Pompeii Oak Sabatini (724) — European Oak 7.44inW x 5/8 x RL6ft, UV Oil, 29.76 SF/ctn", "price": "$9.79/SF · $291.35/ctn"}, {"service": "Provenza Lugano Bella (4200) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Como (4202) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Forma (4203) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Oro (4204) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Terra (4207) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Felice (4211) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Lugano Genre (4215) — European Oak 9/16 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.60/SF · $484.85/ctn"}, {"service": "Provenza Volterra Grotto (2804) — ABCDE Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Fortezza (2813) — ABCD Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Porta (2816) — ABCD Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Valori (2819) — ABCD Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Dogana (2824) — ABCD Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Greco (2825) — ABCD Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$15.10/SF · $469.31/ctn"}, {"service": "Provenza Volterra Messina (2828) — AB Grade, 5/8 x 7.48inW x RL74.8in, Polyurethane, 31.08 SF/ctn", "price": "$16.50/SF · $512.82/ctn"}, {"service": "Provenza NY Loft Big Apple (2700) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Canal Street (2701) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Grand Central (2703) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Park Place (2706) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Pier 55 (2707) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Penn Station (2708) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Music Hall (2721) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Marquee (2722) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Saratoga (2723) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Continental (2724) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft Midtown (2725) — ABCD Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$7.06/SF · $164.61/ctn"}, {"service": "Provenza NY Loft West End (2711) — AB Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$8.49/SF · $197.90/ctn"}, {"service": "Provenza NY Loft Carnegie Hall (2712) — AB Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$8.49/SF · $197.90/ctn"}, {"service": "Provenza NY Loft Ferry Point (2719) — AB Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$8.49/SF · $197.90/ctn"}, {"service": "Provenza NY Loft Rock Island (2720) — AB Grade, European Oak 5/8 x 7.48inW x RL74.8in, 23.31 SF/ctn", "price": "$8.49/SF · $197.90/ctn"}, {"service": "Provenza Tresor Amour (2500) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Classique (2501) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Diamonte (2502) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Jolie (2504) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Symphonie (2507) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Rondo (2512) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Blanche (2515) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Rivoli (2516) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Provence (2517) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Martinique (2518) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Agio (2519) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza Tresor Cherie (2520) — European Oak 9.45inW x 5/8 x 23and86in RL, Polyurethane, 34.1 SF/ctn", "price": "$16.00/SF · $545.60/ctn"}, {"service": "Provenza African Plains Sahara Sun (593) — Hevea 5inW x 9/16 x 43.3in, Polyurethane, 15 SF/ctn", "price": "$5.29/SF · $79.35/ctn"}, {"service": "Provenza Antico Chamboard (247) — Hevea 5.5inW x 9/16 x 47in, Polyurethane, 9 SF/ctn", "price": "$5.49/SF · $49.41/ctn"}, {"service": "Provenza Antico Heritage (347) — Hevea 5.5inW x 9/16 x 47in, Polyurethane, 9 SF/ctn", "price": "$5.49/SF · $49.41/ctn"}, {"service": "Provenza Affinity Delight (2301) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Intrigue (2302) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Journey (2303) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Liberation (2304) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Mellow (2305) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Obsession (2306) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Silhouette (2309) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Triumph (2310) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Acclaim (2313) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Celebration (2314) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Engage (2315) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Legacy (2316) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Serenity (2317) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Contour (2318) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Appeal (2319) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Cameo (2320) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Charmed (2321) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Glam (2322) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Affinity Grandeur (2323) — European Oak 1/2 x 7.5inW x RL82.67in, 2mm Sliced, 34.36 SF/ctn", "price": "$4.49/SF · $154.28/ctn"}, {"service": "Provenza Vitali Elite Alba (4113) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Bronte (4114) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Carrara (4115) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Cori (4116) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Modena (4117) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Paterno (4118) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Sandrio (4119) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Vitali Elite Trento (4120) — European Oak 3/4 x 10.25inW x RL86.61in, 4mm Sawn, 30.78 SF/ctn", "price": "$21.00/SF · $646.38/ctn"}, {"service": "Provenza Sika T21 Adhesive (414788) — 4 Gallon", "price": "$144.39/ea (1-26 pails) · $138.79/pallet (27+)"}, {"service": "Provenza Sika T35 Adhesive (174759) — 5 Gallon", "price": "$152.89/ea (1-26 pails) · $146.89/pallet (27+)"}, {"service": "Provenza Sika T55 Adhesive (106610) — 5 Gallon", "price": "$196.49/ea"}, {"service": "Provenza Natural Cleaner (NATCLN) — 32 oz", "price": "$9.99/ea"}, {"service": "Provenza Natural Cleaner (NATCLNGAL) — 1 Gallon", "price": "$36.99/ea"}, {"service": "Provenza All Purpose Cleaner (ALLPUR32) — 32 oz", "price": "$25.79/ea"}, {"service": "Provenza All Purpose Cleaner (ALLPURGAL) — 1 Gallon", "price": "$91.39/ea"}, {"service": "Provenza Oil Refresher (OILREF32) — 32 oz, 400 SF", "price": "$36.59/ea"}, {"service": "Provenza Oil Refresher (OILREFGAL) — 1 Gallon, 1600 SF", "price": "$139.00/ea"}, {"service": "Provenza Spot Remover (SPTREM16) — 16 oz", "price": "$9.99/ea"}, {"service": "Provenza Spot Rejuvenating Oil (SPTREJ16) — 16 oz", "price": "$18.39/ea"}, {"service": "Provenza Spot Remover and Rejuvenating Oil Kit (SRROKIT)", "price": "$33.29/ea"}, {"service": "Provenza Maintenance Oil and Cleaning Kit (MOCKIT)", "price": "$42.99/ea"}, {"service": "Provenza Professional Touch Up Oil (PROFTUO) — 2.5 Liter", "price": "$219.50/ea"}, {"service": "Provenza Professional Natural Cleaner (PROFCLNGAL) — 1 Gallon", "price": "$69.00/ea"}]},
{"id": "sheet-grandpacific-hardwood-2026", "mfrId": "triwest", "name": "Grand Pacific Hardwood — April 2026", "effectiveDate": "2026-04-14", "items": [{"service": "Grand Pacific Worn Saddle (UFOK127ABM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Castaway (GPOK3037M) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Sea Lion (GPOK3039M) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Rip Tide (GPOK2757M) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Stingray (GPOK2668M) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Sand Bar (127SBM) — Acacia 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Evening Tides (127ETM) — Acacia 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Morning Break (127MBM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Oysters Pearl (127OPM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Waterfront (127WFM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Coastal Shores (127COM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Dock Side (127DSM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Parasail (127PAM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Seaworthy (127SWM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Sunset Shimmer (127SUM) — White Oak 1/2 x 7.5inW x 2-6ft RL, 2MM Face, 30.56 SF/ctn", "price": "$4.99/SF · $152.49/ctn"}, {"service": "Grand Pacific Breakers (127BRM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Cliffside (127CLM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Pelican Bay (127PBM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Endless Summer (127ESM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Lake House (127LHM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Harbor Nights (127HNM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Weather Vane (127WVM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific South Swell (127SSM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Kelp Bed (127KBM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Fisherman's Pier (127FPM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Shoreline (127SLM) — White Oak 1/2 x 7.25inW x 2-6ft RL, 2MM Face, 28.99 SF/ctn", "price": "$4.99/SF · $144.66/ctn"}, {"service": "Grand Pacific Moldings 90in — Reducer/Threshold/T-Molding (coordinated)", "price": "$69.00/ea"}, {"service": "Grand Pacific Moldings 90in — Flush Stair Nose (coordinated)", "price": "$99.00/ea"}, {"service": "Grand Pacific Moldings 90in — Quarter Round (coordinated)", "price": "$39.00/ea"}]},
{"id": "sheet-californiaclassics-hardwood-2026", "mfrId": "triwest", "name": "California Classics Hardwood — April 2026", "effectiveDate": "2026-04-14", "items": [{"service": "CA Classics Mediterranean AEGEAN (MCAG470LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean CALYPSO (MCYP487LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean IONIAN (MCNN500LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean KERREW (MCKW517LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean LIGURIAN (MCGR524LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean TYRRHENIAN (MCTY531LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean VALLDEMOSSA (MCVM548LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean LEVANT (MCLV018LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean KAZALLA (MCKZ025LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean SANTOLINA (MCST032LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean CRISPUS (MCCS056LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean SARGON (MCSN094LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean MONACO (MCMN692LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean CALABRIA (MCCA708LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean POSITANO (MCPI715LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean TRIPOLI (MCTP808LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean VITTORIA (MCVT815LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean VINAROS (MCVN660LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean LISBON (MCLB391LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean MODA (MCMD407LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean MONDARIZ (MCMZ414LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean BILBAO (MCBB438LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean SEBASTIAN (MCSB445LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean BAYONNE (MCBY452LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean MARGAUX (MCMG469LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean ROCHELLE (MCRC483LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean GRANVILLE (MCGV490LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean CANNES (MCCN513LCF) — French Oak 9/16 x 8inW x 24-75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$6.99/SF · $175.24/ctn"}, {"service": "CA Classics Mediterranean 9.5in COSENZA (MCKW265CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in BELLUNO (MCTP289CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in MONTRIEUX (MCLB296CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in CORINTHIAN (MCVT302CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in VARAZZE (MCGV326CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in MARISOL (MCMZ333CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in PAOLA (MCCN357CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in ALASSIO (MCMD364CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in TEODORO (MCBY371CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in BELLET (MCMG388CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Mediterranean 9.5in VASTO (MCLV395CF) — French Oak 5/8 x 9.5inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre RENOIR (LCRE690) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre MIRO (LCKL874) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre REMBRANDT (LCRE744) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre MICHELANGELO (LCMI812) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre DELACROIX (LCDE879) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre MAGRITTE (LCMA961) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Louvre CHAGALL (LCCH978) — French Oak 5/8 x 9.4inW x RL86.6in, 4MM Wire Brushed, 34.1 SF/ctn", "price": "$7.59/SF · $258.82/ctn"}, {"service": "CA Classics Timeless Classics BOULDER (TCBO3040) — Hickory 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics SNOQUALMIE (TCSN3057) — Hickory 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics SEQUIM (TCSE3064) — Hickory 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics ASPEN (TCAS3071) — Hickory 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics BEND (TCBE3088) — Hickory 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics SEDONA (TCSD3118) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics PARK CITY (TCPC3125) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics BIG SUR (TCBS8571) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics TAOS (TCTA3149) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics SHASTA (TCSH3156) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics SCOTTSDALE (TCSC3163) — Maple 1/2 x 4-6inW x 60in RL, 2MM Hand Scraped, 34.45 SF/ctn", "price": "$3.99/SF · $137.46/ctn"}, {"service": "CA Classics Timeless Classics 6in MOAB (TCMO3019) — Hickory 1/2 x 6inW x 60in RL, 2MM Hand Scraped, 20.67 SF/ctn", "price": "$3.99/SF · $82.47/ctn"}, {"service": "CA Classics Timeless Classics 6in BRECKENRIDGE (TCBR3026) — Hickory 1/2 x 6inW x 60in RL, 2MM Hand Scraped, 20.67 SF/ctn", "price": "$3.99/SF · $82.47/ctn"}, {"service": "CA Classics Timeless Classics 6in TELLURIDE (TCTE3033) — Hickory 1/2 x 6inW x 60in RL, 2MM Hand Scraped, 20.67 SF/ctn", "price": "$3.99/SF · $82.47/ctn"}, {"service": "CA Classics Timeless Classics 6in COEUR D'ALENE (TCCO3095) — Maple 1/2 x 6inW x 60in RL, 2MM Hand Scraped, 20.67 SF/ctn", "price": "$3.99/SF · $82.47/ctn"}, {"service": "CA Classics Timeless Classics 6in KALISPELL (TCKA3101) — Maple 1/2 x 6inW x 60in RL, 2MM Hand Scraped, 20.67 SF/ctn", "price": "$3.99/SF · $82.47/ctn"}, {"service": "CA Classics Taverne LARAMIE (TACH8205) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne CABALLERO (TAGO8212) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne CHEYENNE (TABR8229) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne PANIOLO (TAMO8236) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne MUSTANG (TACA8243) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne APPALOOSA (TAEX8250) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne VAQUERO (TABN9998) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne SAGEBRUSH (TAMN9967) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Taverne SAGUARO (TANR9974) — French Oak 9/16 x 8inW x 75in RL, 4MM Wire Brushed, 25.07 SF/ctn", "price": "$4.99/SF · $125.10/ctn"}, {"service": "CA Classics Moldings 90in — Reducer/Threshold/T-Molding", "price": "$69.00/ea"}, {"service": "CA Classics Moldings 90in — Flush SN/Square SN", "price": "$99.00/ea"}, {"service": "CA Classics Moldings 90in — Quarter Round", "price": "$39.00/ea"}]},
{"id": "sheet-bravada-hardwood-2026", "mfrId": "triwest", "name": "Bravada Hardwood — April 2026", "effectiveDate": "2026-04-14", "items": [{"service": "Bravada D'Vine Classic Dundee (14751) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Classic Veneto (14763) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Classic Tuscany (14764) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Columbia (14755) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Nahe (14756) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Abruzzo (14758) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Piedmont (14759) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Rhone (14761) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Willamette (14750) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Country Duoro (14762) — French White Oak 9/16 x 7.25inW x 71in RL, 28.67 SF/ctn", "price": "$7.99/SF · $229.07/ctn"}, {"service": "Bravada D'Vine Herringbone Rhone HB (14471) — French White Oak 9/16 x 4.75in x 23.625in, 15.5 SF/ctn", "price": "$9.99/SF · $154.85/ctn"}, {"service": "Bravada D'Vine Herringbone Tuscany HB (14474) — French White Oak 9/16 x 4.75in x 23.625in, 15.5 SF/ctn", "price": "$9.99/SF · $154.85/ctn"}, {"service": "Bravada D'Vine Herringbone Duoro HB (14472) — French White Oak 9/16 x 4.75in x 23.625in, 15.5 SF/ctn", "price": "$9.99/SF · $154.85/ctn"}, {"service": "Bravada Contempo Ambry (CNAM001) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Carolean (CNCA003) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Lunette (CNLU004) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Oxbow (CNOX005) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Voussoir (CNVS006) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Revival (CNRV008) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Newel (CNNW009) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Lancet (CNLN010) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Voguish (CNVG016) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Neoteric (CNNE013) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Novel (CNNV017) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Avant (CNAV014) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Getty (CNGE018) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Contempo Uffizi (CNUF015) — European White Oak 7/16 x 6inW x 14.5-59in RL, 27.5 SF/ctn", "price": "$4.59/SF · $126.23/ctn"}, {"service": "Bravada Symphony Classic Allegro (95308) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Classic Legato (95311) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Classic Canto (95307) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Classic Credo (95316) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Opus (95300) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Rhapsody (95301) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Sonata (95302) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Crescendo (95304) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Virtuoso (95305) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Leitmotif (95306) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Rondo (95309) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Symphony Country Basso (95315) — French White Oak 5/8 x 9.5inW x 82.75in RL, 32.55 SF/ctn", "price": "$8.99/SF · $292.62/ctn"}, {"service": "Bravada Barcelona Country Cayenne (BCEW001) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Macan (BCEW002) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Seville (BCEW003) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Coimbra (BCEW004) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Granada (BCEW005) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Villa Real (BCEW006) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Portimao (BCEW007) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Zaragoza (BCEW008) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Valencia (BCEW009) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Country Andora (BCEW010) — European Walnut 9/16 x 7.5inW x RL75in, 31.1 SF/ctn", "price": "$8.00/SF · $248.80/ctn"}, {"service": "Bravada Barcelona Herringbone Cayenne HB (BCEWHB001) — European Walnut 9/16 x 4.75in x 23.625in, 9.85 SF/ctn", "price": "$8.00/SF · $78.80/ctn"}, {"service": "Bravada Barcelona Herringbone Granada HB (BCEWHB005) — European Walnut 9/16 x 4.75in x 23.625in, 9.85 SF/ctn", "price": "$8.00/SF · $78.80/ctn"}, {"service": "Bravada Barcelona Herringbone Villa Real HB (BCEWHB006) — European Walnut 9/16 x 4.75in x 23.625in, 9.85 SF/ctn", "price": "$8.00/SF · $78.80/ctn"}, {"service": "Bravada Barcelona Herringbone Andorra HB (BCEWHB010) — European Walnut 9/16 x 4.75in x 23.625in, 9.85 SF/ctn", "price": "$8.00/SF · $78.80/ctn"}, {"service": "Bravada Branche Country Charel (58343) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Country Vidal (58344) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Country Enora (58345) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Country Lenore (58346) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Country Ambre (58347) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Country Bruna (58348) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Classic Perle (58340) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Classic Aristide (58341) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Branche Classic Coral (58342) — French White Oak 9/16 x 5.75inW x RL82in, 19.69 SF/ctn", "price": "$6.99/SF · $137.63/ctn"}, {"service": "Bravada Regalia Country Diadem (RGLA001) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Tiara (RGLA002) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Orb (RGLA003) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Sceptor (RGLA004) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Chaperone (RGLA005) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Gusset (RGLA006) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Coronation (RGLA007) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Cutlass (RGLA008) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Emperor (RGLA009) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Grand Duke (RGLA010) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Tunic (RGLA011) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Mantle (RGLA012) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Sabre (RGLA013) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Regalia Country Chariot (RGLA014) — European Oak 5/8 x 8.66inW x RL74.8in, 27.05 SF/ctn", "price": "$8.99/SF · $243.18/ctn"}, {"service": "Bravada Moldings 90in — Reducer/Threshold/T-Molding", "price": "$69.00/ea"}, {"service": "Bravada Moldings 90in — Flush Stair Nose", "price": "$99.00/ea"}, {"service": "Bravada Moldings 90in — Quarter Round", "price": "$39.00/ea"}]},
{
  "id": "sheet-tarkett-fiberfloor-2026",
  "mfrId": "bigd",
  "name": "Tarkett FiberFloor / TruTex VIP — May 2026",
  "effectiveDate": "2026-05-02",
  "items": [{"service": "FiberFloor CustomPro (15001-12) — Vermont Slate Mushroom, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15004-12) — Vermont Slate Charcoal, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15071-12) — Atlas Ibis White, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15072-12) — Atlas Marble Grey, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15081-12) — Bridgestone Desert Stone, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15101-12) — Brentwood Manchester, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15121-12) — Barn Jazz Warm Grey, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15141-12) — Corawood Dark Bronze, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15142-12) — Corawood Wheat, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15143-12) — Corawood Mouse, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15144-12) — Corawood Charcoal, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15151-12) — Modern Slate Cliff, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15161-12) — Longwood Cocoa, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15162-12) — Longwood Caramel, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15181-12) — Sylanova Slate Mid Grey, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15201-12) — Canyon Slate Desert, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15221-12) — Summerville Copper, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15251-12) — Mendoza Warm Grey, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15252-12) — Mendoza Tan, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15261-12) — Lexington Plank Fossil, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15272-12) — Legend Almond, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15281-12) — Arizona Stone Terragris, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15291-12) — Cliff Oak Gunstock, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15292-12) — Cliff Oak Chocolate, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15504-12) — White Oak Weathered, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15505-12) — White Oak Natural, 12', 10mil (Stocking/Cut available)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor CustomPro (15505-12) — Mojave Slate Storm, 12', 10mil (Full roll only)", "price": "$6.22/SY · $0.69/SF"}, {"service": "FiberFloor Easy Living (T14161-12) — Checker Berry Salt & Pepper, 12', 14mil (Stocking/Cut available)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14201-12) — Berkshire Oak Sea Pearl, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14202-12) — Berkshire Oak Arizona Tan, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14205-12) — Berkshire Oak Grey, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14221-12) — Colorado Stone White Dove, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14301-12) — Capri Spicestone, 12', 14mil (Stocking/Cut available)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14331-12) — Norfolk Modular Beige, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14361-12) — Rich Onyx Grey, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14474-12) — Seattle Shoreline, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14511-12) — Hex Twilight, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14514-12) — Hex Castlerock, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14521-12) — Remix Rural, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14522-12) — Remix Driftwood, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14523-12) — Remix Weathered, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14541-12) — Modern Slate Dove, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14542-12) — Slate Charcoal Carrara Bianca, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14551-12) — Chevron Cappuccino, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14561-12) — Hickory Wolf, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14571-12) — Herringbone Charcoal, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14582-12) — Izabel Light Grey, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14591-12) — Izabel Navy, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14592-12) — Waystone Greige, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor Easy Living (T14601-12) — Waystone Cool Grey, 12', 14mil (Full roll only)", "price": "$19.66/SY · $2.19/SF"}, {"service": "FiberFloor First Class (87001-12) — Newport Natural, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87011-12) — Aspen Falcon, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87021-12) — Napa Terra, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87031-12) — Opus Bianco, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87032-12) — Opus Aura, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87041-12) — Marrakesh Medina, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87042-12) — Marrakesh Noir, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87051-12) — Basilica Cream, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87061-12) — Windsor Gatsby, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87071-12) — Monaco Calcatta, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87081-12) — Delhi Imperial, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87082-12) — Delhi Raven, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87091-12) — Soho Concreto, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor First Class (87101-12) — Santorini Coastal, 12', 16mil (Full roll only)", "price": "$18.32/SY · $2.04/SF"}, {"service": "FiberFloor Fresh Start (T01112-12) — Vogue Gentle White, 12', 10mil (Stocking/Cut available)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01131-12) — Pompano Arizona Dust, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01132-12) — Pompano Carbon, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01134-12) — Pompano Greystone, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01152-12) — Montego Bay Mushroom, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01201-12) — Clearwater Oak Gun, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01202-12) — Clearwater Oak Cin, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01254-12) — Coppertino Light Grey, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01255-12) — Coppertino Beige, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01331-12) — Travertine Tile Creamona, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01352-12) — Sylvanova Slate Steel, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01363-12) — Dakota Saddle, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01411-12) — Barn Jazz Warm Grey, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01412-12) — Barn Jazz Lava, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01421-12) — Rhythm Sea Salt, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01422-12) — Rhythm Owl Grey, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01471-12) — Ridgeline Feather, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01491-12) — Cliff Oak Natural, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01492-12) — Cliff Oak Cool Grey, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor Fresh Start (T01501-12) — Tivoli Calcite White, 12', 10mil (Full roll only)", "price": "$13.45/SY · $1.49/SF"}, {"service": "FiberFloor ValuPro (07011-12) — Remix Brandy, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ValuPro (07012-12) — Remix Eagle, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ValuPro (07101-12) — Berkshires Oak Sea Pearl, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ValuPro (07202-12) — Clearwater Oak Cinnamon, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ValuPro (07081-12) — Eastern Slate Sunset, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ValuPro (07152-12) — Montego Bay Mushroom, 12', 6mil (Full roll only)", "price": "$4.14/SY · $0.46/SF"}, {"service": "FiberFloor ProTuff (45001) — Barnwood Raft, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45011) — American Chestnut Cloud, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45012) — American Chestnut Shadow, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45021) — Dakota Dune, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45022) — Dakota Taupe, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45031) — Lexington Fossil, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45041) — Brentwood Oyster, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45042) — Brentwood Smoked, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45051) — Hickory Tile Tan, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45061) — Barn Jazz Silvertone, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45062) — Barn Jazz Pewter, 12', 12mil (Stocking/Cut available)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45071) — Capri Almond, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45091) — Rich Onyx Icicle, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45111) — Ridgeline Wolf, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45112) — Ridgeline Mink, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45121) — Roca Bone, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45122) — Roca Ashes, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor ProTuff (45191) — Tumbled Stone Oatmeal, 12', 12mil (Full roll only)", "price": "$7.30/SY · $0.81/SF"}, {"service": "FiberFloor Triton Tuff (21001-12) — Pompano Fog, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21021-12) — Cement Tile Whisper, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21031-12) — Canyon Slate Cloud, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21032-12) — Canyon Slate Zinc, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21041-12) — Carrara Alabaster, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21051-12) — Clearwater Oak Glacier, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21052-12) — Clearwater Oak Mink, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21061-12) — Herringbone Wolf, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21071-12) — Remix Smoke, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21072-12) — Remix Bronze, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21081-12) — Berkshires Oak Mist, 12', 10mil (Stocking/Cut available)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21082-12) — Berkshires Oak Buff, 12', 10mil (Stocking/Cut available)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21083-12) — Berkshires Oak Gunstock, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21084-12) — Berkshires Harbour Brown, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21111-12) — Hutchison Powder, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21121-12) — Barn Jazz Prairie, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21152-12) — Farmhouse Pine Harvest, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor Triton Tuff (21061-12) — Longwood Cocoa, 12', 10mil (Full roll only)", "price": "$8.36/SY · $0.93/SF"}, {"service": "FiberFloor High Street (60001) — Oslo Pewter, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60011) — Corbin Latte, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60021) — Markham Wheat, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60031) — Ozart Greige, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60041) — Rowell Bisque, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60051) — Sedwick Chai, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60052) — Sedwick Kobicha, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60061) — Monroe Sunkiss, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60062) — Monroe Chestnut, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60071) — Strata Chasmere, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60072) — Strata Madras, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60081) — Aria Glacier, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60082) — Aria Lunar, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60083) — Aria Iron, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60091) — Baxton Limestone, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "FiberFloor High Street (60092) — Baxton Earth, 12', 20mil TECHTONIC (Full roll only)", "price": "$19.27/SY · $2.14/SF"}, {"service": "TruTex (27001) — Corawood Barley, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27002) — Corawood Scotch, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27011) — Remix Brandy, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27012) — Remix Eagle, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27021) — Barn Jazz Prairie, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27022) — Barn Jazz Firewheel, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27042) — Flagstone Whistler, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27081) — Eastern Slate Sunset, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27091) — Seattle Dune, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27111) — Modern Slate Nomad, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27112) — Modern Slate Mineral, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27121) — Encaustic Tile Artizan, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27131) — Nero Hex White, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27132) — Nero Hex Black, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27141) — Cambridge Llama, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27142) — Cambridge Rowan, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27151) — Farmhouse Pine Sunlight, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27152) — Farmhouse Pine Harvest, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27161) — Sandstone Haze, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "TruTex (27162) — Sandstone Shady, 12', 10mil Urethane Sealed (Full roll only)", "price": "$12.64/SY · $1.40/SF"}, {"service": "FiberFloor QBond-One Adhesive (QBONDONE-G) — Gallon, 350 SF/gal roller", "price": "$41.99/gal"}, {"service": "FiberFloor QBond-One Adhesive (QBONDONE-4) — 4 Gallon", "price": "$172.80"}, {"service": "FiberFloor Floating Seam Tape (S875) — 5.7x60 ft roll", "price": "$32.24/roll"}, {"service": "FiberFloor Seam Sealer Low Gloss Urethane (DT65) — 2-part kit, 75 LFT", "price": "$33.25/kit"}]
}
,
{"id": "sheet-southwind-2026", "mfrId": "southwind", "name": "Southwind Building Products — May 2026", "effectiveDate": "2026-05-05", "items": [{"service": "Southwind Broadloom Callaway (S215) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.08/SF · $9.71/SY · Cut $1.20/SF · $10.80/SY"}, {"service": "Southwind Broadloom Callaway II (S263) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.08/SF · $9.71/SY · Cut $1.20/SF · $10.80/SY"}, {"service": "Southwind Broadloom Coastal Image (L712) — 12ft, AB Back, Roll/Cut", "price": "Roll $0.96/SF · $8.63/SY · Cut $1.08/SF · $9.71/SY"}, {"service": "Southwind Broadloom Essential Broadloom (P800) — 12ft, AB Back, Roll/Cut", "price": "Roll $0.98/SF · $8.81/SY · Cut $1.11/SF · $9.98/SY · $0.42/SY tariff"}, {"service": "Southwind Broadloom Eternal Beauty (A212) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.56/SF · $14.04/SY · Cut $1.68/SF · $15.12/SY"}, {"service": "Southwind Broadloom Eternal Comfort (A213) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.80/SF · $16.20/SY · Cut $1.92/SF · $17.28/SY"}, {"service": "Southwind Broadloom Exalted (P560) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY · $0.64/SY tariff"}, {"service": "Southwind Broadloom Exalted Prime (P561) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY · $0.64/SY tariff"}, {"service": "Southwind Broadloom Fanciful (L239) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Intrigue (A117) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.08/SF · $9.71/SY · Cut $1.20/SF · $10.80/SY"}, {"service": "Southwind Broadloom Light Show (A104) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.32/SF · $11.88/SY · Cut $1.44/SF · $12.96/SY"}, {"service": "Southwind Broadloom Natural Terrain (L236) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom New Foundation (P200N) — 12ft, FB Back, Roll/Cut", "price": "Roll $0.65/SF · $5.87/SY · Cut $0.74/SF · $6.69/SY · $0.37/SY tariff"}, {"service": "Southwind Broadloom North Star (A205) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.32/SF · $11.88/SY · Cut $1.44/SF · $12.96/SY"}, {"service": "Southwind Broadloom Nuance (A155) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.44/SF · $12.96/SY · Cut $1.56/SF · $14.04/SY"}, {"service": "Southwind Broadloom Optics (A113) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.80/SF · $16.20/SY · Cut $1.92/SF · $17.28/SY"}, {"service": "Southwind Broadloom Oxford (P702) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.31/SF · $11.75/SY · Cut $1.44/SF · $12.92/SY · $0.57/SY tariff"}, {"service": "Southwind Broadloom Paramount (P250) — 12ft, CB Back, Roll/Cut", "price": "Roll $0.96/SF · $8.63/SY · Cut $1.08/SF · $9.71/SY"}, {"service": "Southwind Broadloom Polaris (A214) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.80/SF · $16.20/SY · Cut $1.92/SF · $17.28/SY"}, {"service": "Southwind Broadloom Pure Luxury (A156) — 12ft, AB Back, Roll/Cut", "price": "Roll $2.16/SF · $19.44/SY · Cut $2.28/SF · $20.52/SY"}, {"service": "Southwind Broadloom Pure Luxury II (A158) — 12ft, AB Back, Roll/Cut", "price": "Roll $2.16/SF · $19.44/SY · Cut $2.28/SF · $20.52/SY"}, {"service": "Southwind Broadloom Radiant Beauty (A103) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.50/SF · $13.50/SY · Cut $1.62/SF · $14.58/SY"}, {"service": "Southwind Broadloom Seaside (P380) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.04/SF · $9.40/SY · Cut $1.17/SF · $10.57/SY · $0.57/SY tariff"}, {"service": "Southwind Broadloom Seaside Plus (P480) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.31/SF · $11.75/SY · Cut $1.44/SF · $12.92/SY · $0.71/SY tariff"}, {"service": "Southwind Broadloom Southern Lights (A151) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.08/SF · $9.71/SY · Cut $1.20/SF · $10.80/SY"}, {"service": "Southwind Broadloom Starlight Elite (S250) — 12ft, AB Back, Roll/Cut", "price": "Roll $0.70/SF · $6.32/SY · Cut $0.82/SF · $7.40/SY"}, {"service": "Southwind Broadloom Stellar (A118) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.08/SF · $9.71/SY · Cut $1.20/SF · $10.80/SY"}, {"service": "Southwind Broadloom Stratford (L123) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Veiled Tapestry (L241) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Visionary (L234) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Whimsical (L231) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Windscape (L235) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Windsor Court (L122) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Broadloom Wingate (L132) — 12ft, AB Back, Roll/Cut", "price": "Roll $1.20/SF · $10.80/SY · Cut $1.32/SF · $11.88/SY"}, {"service": "Southwind Carpet Tile Essential Square (T700) — 19.68in, PV Back, 5.98 SY/ctn", "price": "$17.85/ctn · $14.50/SY delivered · $0.62/SY tariff"}, {"service": "Southwind Carpet Tile Metro (T200) — 19.68in, PV Back, 5.98 SY/ctn", "price": "$23.25/ctn · $19.21/SY delivered · $0.79/SY tariff"}, {"service": "Southwind Carpet Tile Neapolitan (T100) — 19.68in, PV Back, 5.98 SY/ctn", "price": "$23.25/ctn · $19.21/SY delivered · $0.79/SY tariff"}, {"service": "Southwind Advantage Plank (R064L) — 7x48in, LT Back, 28.37 SF/ctn, 60 ctn/plt", "price": "Ctn $1.88/SF · Plt $1.57/SF · $0.09/SF tariff"}, {"service": "Southwind Authentic Mix (W081R) — Mixedin, LT Back, 16.87 SF/ctn, 75 ctn/plt", "price": "Ctn $3.17/SF · Plt $2.84/SF · $0.18/SF tariff"}, {"service": "Southwind Authentic Plank (W030L) — 9x60in, LT Back, 29.92 SF/ctn, 52 ctn/plt", "price": "Ctn $3.28/SF · Plt $2.94/SF · $0.16/SF tariff"}, {"service": "Southwind Authentic Prime (W031D) — 9x60in, LT Back, 22.08 SF/ctn, 44 ctn/plt", "price": "Ctn $3.66/SF · Plt $3.36/SF · $0.23/SF tariff"}, {"service": "Southwind Boundless SPC (R220D) — 7x48in, LT Back, 23.64 SF/ctn, 60 ctn/plt", "price": "Ctn $2.04/SF · Plt $1.74/SF · $0.11/SF tariff"}, {"service": "Southwind Boundless 12 (V212D) — 7x48in, LT Back, 46.67 SF/ctn, 60 ctn/plt", "price": "Ctn $1.52/SF · Plt $1.22/SF · $0.06/SF tariff"}, {"service": "Southwind Boundless 20 (V220D) — 7x48in, LT Back, 46.11 SF/ctn, 60 ctn/plt", "price": "Ctn $1.79/SF · Plt $1.49/SF · $0.07/SF tariff"}, {"service": "Southwind Boundless 8 (V208D) — 7x48in, LT Back, 46.67 SF/ctn, 60 ctn/plt", "price": "Ctn $1.38/SF · Plt $1.08/SF · $0.06/SF tariff"}, {"service": "Southwind Bryson Hardwood (EWSA0) — Rndmltin, EW Back, 26.25 SF/ctn, 32 ctn/plt", "price": "Ctn $3.89/SF · Plt $3.59/SF · No tariff"}, {"service": "Southwind Cohutta Tile (RT100) — 12x24in, LT Back, 20.03 SF/ctn, 60 ctn/plt", "price": "Ctn $2.60/SF · Plt $2.15/SF · No tariff"}, {"service": "Southwind Contour Plank (L501D) — 7x48in, LT Back, 18.44 SF/ctn, 50 ctn/plt", "price": "Ctn $2.65/SF · Plt $2.34/SF · $0.14/SF tariff"}, {"service": "Southwind Contour Tile (L550D) — 12x24in, LT Back, 16.02 SF/ctn, 60 ctn/plt", "price": "Ctn $2.80/SF · Plt $2.34/SF · $0.11/SF tariff"}, {"service": "Southwind Equity Plank (R062B) — 9x60in, LT Back, 22.44 SF/ctn, 64 ctn/plt", "price": "Ctn $2.86/SF · Plt $2.50/SF · $0.14/SF tariff"}, {"service": "Southwind Franklin Hardwood (WD143) — Rndmltin, EW Back, 23.31 SF/ctn, 45 ctn/plt", "price": "Ctn $4.79/SF · Plt $4.49/SF · $0.36/SF tariff"}, {"service": "Southwind Harbor Plank 8mm (W020L) — 6x48in, LT Back, 15.76 SF/ctn, 78 ctn/plt", "price": "Ctn $3.01/SF · Plt $2.70/SF · $0.15/SF tariff"}, {"service": "Southwind Harvest Plank (V040R) — 6x48in, LT Back, 31.44 SF/ctn, 48 ctn/plt", "price": "Ctn $1.89/SF · Plt $1.58/SF · $0.08/SF tariff"}, {"service": "Southwind Heritage Loose Lay (L80KD) — 6x48in, LT Back, 20.00 SF/ctn, 60 ctn/plt", "price": "Ctn $2.65/SF · Plt $2.34/SF · $0.14/SF tariff"}, {"service": "Southwind New Traditions (W095N) — Rndmltin, LT Back, 21.66 SF/ctn, 78 ctn/plt", "price": "Ctn $3.17/SF · Plt $2.84/SF · $0.19/SF tariff"}, {"service": "Southwind Panoramic (R071D) — 7x60in, LT Back, 20.90 SF/ctn, 55 ctn/plt", "price": "Ctn $2.36/SF · Plt $2.00/SF · $0.13/SF tariff"}, {"service": "Southwind Refine Pressed (W075D) — 7x48in, LT Back, 32.93 SF/ctn, 50 ctn/plt", "price": "Ctn $3.10/SF · Plt $2.74/SF · $0.15/SF tariff"}, {"service": "Southwind Resurge (LM10W) — 7x48in, MP Back, 20.40 SF/ctn, 60 ctn/plt", "price": "Ctn $2.47/SF · Plt $2.17/SF · $0.12/SF tariff"}, {"service": "Southwind Revive (LM12W) — 9x60in, MP Back, 22.43 SF/ctn, 48 ctn/plt", "price": "Ctn $2.72/SF · Plt $2.42/SF · $0.13/SF tariff"}, {"service": "Southwind Rigid Plus (RP60L) — 7x48in, LT Back, 23.64 SF/ctn, 50 ctn/plt", "price": "Ctn $2.14/SF · Plt $1.77/SF · $0.10/SF tariff"}, {"service": "Southwind Summit (W901D) — 5x60in, LT Back, 10.42 SF/ctn, 63 ctn/plt", "price": "Ctn $5.38/SF · Plt $4.74/SF · $0.32/SF tariff"}, {"service": "Southwind Sweet Home (R090A) — 7x48in, LT Back, 33.32 SF/ctn, 55 ctn/plt", "price": "Ctn $2.22/SF · Plt $1.81/SF · No tariff"}, {"service": "Southwind Timeless Plank (W11L) — 6x48in, LT Back, 21.67 SF/ctn, 54 ctn/plt", "price": "Ctn $2.82/SF · Plt $2.49/SF · $0.14/SF tariff"}, {"service": "Southwind Woodwind Pressed (W801D) — 9x60in, LT Back, 29.31 SF/ctn, 52 ctn/plt", "price": "Ctn $3.10/SF · Plt $2.80/SF · $0.20/SF tariff"}, {"service": "Southwind Molding Advantage Plank (R064F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Advantage Plank (R064F) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Mix (W081F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Mix (W081F) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Plank (W030X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Plank (W030X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Plank (W030X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Authentic Prime (W031X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Prime (W031X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Authentic Prime (W031X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Boundless SPC (R220X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Boundless SPC (R220X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Boundless SPC (R220X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Bryson Moldings (EWSAP) — Endcap/Reducer/T-Molding", "price": "$69.00/ea"}, {"service": "Southwind Molding Bryson Moldings (EWSAP) — Stair Nose", "price": "$79.00/ea"}, {"service": "Southwind Molding Equity Plank (R062F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Equity Plank (R062F) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Franklin HW Moldings (W143P) — Reducer/Threshold/T-Molding", "price": "$69.00/ea"}, {"service": "Southwind Molding Franklin HW Moldings (W143P) — Stair Nose", "price": "$79.00/ea"}, {"service": "Southwind Molding Harbor Plank (W020X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Harbor Plank (W020X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding New Traditions (W095X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding New Traditions (W095X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Panoramic (R071F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Panoramic (R071F) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Refine Pressed (W075X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Refine Pressed (W075X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Refine Pressed (W075X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Resurge (LM10F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Resurge (LM10F) — Stair Nose/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Revive (LM12F) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Revive (LM12F) — Stair Nose/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Rigid Plus (RP60X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Rigid Plus (RP60X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Summit (W901X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Summit (W901X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Summit (W901X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Sweet Home (R090V) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Sweet Home (R090V) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Timeless Plank (W11F) — Endcap/Reducer", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Timeless Plank (W11F) — Stair Nose", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Woodwind Pressed (W801X) — Endcap/Reducer/T-Molding", "price": "$18.95/ea · $26.83/ctn (5/ctn)"}, {"service": "Southwind Molding Woodwind Pressed (W801X) — F-Stair/O-Stair", "price": "$25.31/ea · $33.19/ctn (5/ctn)"}, {"service": "Southwind Molding Woodwind Pressed (W801X) — Tread", "price": "$79.00/ea"}, {"service": "Southwind Molding Molding Riser (MOLD) — Riser", "price": "$9.97/ea"}, {"service": "Southwind Molding Molding Shoe Mold (MOLD) — Shoe Mold", "price": "$5.61/ea"}, {"service": "Southwind 6 Mil Poly Underlayment (POLY6) — 46x26in", "price": "$9.99/ea · $11.99/ctn (12/ctn)"}]}
,
{
  "id": "sheet-paradigm-2026",
  "mfrId": "paradigm",
  "name": "Paradigm WPC/SPC Flooring \u2014 May 2026",
  "effectiveDate": "2026-05-01",
  "items": [
    {
      "service": "Paradigm Insignia White River (PI20001) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Trinity (PI20002) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Shasta (PI20003) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Muddy (PI20004) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Salt Lake (PI20005) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Powell (PI20006) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Cashmere (PI20007) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Victoria (PI20008) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia St. Clair (PI20009) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Dove (PI20010) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Superior (PI20011) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Torch (PI20012) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia White Sand (PI20013) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Moon Lake (PI20014) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia White Sea (PI20015) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Shark Bay (PI20016) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Nile (PI20017) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Tigers Eye (PI20018) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Mineral (PI20019) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Amazon (PI20020) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia St.Lawrence (PI20021) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Rincon (PI20022) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Sultans (PI20023) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Honolua Bay (PI20024) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Gold Coast (PI20025) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia North Shore (PI20026) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Hanalei (PI20027) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Lanikai (PI20028) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Manoa (PI20029) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Tofino (PI20030) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Pedra (PI20031) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Molokai (PI20032) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Kailua (PI20033) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Guava (PI20034) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Sandalwood (PI20035) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Morning Dew (PI20036) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Sunset (PI20037) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Dusk (PI20038) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Twilight (PI20039) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Insignia Nightfall (PI20040) \u2014 WPC 20MIL, 7\"x48\", 26.18 SF/Ctn, 52 Ctns/Pallet, Pad Attached",
      "price": "$2.99/SF \u00b7 $78.28/Ctn"
    },
    {
      "service": "Paradigm Odyssey Thira (7001) \u2014 WPC 20MIL, 9\"x72\" Painted V-Groove EIR, 30.92 SF/Ctn",
      "price": "$2.39/SF \u00b7 $73.90/Ctn"
    },
    {
      "service": "Paradigm Odyssey Pentelic (7002) \u2014 WPC 20MIL, 9\"x72\" Painted V-Groove EIR, 30.92 SF/Ctn",
      "price": "$2.39/SF \u00b7 $73.90/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Swan \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Kiwi \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Pelican \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Raven \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Goose \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Hummingbird \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Mallard \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Toucan \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Falcon \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Owl \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Lark \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Oriole \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Hawk \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Robin \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Quail \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Sparrow \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Eagle \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Cardinal \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Finch \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Kingfisher \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Mockingbird \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Partridge \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Pheasant \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Swallow \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Tern \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Warbler \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Parrot \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer PLUS Dove \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 22.38 SF/Ctn, 68 Ctns/Pallet",
      "price": "$2.49/SF \u00b7 $55.73/Ctn"
    },
    {
      "service": "Paradigm Performer Antique \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Spice \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Castle \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Navajo \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Oyster \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Pewter \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Hazel \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Mocha \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Ivory \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Tawny \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Toast \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Pecan \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Fog \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Fossil \u2014 SPC 12MIL, 7\"x60\" Micro Bevel, 23.67 SF/Ctn, 70 Ctns/Pallet",
      "price": "$1.79/SF \u00b7 $42.75/Ctn"
    },
    {
      "service": "Paradigm Performer Buckwheat \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Cashew \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Sprout \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Barley \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Agave \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Flax \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Rye \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Truffle \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Acorn \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Oats \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Wildflower \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Pistachio \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Honeydew \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Performer Macadamia \u2014 SPC 20MIL, 9\"x60\" Painted Bevel, 30.24 SF/Ctn, 52 Ctns/Pallet",
      "price": "$1.89/SF \u00b7 $57.04/Ctn"
    },
    {
      "service": "Paradigm Conquest Victory (CON2001PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Triumph (CON2002PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Chateau (CON2003PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Tower (CON2004PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Citadel (CON2005PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Castle (CON2006PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Camelot (CON2007PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Palace (CON2008PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Estate (CON2009PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Manor (CON2010PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Windsor (CON2011PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Fortress (CON2012PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Knight (CON2013PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Chivalry (CON2014PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Abbey (CON2015PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Parliament (CON2016PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Tapestry (CON2017PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Nobility (CON2018PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Armor (CON2019PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Acropolis (CON2020PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Charm (CON2021PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Utopia (CON2022PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Shield (CON2023PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Catapult (CON2024PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Drawbridge (CON2025PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Squire (CON2026PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Maiden (CON2027PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Baron (CON2028PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Duke (CON2029PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Chamber (CON2030PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Passage (CON2031PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Chancellor (CON2032PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Joust (CON2033PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Surrey (CON2034PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Royalty (CON2035PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Guild (CON2036PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Caterbury (CON2037PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Dover (CON2038PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Troubador (CON2039PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Kingship (CON2040PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Conquest Shire (CON2041PAD) \u2014 SPC 20MIL, 9\"x72\" Painted Bevel, 17.67 SF/Ctn, 48 Ctns/Pallet",
      "price": "$2.99/SF \u00b7 $52.83/Ctn"
    },
    {
      "service": "Paradigm Reducer \u2014 All collections, 94\" length",
      "price": "$29.95/ea"
    },
    {
      "service": "Paradigm Flush Stair Nose \u2014 All collections, 94\" length",
      "price": "$44.95/ea"
    },
    {
      "service": "Paradigm Overlap Stair Nose \u2014 All collections, 94\" length",
      "price": "$44.95/ea"
    },
    {
      "service": "Paradigm End Cap \u2014 All collections, 94\" length",
      "price": "$29.95/ea"
    },
    {
      "service": "Paradigm T-Molding \u2014 All collections, 94\" length",
      "price": "$29.95/ea"
    },
    {
      "service": "Paradigm Quarter Round \u2014 All collections, 94\" length",
      "price": "$15.95/ea"
    },
    {
      "service": "Paradigm Bullnose Stair Tread \u2014 Odyssey only, 60\" length, 2/ctn",
      "price": "$144.95/ctn"
    },
    {
      "service": "Paradigm Fabricated Flush Square Stair Nose \u2014 Conquest only, 48\" length, 2/ctn",
      "price": "$119.90/ctn"
    },
    {
      "service": "EWC Professional Tapping Block (ELTTPROFTB) \u2014 Required for 12MIL install",
      "price": "$7.95/ea"
    }
  ]
}
];

const FLOORING_TYPES = ['Carpet','Hardwood','Laminate','LVP','Other','Sheet Vinyl','Tile'];

const STATUS_META = {
  'Lead':              { bg:'#2A2010', text:'#F5A623', dot:'#F5A623' },
  'Quote Sent':        { bg:'#1A1F2E', text:'#6BA3D6', dot:'#6BA3D6' },
  'Measure Scheduled': { bg:'#1E1A2E', text:'#C084FC', dot:'#C084FC' },
  'Ordered':           { bg:'#1A2020', text:'#17A2B8', dot:'#17A2B8' },
  'In Transit':        { bg:'#201A2A', text:'#A78BFA', dot:'#A78BFA' },
  'Ready':             { bg:'#1A2A1A', text:'#4ADE80', dot:'#4ADE80' },
  'Scheduled':         { bg:'#2A1F10', text:'#FB923C', dot:'#FB923C' },
  'Installed':         { bg:'#152A15', text:'#28A745', dot:'#28A745' },
  'Follow-Up':         { bg:'#2A1515', text:'#F87171', dot:'#F87171' }, // used in notes only
};

// ── State ───────────────────────────────────────────────────────────────────
let state = {
  customers:  [],
  mfrs:       DEFAULT_MFRS,
  sheets:     DEFAULT_SHEETS.slice(), // [{id,mfrId,name,effectiveDate,items:[{service,price}]}]
  tab:        'dashboard',
  selId:      null,
  search:     '',
  filterSt:   'All',
  boardFilter:'All',
  fupFilter:  'all',
  priceTab:   'labor',
  laborSec:   'Installation',
  editMfr:    null,
  editSheet:  null,
  revenueGoal: 0,
  priceSearch: '',
  sheetSearch: '',
  dirSearch: '',
  activeMfrId: null,
  activeSheetId: null,
  reportPeriod: 'month',
};

// ── Persistence ─────────────────────────────────────────────────────────────
async function loadFromSharePoint() {
  const spData = await spLoad();
  if (spData && spData.customers && spData.customers.length > 0) {
    state.customers = spData.customers;
    save(); // cache locally too
    render();
    showSyncStatus('✅ Synced with team database');
  }
}

function showSyncStatus(msg) {
  var el = document.getElementById('sync-status');
  if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(function(){ el.style.display='none'; }, 3000); }
}

function load() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.customers)   state.customers   = d.customers;
      if (d.mfrs)        state.mfrs        = d.mfrs;
      if (d.revenueGoal) state.revenueGoal = d.revenueGoal;

      // Always ensure DEFAULT_SHEETS are present — merge them in
      // so they show up even if the user has old saved data
      const saved = d.sheets || [];
      const merged = DEFAULT_SHEETS.slice();
      saved.forEach(function(s) {
        // Keep any user-added or user-edited sheets that aren't default ones
        var isDefault = DEFAULT_SHEETS.some(function(ds) { return ds.id === s.id; });
        if (!isDefault) merged.push(s);
        else {
          // If user edited a default sheet, use their version
          var idx = merged.findIndex(function(ds) { return ds.id === s.id; });
          if (idx !== -1) merged[idx] = s;
        }
      });
      state.sheets = merged;

      // Also ensure Fabrica and Masland are in the mfr directory
      var defaultMfrIds = ['fabrica','masland','dixiehome','tarkett','triwest','duchateau','bigd','southwind','paradigm'];
      defaultMfrIds.forEach(function(id) {
        var exists = state.mfrs.some(function(m) { return m.id === id; });
        if (!exists) {
          var match = DEFAULT_MFRS.find(function(m) { return m.id === id; });
          if (match) state.mfrs.push(match);
        }
      });
    }
  } catch(e) { console.warn('Load error', e); }
}

function save() {
  try {
    localStorage.setItem(SK, JSON.stringify({ customers: state.customers, mfrs: state.mfrs, sheets: state.sheets, revenueGoal: state.revenueGoal }));
  } catch(e) { console.warn('Save error', e); }
  // Push to SharePoint in background so team sees updates
  if (SP_ENABLED && state.customers.length > 0) {
    spSave(state.customers).then(function() {
      showSyncStatus('✅ Saved to team database');
    }).catch(function(){
      showSyncStatus('⚠️ Saved locally only');
    });
  }
}


// ── Export / Import ──────────────────────────────────────────────────────────
function exportData() {
  const data = { customers: state.customers, mfrs: state.mfrs, sheets: state.sheets, revenueGoal: state.revenueGoal, exportedAt: new Date().toISOString(), version: 1 };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `apollo-crm-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported! Save that file somewhere safe.');
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.customers) { alert('Invalid backup file.'); return; }
      if (!confirm(`This will replace your current data with ${d.customers.length} customers from the backup. Continue?`)) return;
      if (d.customers)    state.customers    = d.customers;
      if (d.mfrs)         state.mfrs         = d.mfrs;
      // Merge imported sheets with defaults so Fabrica/Masland always stay
      var importedSheets = d.sheets || [];
      var mergedImport = DEFAULT_SHEETS.slice();
      importedSheets.forEach(function(s) {
        var isDefault = DEFAULT_SHEETS.some(function(ds) { return ds.id === s.id; });
        if (!isDefault) mergedImport.push(s);
        else {
          var idx = mergedImport.findIndex(function(ds) { return ds.id === s.id; });
          if (idx !== -1) mergedImport[idx] = s;
        }
      });
      state.sheets = mergedImport;
      if (d.revenueGoal)  state.revenueGoal  = d.revenueGoal;
      save(); render(); toast(`Imported ${d.customers.length} customers successfully!`);
    } catch(err) { alert('Could not read backup file.'); }
  };
  reader.readAsText(file);
}
// ── Helpers ─────────────────────────────────────────────────────────────────
function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().slice(0,10); }
function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

// ── Time dropdown options ────────────────────────────────────────────────────
function timeOptions(selected) {
  var times = [];
  for (var h = 6; h <= 20; h++) {
    for (var m = 0; m < 60; m += 15) {
      var hh = h < 10 ? '0'+h : ''+h;
      var mm = m === 0 ? '00' : ''+m;
      var val = hh+':'+mm;
      var ampm = h < 12 ? 'AM' : 'PM';
      var h12 = h === 0 ? 12 : h > 12 ? h-12 : h;
      var label = h12+':'+(m===0?'00':mm)+' '+ampm;
      times.push('<option value="'+val+'"'+(val===selected?' selected':'')+'>'+label+'</option>');
    }
  }
  return times.join('');
}

// ── Date input wrapper helper ─────────────────────────────────────────────────
function dateInput(id, value, placeholder) {
  placeholder = placeholder || 'Select date';
  value = value || '';
  return '<div class="date-wrap">'
    +'<input class="inp date-inp" type="date" id="'+id+'" value="'+value+'" placeholder="'+placeholder+'"/>'
    +'<span class="date-icon" onclick="try{document.getElementById(\''+id+'\').showPicker()}catch(e){}">📅</span>'
    +'</div>';
}

// ── Calendar Link Generators ─────────────────────────────────────────────────
// Generates an Outlook web calendar link pre-filled with event details
// Works on any device - opens Outlook app or web, one tap to save

function buildOutlookLink(title, date, timeStart, timeEnd, location, body) {
  // date: 'YYYY-MM-DD', timeStart/timeEnd: 'HH:MM' (24hr)
  var startDT = date + 'T' + timeStart + ':00';
  var endDT   = date + 'T' + timeEnd   + ':00';
  // Format for Outlook: YYYYMMDDTHHmmss
  function fmt8601(dt) {
    return dt.replace(/[-:]/g, '').replace('T','T');
  }
  var params = new URLSearchParams({
    path:    '/calendar/action/compose',
    rru:     'addevent',
    subject: title,
    startdt: startDT,
    enddt:   endDT,
    location: location || '',
    body:    body || '',
  });
  return 'https://outlook.office.com/calendar/action/compose?' + params.toString();
}

function buildGoogleCalLink(title, date, timeStart, timeEnd, location, body) {
  function toGCal(dt) { return dt.replace(/[-:]/g,'').replace('T','T') + '00'; }
  var start = toGCal(date + 'T' + timeStart + ':00');
  var end   = toGCal(date + 'T' + timeEnd   + ':00');
  var params = new URLSearchParams({
    action: 'TEMPLATE',
    text:   title,
    dates:  start + '/' + end,
    location: location || '',
    details: body || '',
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

function calendarButtons(title, date, timeStart, timeEnd, location, body) {
  if (!date) return '';
  var outlink = buildOutlookLink(title, date, timeStart, timeEnd, location, body);
  var gclink  = buildGoogleCalLink(title, date, timeStart, timeEnd, location, body);
  return `
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <a href="${outlink}" target="_blank" style="display:flex;align-items:center;gap:8px;background:#0F2540;border:2px solid #2563BE;border-radius:12px;padding:12px 16px;text-decoration:none;flex:1;min-width:160px">
        <span style="font-size:22px">📅</span>
        <div>
          <div style="font-size:13px;font-weight:bold;color:#7EB3E8">Add to Outlook</div>
          <div style="font-size:11px;color:#4A6080;margin-top:1px">Tap to open calendar</div>
        </div>
      </a>
      <a href="${gclink}" target="_blank" style="display:flex;align-items:center;gap:8px;background:#0F2035;border:2px solid #1A3555;border-radius:12px;padding:12px 16px;text-decoration:none;flex:1;min-width:160px">
        <span style="font-size:22px">📆</span>
        <div>
          <div style="font-size:13px;font-weight:bold;color:#9DB8D4">Add to Google Cal</div>
          <div style="font-size:11px;color:#4A6080;margin-top:1px">Tap to open calendar</div>
        </div>
      </a>
    </div>`;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function badge(status) {
  const m = STATUS_META[status] || { bg:'#222', text:'#888', dot:'#666' };
  return `<div class="badge" style="background:${m.bg};color:${m.text}"><div class="badge-dot" style="background:${m.dot}"></div>${esc(status)}</div>`;
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2800);
}

// ── Derived ──────────────────────────────────────────────────────────────────
function allFups() {
  return state.customers.flatMap(c =>
    (c.notes||[]).filter(n=>n.followUpDate).map(n=>({...n, customerName:c.name, customerId:c.id}))
  ).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));
}
function overdueFups() { const td=today(); return allFups().filter(n=>n.followUpDate<td); }
function todayFups()   { const td=today(); return allFups().filter(n=>n.followUpDate===td); }
function alertCount()  { return overdueFups().length + todayFups().length; }

function stats() {
  return {
    total:   state.customers.length,
    leads:   state.customers.filter(c=>c.status==='Lead').length,
    active:  state.customers.filter(c=>['Quote Sent','Ordered','In Transit','Ready','Scheduled'].includes(c.status)).length,
    revenue: state.customers.reduce((s,c)=>s+(c.orders||[]).reduce((ss,o)=>ss+(parseFloat(o.price)||0),0),0),
  };
}

function filteredCustomers() {
  const q = state.search.toLowerCase();
  return state.customers.filter(c => {
    const ms = (c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q)||(c.address||'').toLowerCase().includes(q)||(c.interest||'').toLowerCase().includes(q);
    const mf = state.filterSt==='All'||c.status===state.filterSt;
    return ms&&mf;
  });
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  updateNavState();
  updateAlertBtn();
  const content = document.getElementById('content');
  const title   = document.getElementById('page-title');
  const titles  = { dashboard:'Dashboard', customers:'Customers', orders:'Order Board', followups:'Follow-Ups', reports:'Reports', prices:'Price Sheets', directory:'Manufacturer Directory', detail: state.selId ? (state.customers.find(c=>c.id===state.selId)||{}).name||'Customer' : 'Customer' };
  title.textContent = titles[state.tab] || '';

  switch(state.tab) {
    case 'dashboard':  content.innerHTML = renderDashboard(); break;
    case 'customers':  content.innerHTML = renderCustomers(); break;
    case 'orders':     content.innerHTML = renderOrders(); break;
    case 'followups':  content.innerHTML = renderFollowups(); break;
    case 'prices':     content.innerHTML = renderPrices(); break;
    case 'directory':  content.innerHTML = renderDirectory(); break;
    case 'reports':    content.innerHTML = renderReports(); break;
    case 'detail':     content.innerHTML = renderDetail(); break;
    default: content.innerHTML = '';
  }

  bindContentEvents();
  populateSelects();
}

function updateNavState() {
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  });
}

function updateAlertBtn() {
  const cnt = alertCount();
  const btn = document.getElementById('alert-btn');
  const badge = document.getElementById('fup-badge');
  if (cnt > 0) {
    btn.textContent = '🔔 ' + cnt;
    btn.style.display = 'block';
    badge.textContent = cnt;
    badge.style.display = 'inline';
  } else {
    btn.style.display = 'none';
    badge.style.display = 'none';
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const s = stats();
  const ov = overdueFups();
  const tf = todayFups();

  let alerts = '';
  if (ov.length) alerts += `<div class="alert-banner" style="background:#2A1515;border:1px solid #F87171;color:#F87171" data-goto="followups">⚠️ ${ov.length} overdue follow-up${ov.length>1?'s':''} — tap to view</div>`;
  if (tf.length) alerts += `<div class="alert-banner" style="background:#2A200A;border:1px solid #F5A623;color:#F5A623" data-goto="followups">📅 ${tf.length} follow-up${tf.length>1?'s':''} due today</div>`;

  // Revenue goal tracker
  const goal = state.revenueGoal || 0;
  const pct  = goal > 0 ? Math.min(100, Math.round((s.revenue / goal) * 100)) : 0;
  const goalColor = pct >= 100 ? '#4ADE80' : pct >= 60 ? '#F5A623' : '#F87171';
  const goalBar = goal > 0 ? `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;color:#2563BE;text-transform:uppercase;letter-spacing:2px">Monthly Revenue Goal</div>
        <div style="font-size:12px;color:#4A6080">
          <input id="goal-input" type="number" value="${goal}" style="background:#071221;border:1px solid #333;border-radius:6px;color:#F0EDE6;padding:4px 8px;font-size:12px;width:110px;font-family:Georgia,serif" placeholder="Set goal..."/>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:22px;font-weight:bold;color:${goalColor}">$${s.revenue.toLocaleString()}</div>
        <div style="font-size:14px;color:#4A6080;align-self:center">of $${goal.toLocaleString()}</div>
      </div>
      <div style="background:#0A1525;border-radius:10px;height:10px;overflow:hidden">
        <div style="background:${goalColor};width:${pct}%;height:100%;border-radius:10px;transition:width .5s ease"></div>
      </div>
      <div style="font-size:12px;color:#4A6080;margin-top:6px">${pct}% of goal${pct>=100?' — Goal reached! 🎉':''}</div>
    </div>` : `
    <div class="card" style="margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="flex:1">
        <div style="font-size:12px;color:#2563BE;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Monthly Revenue Goal</div>
        <div style="font-size:13px;color:#4A6080">Set a goal to track your progress</div>
      </div>
      <input id="goal-input" type="number" placeholder="$ Goal" style="background:#071221;border:1px solid #333;border-radius:8px;color:#F0EDE6;padding:8px 10px;font-size:13px;width:110px;font-family:Georgia,serif"/>
    </div>`;

  const recent = state.customers.slice(0,6).map(c => `
    <div class="cust-row" data-detail="${esc(c.id)}">
      <div><div class="cust-row-name">${esc(c.name)}</div><div class="cust-row-sub">${[c.salesman ? '👤 '+esc(c.salesman) : null, c.phone, c.interest, (c.orders||[]).length ? `${c.orders.length} order${c.orders.length!==1?'s':''}` : null].filter(Boolean).join(' · ')}</div></div>
      ${badge(c.status)}
    </div>`).join('') || `<div class="empty">No customers yet — tap 🚶 to log your first walk-in!</div>`;

  return `
    <p style="color:#2A4A70;font-size:12px;margin-bottom:16px">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-val" style="color:#C8A96E">${s.total}</div><div class="stat-lbl">Customers</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#F5A623">${s.leads}</div><div class="stat-lbl">Leads</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#17A2B8">${s.active}</div><div class="stat-lbl">In Progress</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#4ADE80">$${s.revenue.toLocaleString()}</div><div class="stat-lbl">Revenue</div></div>
    </div>
    ${alerts}
    ${goalBar}
    <div class="quick-grid">
      <button class="quick-btn" style="border-color:#C8A96E33;color:#C8A96E" data-action="walkin"><span class="quick-icon">🚶</span>Log Walk-In</button>
      <button class="quick-btn" style="border-color:#88888833;color:#888" data-action="addcust"><span class="quick-icon">＋</span>Add Customer</button>
      <button class="quick-btn" style="border-color:#A78BFA33;color:#A78BFA" data-goto="orders"><span class="quick-icon">📋</span>Order Board</button>
      <button class="quick-btn" style="border-color:#4ADE8033;color:#4ADE80" data-goto="prices"><span class="quick-icon">💰</span>Price Sheets</button>
    </div>
    <div class="sec-lbl">Recent Customers</div>
    ${recent}`;
}

// ── Customers ────────────────────────────────────────────────────────────────
function renderCustomers() {
  const fc = filteredCustomers();
  const rows = fc.map(c => `
    <div class="cust-row" data-detail="${esc(c.id)}">
      <div style="min-width:0">
        <div class="cust-row-name">${esc(c.name)}</div>
        <div class="cust-row-sub">${[c.salesman ? '👤 '+c.salesman : null, c.phone, c.interest, (c.orders||[]).length ? `${c.orders.length} order${c.orders.length!==1?'s':''}` : null].filter(Boolean).join(' · ')}</div>
        ${c.address ? `<div style="color:#2A4A70;font-size:12px;margin-top:1px">${esc(c.address)}</div>` : ''}
      </div>
      ${badge(c.status)}
    </div>`).join('') || `<div class="empty">No customers found.</div>`;

  const statusOpts = ['All',...PIPELINE].map(s => `<option ${s===state.filterSt?'selected':''}>${s}</option>`).join('');

  return `
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <input class="inp" id="cust-search" style="flex:1;min-width:180px" placeholder="🔍 Name, phone, email, address..." value="${esc(state.search)}"/>
      <select class="inp" id="cust-filter" style="width:140px">${statusOpts}</select>
    </div>
    <div style="color:#2A4A70;font-size:12px;margin-bottom:10px">${fc.length} customer${fc.length!==1?'s':''}</div>
    ${rows}`;
}

// ── Orders ───────────────────────────────────────────────────────────────────
function renderOrders() {
  const stages = state.boardFilter==='All' ? PIPELINE.filter(s=>s!=='Installed') : [state.boardFilter];
  const tabs = ['All',...PIPELINE.filter(s=>s!=='Installed')].map(s =>
    `<button class="filter-tab ${state.boardFilter===s?'active':''}" data-board-filter="${esc(s)}">${s}</button>`
  ).join('');

  let html = `<div class="filter-tabs">${tabs}</div>`;
  let any = false;

  stages.forEach(status => {
    const orders = state.customers.flatMap(c =>
      (c.orders||[]).filter(o=>o.status===status).map(o=>({...o, customerName:c.name, customerId:c.id}))
    );
    if (!orders.length) return;
    any = true;
    const m = STATUS_META[status]||{};
    html += `<div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:${m.dot||'#888'}"></div>
        <span style="font-size:11px;color:${m.text||'#aaa'};text-transform:uppercase;letter-spacing:1px;font-weight:bold">${status}</span>
        <span style="font-size:11px;color:#2A4A70">(${orders.length})</span>
      </div>`;
    orders.forEach(o => {
      const opts = PIPELINE.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('');
      html += `<div class="card" style="cursor:pointer" data-detail="${esc(o.customerId)}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="min-width:0;flex:1">
            <div style="font-weight:bold;font-size:14px">${esc(o.customerName)}</div>
            <div style="color:#888;font-size:13px">${esc(o.flooringType)}${o.color?` · ${esc(o.color)}`:''} · ${esc(o.manufacturer)}</div>
            ${o.orderNum?`<div style="color:#4A6080;font-size:12px;margin-top:2px">PO#: ${esc(o.orderNum)}</div>`:''}
            ${o.msJobRef?`<div style="color:#4A6080;font-size:12px">MS: ${esc(o.msJobRef)}</div>`:''}
            ${o.sqft?`<div style="color:#777;font-size:12px">${esc(o.sqft)} sf${o.price?` · $${parseFloat(o.price).toLocaleString()}`:''}</div>`:''}
            ${o.installDate?`<div style="color:#7EB3E8;font-size:12px;margin-top:2px">Install: ${fmt(o.installDate)}</div>`:''}
          </div>
          <select class="inp" style="width:130px;font-size:12px;padding:6px 10px;flex-shrink:0" data-order-status="${esc(o.id)}" onclick="event.stopPropagation()">${opts}</select>
        </div>
      </div>`;
    });
    html += `</div>`;
  });

  if (!any) html += `<div class="empty">No orders in this stage.</div>`;
  return html;
}

// ── Follow-Ups ───────────────────────────────────────────────────────────────
function renderFollowups() {
  const td = today();
  const ov = overdueFups(), tf = todayFups();
  const tabs = ['all','overdue','today','upcoming'].map(f => {
    let lbl = f.charAt(0).toUpperCase()+f.slice(1);
    if (f==='overdue'&&ov.length) lbl+=` (${ov.length})`;
    if (f==='today'&&tf.length)   lbl+=` (${tf.length})`;
    return `<button class="filter-tab ${state.fupFilter===f?'active':''}" data-fup-filter="${f}">${lbl}</button>`;
  }).join('');

  let items = allFups();
  if (state.fupFilter==='overdue')  items = items.filter(n=>n.followUpDate<td);
  if (state.fupFilter==='today')    items = items.filter(n=>n.followUpDate===td);
  if (state.fupFilter==='upcoming') items = items.filter(n=>n.followUpDate>td);

  const rows = items.map(n => {
    const isOv = n.followUpDate<td, isTd = n.followUpDate===td;
    return `<div class="card" style="background:${isOv?'#2A1515':isTd?'#2A200A':'#1C1C1A'};border-color:${isOv?'#F87171':isTd?'#F5A623':'#252520'};cursor:pointer" data-detail="${esc(n.customerId)}">
      <div style="font-weight:bold;font-size:14px">${esc(n.customerName)}</div>
      <div style="color:#aaa;font-size:13px;margin-top:4px;line-height:1.5">${esc(n.text)}</div>
      <div style="font-size:12px;margin-top:6px;color:${isOv?'#F87171':isTd?'#F5A623':'#666'}">${isOv?'⚠️ Overdue · ':isTd?'📅 Today · ':'📌 '}${fmt(n.followUpDate)}</div>
    </div>`;
  }).join('') || `<div class="empty">No follow-ups in this view.</div>`;

  return `<div class="filter-tabs">${tabs}</div>${rows}`;
}


// ── Reports ───────────────────────────────────────────────────────────────────
function renderReports() {
  // Source breakdown
  const sourceCounts = {};
  state.customers.forEach(c => {
    const src = c.source || 'Unknown';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const total = state.customers.length || 1;
  const sourceRows = Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1]).map(([src,cnt]) => {
    const pct = Math.round((cnt/total)*100);
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:14px;color:#C0B8AE">${esc(src)}</div>
        <div style="font-size:14px;font-weight:bold;color:#C8A96E">${cnt} <span style="font-size:11px;color:#4A6080;font-weight:normal">(${pct}%)</span></div>
      </div>
      <div style="background:#0A1525;border-radius:6px;height:8px;overflow:hidden">
        <div style="background:#2563BE;width:${pct}%;height:100%;border-radius:6px"></div>
      </div>
    </div>`;
  }).join('') || '<div class="empty">No customer data yet.</div>';

  // Salesman breakdown
  const salesCounts = {}, salesRevenue = {};
  state.customers.forEach(c => {
    const s = c.salesman ? (c.salesrep ? `${c.salesman} / Rep: ${c.salesrep}` : c.salesman) : 'Unassigned';
    salesCounts[s] = (salesCounts[s] || 0) + 1;
    salesRevenue[s] = (salesRevenue[s] || 0) + (c.orders||[]).reduce((sum,o)=>sum+(parseFloat(o.price)||0),0);
  });
  const salesRows = Object.entries(salesCounts).sort((a,b)=>b[1]-a[1]).map(([name,cnt]) => {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #0A1525">
      <div>
        <div style="font-size:14px;font-weight:bold">${esc(name)}</div>
        <div style="font-size:12px;color:#4A6080">${cnt} customer${cnt!==1?'s':''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:bold;color:#4ADE80">$${(salesRevenue[name]||0).toLocaleString()}</div>
        <div style="font-size:11px;color:#4A6080">est. revenue</div>
      </div>
    </div>`;
  }).join('') || '<div class="empty">No salesman data yet. Add a salesman name when logging customers.</div>';

  // Pipeline breakdown
  const pipelineCounts = {};
  state.customers.forEach(c => { pipelineCounts[c.status] = (pipelineCounts[c.status]||0)+1; });
  const pipelineRows = PIPELINE.map(stage => {
    const cnt = pipelineCounts[stage] || 0;
    if (!cnt) return '';
    const m = STATUS_META[stage] || {text:'#888',dot:'#888'};
    const pct = Math.round((cnt/total)*100);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #0A1525">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:${m.dot};flex-shrink:0"></div>
        <div style="font-size:14px;color:${m.text}">${stage}</div>
      </div>
      <div style="font-size:14px;font-weight:bold;color:#C8A96E">${cnt} <span style="font-size:11px;color:#4A6080;font-weight:normal">(${pct}%)</span></div>
    </div>`;
  }).join('');

  // Flooring type breakdown from orders
  const floorCounts = {};
  state.customers.forEach(c => (c.orders||[]).forEach(o => {
    floorCounts[o.flooringType] = (floorCounts[o.flooringType]||0)+1;
  }));
  const totalOrders = Object.values(floorCounts).reduce((a,b)=>a+b,0) || 1;
  const floorRows = Object.entries(floorCounts).sort((a,b)=>b[1]-a[1]).map(([type,cnt]) => {
    const pct = Math.round((cnt/totalOrders)*100);
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:14px;color:#C0B8AE">${esc(type)}</div>
        <div style="font-size:14px;font-weight:bold;color:#6BA3D6">${cnt} order${cnt!==1?'s':''} <span style="font-size:11px;color:#4A6080;font-weight:normal">(${pct}%)</span></div>
      </div>
      <div style="background:#0A1525;border-radius:6px;height:6px;overflow:hidden">
        <div style="background:#7EB3E8;width:${pct}%;height:100%;border-radius:6px"></div>
      </div>
    </div>`;
  }).join('') || '<div class="empty">No orders yet.</div>';

  return `
    <div class="sec-lbl" style="margin-bottom:16px">Business Snapshot</div>

    <div class="card" style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:bold;margin-bottom:14px">📣 Customer Sources</div>
      ${sourceRows}
    </div>

    <div class="card" style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:bold;margin-bottom:4px">👤 Salesman Breakdown</div>
      <div style="font-size:12px;color:#4A6080;margin-bottom:12px">Customers logged and estimated revenue per salesman</div>
      ${salesRows}
    </div>

    <div class="card" style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:bold;margin-bottom:4px">📋 Pipeline Status</div>
      <div style="font-size:12px;color:#4A6080;margin-bottom:12px">Where customers currently stand</div>
      ${pipelineRows || '<div class="empty">No customers yet.</div>'}
    </div>

    <div class="card" style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:bold;margin-bottom:14px">🪵 Top Flooring Types Ordered</div>
      ${floorRows}
    </div>`;
}

// ── Prices ───────────────────────────────────────────────────────────────────
function renderPrices() {
  const tabs = `
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="filter-tab ${state.priceTab==='labor'?'active':''}" data-price-tab="labor">Apollo Labor</button>
      <button class="filter-tab ${state.priceTab==='mfr'?'active':''}" data-price-tab="mfr">Manufacturer</button>
    </div>`;

  // ── LABOR TAB ─────────────────────────────────────────────────────────────
  if (state.priceTab==='labor') {
    const q = (state.sheetSearch||'').toLowerCase();
    const secTabs = Object.keys(LABOR_PRICES).map(s =>
      `<button class="filter-tab ${state.laborSec===s?'active':''}" data-labor-sec="${esc(s)}">${s}</button>`
    ).join('');
    const filtered = q
      ? Object.values(LABOR_PRICES).flat().filter(it => it.service.toLowerCase().includes(q))
      : LABOR_PRICES[state.laborSec];
    const rows = filtered.map(item =>
      `<div class="price-row"><div class="price-service">${esc(item.service)}</div><div class="price-val">${esc(item.price)}</div></div>`
    ).join('') || `<div class="empty">No results for "${esc(state.sheetSearch)}"</div>`;
    return `${tabs}
      <input class="inp" id="sheet-search" placeholder="🔍 Search labor rates..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:16px"/>
      <div style="font-size:10px;color:#7EB3E8;letter-spacing:3px;text-transform:uppercase;margin-bottom:2px">Apollo Flooring</div>
      <div style="font-size:20px;font-weight:bold;margin-bottom:2px">Installation Labor Rates</div>
      <div style="font-size:12px;color:#2A4A70;margin-bottom:18px">Effective 2/1/2026</div>
      ${q ? '' : `<div class="filter-tabs">${secTabs}</div>`}
      ${rows}`;
  }

  // ── MANUFACTURER TAB ──────────────────────────────────────────────────────
  // Sort manufacturers alphabetically always
  const sortedMfrs = [...state.mfrs].sort((a,b) => a.name.localeCompare(b.name));

  // ── SHEET ITEM VIEW — full list of items in one sheet with search ─────────
  if (state.activeSheetId) {
    const sheet = state.sheets.find(s=>s.id===state.activeSheetId);
    const mfr   = sheet ? state.mfrs.find(m=>m.id===sheet.mfrId) : null;
    if (!sheet) { state.activeSheetId=null; return renderPrices(); }

    const q = (state.sheetSearch||'').toLowerCase();
    const filteredItems = q
      ? sheet.items.filter(it => (it.service||'').toLowerCase().includes(q) || (it.price||'').toLowerCase().includes(q))
      : sheet.items;

    const rows = filteredItems.map(it =>
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:11px 0;border-bottom:1px solid #0A1525;gap:12px">
        <div style="font-size:14px;color:#C8D8E8;flex:1;line-height:1.5">${esc(it.service)}</div>
        <div style="font-size:15px;font-weight:bold;color:#7EB3E8;white-space:nowrap;flex-shrink:0">${esc(it.price)}</div>
      </div>`
    ).join('') || `<div class="empty">No items match "${esc(state.sheetSearch)}"</div>`;

    return `${tabs}
      <button style="background:none;border:none;color:#7EB3E8;cursor:pointer;padding:0;font-size:14px;margin-bottom:16px;font-family:Georgia,serif;display:flex;align-items:center;gap:6px" data-back-to-mfr="${esc(sheet.mfrId)}">← Back to ${esc(mfr?mfr.name:'Manufacturer')}</button>

      <div style="background:#0F2035;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #1A3555">
        <div style="font-size:10px;color:#7EB3E8;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">${esc(mfr?mfr.name:'')}</div>
        <div style="font-size:20px;font-weight:bold;margin-bottom:2px">${esc(sheet.name)}</div>
        ${sheet.effectiveDate?`<div style="font-size:12px;color:#4A6080;margin-bottom:2px">Effective: ${fmt(sheet.effectiveDate)}</div>`:''}
        <div style="font-size:12px;color:#4A6080">${sheet.items.length} items total</div>
      </div>

      <input class="inp" id="sheet-search" placeholder="🔍 Search within this price sheet..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:4px"/>
      ${q ? `<div style="font-size:12px;color:#4A6080;margin-bottom:14px">${filteredItems.length} result${filteredItems.length!==1?'s':''}</div>` : `<div style="margin-bottom:16px"></div>`}
      ${rows}`;
  }

  // ── MANUFACTURER VIEW — one mfr's sheets + PDFs + item search ────────────
  if (state.activeMfrId) {
    const mfr = state.mfrs.find(m=>m.id===state.activeMfrId);
    if (!mfr) { state.activeMfrId=null; return renderPrices(); }
    const mfrSheets = state.sheets.filter(s=>s.mfrId===mfr.id);

    // Search across all sheets for this manufacturer
    const q = (state.sheetSearch||'').toLowerCase();
    let searchResults = '';
    let totalHits = 0;
    if (q) {
      mfrSheets.forEach(sheet => {
        const hits = sheet.items.filter(it =>
          (it.service||'').toLowerCase().includes(q) || (it.price||'').toLowerCase().includes(q)
        );
        if (!hits.length) return;
        totalHits += hits.length;
        searchResults += `<div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px">${esc(sheet.name)}</div>`;
        searchResults += hits.map(it =>
          `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #0A1525;gap:12px">
            <div style="font-size:14px;color:#C8D8E8;flex:1;line-height:1.5">${esc(it.service)}</div>
            <div style="font-size:15px;font-weight:bold;color:#7EB3E8;white-space:nowrap;flex-shrink:0">${esc(it.price)}</div>
          </div>`
        ).join('');
      });
    }

    // PDF download buttons
    const pdfList = mfr.pdfs || (mfr.pdf ? [{file:mfr.pdf, label:mfr.pdfLabel||'Download Price Sheet'}] : []);
    const pdfBtns = pdfList.map(p =>
      `<a href="${esc(p.file)}" download="${esc(p.label||p.file)}" style="display:flex;align-items:center;gap:12px;background:#071221;border:2px solid #2563BE;border-radius:12px;padding:14px 16px;margin-bottom:10px;text-decoration:none">
        <span style="font-size:26px">📄</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:bold;color:#7EB3E8">${esc(p.label||p.file)}</div>
          <div style="font-size:12px;color:#4A6080;margin-top:2px">Tap to download PDF</div>
        </div>
        <span style="color:#7EB3E8;font-size:20px">↓</span>
      </a>`
    ).join('');

    // Price sheet cards — tap to open full item list
    const sheetCards = mfrSheets.length
      ? mfrSheets.map(sheet => {
          const totalItems = sheet.items.length;
          return `<div class="cust-row" data-open-sheet="${esc(sheet.id)}" style="flex-direction:column;align-items:flex-start;gap:4px">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
              <div style="flex:1;min-width:0">
                <div style="font-weight:bold;font-size:15px">${esc(sheet.name)}</div>
                ${sheet.effectiveDate?`<div style="font-size:12px;color:#4A6080;margin-top:2px">Effective: ${fmt(sheet.effectiveDate)}</div>`:''}
                <div style="font-size:12px;color:#4A6080;margin-top:2px">${totalItems} items — tap to view &amp; search</div>
              </div>
              <div style="color:#7EB3E8;font-size:22px;flex-shrink:0">›</div>
            </div>
          </div>`;
        }).join('')
      : `<div class="empty">No price sheets yet for ${esc(mfr.name)}.</div>`;

    return `${tabs}
      <button style="background:none;border:none;color:#7EB3E8;cursor:pointer;padding:0;font-size:14px;margin-bottom:16px;font-family:Georgia,serif;display:flex;align-items:center;gap:6px" data-back-to-list>← All Manufacturers</button>

      <div style="background:#0F2035;border-radius:14px;padding:18px;margin-bottom:16px;border:1px solid #1A3555">
        <div style="font-size:22px;font-weight:bold;margin-bottom:4px">${esc(mfr.name)}</div>
        ${mfr.notes?`<div style="font-size:13px;color:#4A6080;margin-bottom:6px">${esc(mfr.notes)}</div>`:''}
        ${mfr.rep?`<div style="font-size:14px;color:#E8EEF5;margin-bottom:2px">👤 ${esc(mfr.rep)}</div>`:''}
        ${mfr.phone?`<a href="tel:${esc(mfr.phone)}" style="color:#7EB3E8;font-size:14px;display:block;margin-top:4px">📞 ${esc(mfr.phone)}</a>`:''}
      </div>

      <div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">🔍 Search Price Sheets</div>
      <input class="inp" id="sheet-search" placeholder="Search styles, colors, SKUs, prices..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:12px"/>
      ${q
        ? `<div style="font-size:12px;color:#4A6080;margin-bottom:12px">${totalHits} result${totalHits!==1?'s':''} for "${esc(state.sheetSearch)}"</div>${searchResults || '<div class="empty">No results found.</div>'}`
        : `<div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Price Sheets</div>${sheetCards}
           <button class="btn-ghost" style="width:100%;padding:12px;margin-top:12px" data-add-sheet="${esc(mfr.id)}">+ Add Price Sheet</button>`
      }

      ${pdfBtns ? `<div style="font-size:11px;color:#7EB3E8;text-transform:uppercase;letter-spacing:2px;margin-top:24px;margin-bottom:10px;border-top:1px solid #1A3555;padding-top:20px">📄 Original PDF Downloads</div>${pdfBtns}` : ''}`;
  }

  // ── TOP LEVEL — alphabetical manufacturer list with search ────────────────
  const topQ = (state.sheetSearch||'').toLowerCase();

  // If searching at top level — search across ALL manufacturers and ALL sheets
  if (topQ) {
    let allResults = '';
    let grandTotal = 0;
    sortedMfrs.forEach(mfr => {
      const mfrSheets = state.sheets.filter(s=>s.mfrId===mfr.id);
      const hits = [];
      mfrSheets.forEach(sheet => {
        sheet.items.forEach(it => {
          if ((it.service||'').toLowerCase().includes(topQ) || (it.price||'').toLowerCase().includes(topQ)) {
            hits.push({...it, sheetName: sheet.name});
          }
        });
      });
      // Also match manufacturer name itself
      const nameMatch = mfr.name.toLowerCase().includes(topQ);
      if (!hits.length && !nameMatch) return;
      grandTotal += hits.length;

      allResults += `<div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${hits.length?'10px':'0'}" data-open-mfr="${esc(mfr.id)}" style="cursor:pointer">
          <div>
            <div style="font-weight:bold;font-size:15px;color:#E8EEF5">${esc(mfr.name)}</div>
            ${hits.length?`<div style="font-size:12px;color:#4A6080">${hits.length} matching item${hits.length!==1?'s':''}</div>`:`<div style="font-size:12px;color:#4A6080">Tap to view</div>`}
          </div>
          <div style="color:#7EB3E8;font-size:20px">›</div>
        </div>
        ${hits.slice(0,5).map(it =>
          `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-top:1px solid #0A1525;gap:12px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#C8D8E8;line-height:1.5">${esc(it.service)}</div>
              <div style="font-size:11px;color:#4A6080;margin-top:1px">${esc(it.sheetName)}</div>
            </div>
            <div style="font-size:14px;font-weight:bold;color:#7EB3E8;white-space:nowrap;flex-shrink:0">${esc(it.price)}</div>
          </div>`
        ).join('')}
        ${hits.length>5?`<div style="font-size:12px;color:#4A6080;padding:8px 0;border-top:1px solid #0A1525">+${hits.length-5} more — tap to see all</div>`:''}
      </div>`;
    });

    return `${tabs}
      <input class="inp" id="sheet-search" placeholder="🔍 Search all manufacturers & price sheets..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:12px"/>
      <div style="font-size:12px;color:#4A6080;margin-bottom:16px">${grandTotal} item${grandTotal!==1?'s':''} found across all manufacturers</div>
      ${allResults || '<div class="empty">No results found across any manufacturer.</div>'}`;
  }

  // Normal top-level: alphabetical list
  const mfrList = sortedMfrs.map(mfr => {
    const mfrSheets = state.sheets.filter(s=>s.mfrId===mfr.id);
    const hasSheets  = mfrSheets.length > 0;
    const totalItems = mfrSheets.reduce((t,s)=>t+s.items.length, 0);
    const hasPdfs    = !!(mfr.pdfs||mfr.pdf);
    return `<div class="cust-row" data-open-mfr="${esc(mfr.id)}">
      <div style="min-width:0;flex:1">
        <div style="font-weight:bold;font-size:15px">${esc(mfr.name)}</div>
        <div style="font-size:12px;color:#4A6080;margin-top:2px;display:flex;gap:10px;flex-wrap:wrap">
          ${hasSheets ? `<span>📋 ${totalItems} items</span>` : '<span style="color:#2A4A70">No price sheets</span>'}
          ${hasPdfs ? `<span>📄 PDF available</span>` : ''}
          ${mfr.rep ? `<span>👤 ${esc(mfr.rep)}</span>` : ''}
        </div>
      </div>
      <div style="color:${hasSheets||hasPdfs?'#7EB3E8':'#2A4A70'};font-size:22px">›</div>
    </div>`;
  }).join('');

  return `${tabs}
    <input class="inp" id="sheet-search" placeholder="🔍 Search all manufacturers &amp; price sheets..." value="${esc(state.sheetSearch||'')}" style="margin-bottom:8px"/>
    <div style="font-size:11px;color:#4A6080;margin-bottom:16px">${sortedMfrs.length} manufacturers · tap any to view price sheets &amp; PDFs</div>
    ${mfrList}
    <button class="btn-ghost" style="width:100%;padding:12px;margin-top:12px" data-add-mfr>+ Add Manufacturer</button>`;
}


// ── Directory ────────────────────────────────────────────────────────────────
function renderDirectory() {
  // Always alphabetical — new manufacturers insert in correct order automatically
  const sortedMfrsDir = [...state.mfrs].sort((a,b) => a.name.localeCompare(b.name));

  // Search filter
  const dirQ = (state.dirSearch||'').toLowerCase();
  const filtered = dirQ
    ? sortedMfrsDir.filter(m =>
        m.name.toLowerCase().includes(dirQ) ||
        (m.rep||'').toLowerCase().includes(dirQ) ||
        (m.phone||'').includes(dirQ) ||
        (m.notes||'').toLowerCase().includes(dirQ)
      )
    : sortedMfrsDir;

  const cards = filtered.map(mfr => {
    if (state.editMfr && state.editMfr.id === mfr.id) {
      return `<div class="card">
        <div style="font-weight:bold;font-size:15px;color:#7EB3E8;margin-bottom:14px">Editing: ${esc(mfr.name)}</div>
        <div class="field"><label>Name</label><input class="inp" id="em-name" value="${esc(state.editMfr.name)}"/></div>
        <div class="grid2">
          <div class="field"><label>Rep Name</label><input class="inp" id="em-rep" placeholder="John Smith" value="${esc(state.editMfr.rep)}"/></div>
          <div class="field"><label>Rep Phone</label><input class="inp" id="em-phone" type="tel" value="${esc(state.editMfr.phone)}"/></div>
        </div>
        <div class="field"><label>Rep Email</label><input class="inp" id="em-email" type="email" value="${esc(state.editMfr.email)}"/></div>
        <div class="field"><label>Portal / Website</label><input class="inp" id="em-portal" placeholder="https://..." value="${esc(state.editMfr.portal)}"/></div>
        <div class="field"><label>Notes</label><textarea class="inp" id="em-notes" rows="2" style="resize:vertical">${esc(state.editMfr.notes)}</textarea></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <button class="btn-ghost" style="background:#2563BE;color:#fff;border:none;font-weight:bold" id="em-save">Save</button>
          <button class="btn-ghost" id="em-cancel">Cancel</button>
          <button class="btn-ghost btn-danger" id="em-delete" style="margin-left:auto">Delete</button>
        </div>
      </div>`;
    }
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:bold;font-size:16px;margin-bottom:6px">${esc(mfr.name)}</div>
          ${mfr.rep?`<div style="color:#C8D8E8;font-size:13px;margin-bottom:2px">👤 Rep: ${esc(mfr.rep)}</div>`:''}
          ${mfr.phone?`<a href="tel:${esc(mfr.phone)}" class="contact-link phone">📞 ${esc(mfr.phone)}</a>`:''}
          ${mfr.email?`<a href="mailto:${esc(mfr.email)}" class="contact-link email">✉️ ${esc(mfr.email)}</a>`:''}
          ${mfr.portal?`<a href="${esc(mfr.portal)}" target="_blank" class="contact-link portal">🌐 Order Portal</a>`:''}
          ${mfr.notes?`<div style="color:#4A6080;font-size:12px;margin-top:6px">${esc(mfr.notes)}</div>`:''}
          ${!mfr.rep&&!mfr.phone&&!mfr.email?`<div style="color:#2A4A70;font-size:13px">No contact info yet — tap Edit to add.</div>`:''}
        </div>
        <button class="btn-ghost" data-edit-mfr="${esc(mfr.id)}">Edit</button>
      </div>
    </div>`;
  }).join('');

  return `
    <input class="inp" id="dir-search" placeholder="🔍 Search manufacturers, reps, phone numbers..." value="${esc(state.dirSearch||'')}" style="margin-bottom:8px"/>
    <div style="font-size:11px;color:#4A6080;margin-bottom:16px">${filtered.length} manufacturer${filtered.length!==1?'s':''} · sorted A–Z · tap Edit to update contact info</div>
    ${cards || '<div class="empty">No manufacturers match your search.</div>'}
    <button class="btn-ghost" style="width:100%;padding:12px;margin-top:12px" data-add-mfr>+ Add Manufacturer</button>`;
}

// ── Detail ───────────────────────────────────────────────────────────────────
function renderDetail() {
  const c = state.customers.find(x=>x.id===state.selId);
  if (!c) return `<div class="empty">Customer not found.</div>`;
  const td = today();

  const pipelineStages = PIPELINE.map((stage,i) => {
    const active = c.status===stage;
    const past   = PIPELINE.indexOf(c.status)>i;
    const bg   = active?'#2563BE':past?'#0F1F35':'#0D1B2E';
    const color= active?'#fff':past?'#2563BE88':'#2A4A70';
    const border= active?'none':'1px solid #1A3555';
    return `<div class="pipeline-stage">
      <button class="pipeline-btn" style="background:${bg};color:${color};border:${border}" data-set-status="${esc(c.id)}" data-status-val="${esc(stage)}">${stage}</button>
      ${i<PIPELINE.length-1?'<div class="pipeline-sep"></div>':''}
    </div>`;
  }).join('');

  // ── Calendar booking card ──────────────────────────────────────────────────
  var calCard = '';
  if (c.status === 'Measure Scheduled' || c.status === 'Scheduled') {
    var isMeasure  = c.status === 'Measure Scheduled';
    var calTitle   = isMeasure
      ? 'Measure: ' + c.name + (c.address ? ' — ' + c.address : '')
      : 'Install: ' + c.name + (c.address ? ' — ' + c.address : '');
    var calColor   = isMeasure ? '#C084FC' : '#FB923C';
    var calBg      = isMeasure ? '#1E1A2E' : '#2A1F10';
    var calBorder  = isMeasure ? '#C084FC' : '#FB923C';
    var calEmoji   = isMeasure ? '📐' : '🔨';
    var calHint    = isMeasure
      ? 'Adds to Apollo Group Calendar'
      : 'Adds to Apollo Group Calendar';
    var installDate = (c.orders && c.orders[0] && c.orders[0].installDate) ? c.orders[0].installDate : '';

    calCard = `
    <div style="background:${calBg};border:2px solid ${calBorder};border-radius:14px;padding:18px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:bold;color:${calColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${calEmoji} Add to Calendar</div>
      <div style="font-size:15px;font-weight:bold;color:#E8EEF5;margin-bottom:4px">${esc(calTitle)}</div>
      <div style="font-size:12px;color:#4A6080;margin-bottom:14px">${calHint}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Date</label>
          ${dateInput('cal-date-'+esc(c.id), esc(installDate))}
        </div>
        <div>
          <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Start Time</label>
          <select class="inp time-select" id="cal-start-${esc(c.id)}" style="font-size:14px;padding:10px">${timeOptions('08:00')}</select>
        </div>
        <div>
          <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">End Time</label>
          <select class="inp time-select" id="cal-end-${esc(c.id)}" style="font-size:14px;padding:10px">${timeOptions('10:00')}</select>
        </div>
        <div>
          <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Location</label>
          <input class="inp" type="text" id="cal-loc-${esc(c.id)}" value="${esc(c.address||'')}" placeholder="Address" style="font-size:14px;padding:10px"/>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Notes for Calendar Event</label>
        <textarea class="inp" id="cal-notes-${esc(c.id)}" rows="2" placeholder="e.g. Flooring type, sq footage, special instructions..." style="font-size:13px;resize:vertical">${esc(c.interest||'')}</textarea>
      </div>

      <div id="cal-buttons-${esc(c.id)}">
        <button onclick="generateCalButtons('${esc(c.id)}','${esc(calTitle)}')" style="width:100%;background:#2563BE;color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:bold;font-family:Georgia,serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          📅 Generate Calendar Event
        </button>
      </div>
    </div>`;
  }

  const statusOpts = PIPELINE.map(s=>`<option ${s===c.status?'selected':''}>${s}</option>`).join('');

  const orders = (c.orders||[]).map(o => {
    const opts = PIPELINE.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('');
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="min-width:0;flex:1">
          <div style="font-weight:bold;font-size:15px">${esc(o.flooringType)}${o.color?` · ${esc(o.color)}`:''}</div>
          <div style="color:#888;font-size:13px">${esc(o.manufacturer)}${o.sqft?` · ${esc(o.sqft)} sf`:''}${o.price?` · $${parseFloat(o.price).toLocaleString()}`:''}</div>
          ${o.orderNum?`<div style="color:#4A6080;font-size:12px;margin-top:3px">PO/Order #: ${esc(o.orderNum)}</div>`:''}
          ${o.msJobRef?`<div style="color:#4A6080;font-size:12px">MeasureSquare: ${esc(o.msJobRef)}</div>`:''}
          ${o.installDate?`<div style="color:#7EB3E8;font-size:12px;margin-top:3px">📅 Install: ${fmt(o.installDate)}</div>`:''}
          ${o.notes?`<div style="color:#4A6080;font-size:12px;margin-top:3px">${esc(o.notes)}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <select class="inp" style="width:130px;font-size:12px;padding:6px 10px" data-order-status="${esc(o.id)}">${opts}</select>
          <button class="btn-ghost btn-danger" style="font-size:11px;padding:3px 10px" data-del-order="${esc(o.id)}">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty">No orders yet.</div>`;

  const notes = (c.notes||[]).map(n => {
    const isOv = n.followUpDate && n.followUpDate<td;
    return `<div style="background:${isOv?'#2A1515':'#1C1C1A'};border-radius:10px;padding:13px 16px;margin-bottom:8px;border:1px solid ${isOv?'#F87171':'#252520'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <div style="font-size:14px;line-height:1.6">${esc(n.text)}</div>
          ${n.followUpDate?`<div style="font-size:12px;color:${isOv?'#F87171':'#C8A96E'};margin-top:4px">${isOv?'⚠️ Overdue · ':'📅 Follow-up: '}${fmt(n.followUpDate)}</div>`:''}
          <div style="font-size:11px;color:#1E3A5F;margin-top:4px">${fmt(n.createdAt)}</div>
        </div>
        <button style="background:none;border:none;color:#1E3A5F;font-size:20px;line-height:1;cursor:pointer" data-del-note="${esc(n.id)}">✕</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty">No notes yet.</div>`;

  return `
    <button style="background:none;border:none;color:#4A6080;cursor:pointer;padding:0;font-size:13px;margin-bottom:16px;font-family:Georgia,serif" data-goto="customers">← Back to Customers</button>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px">
        <div>
          <div style="font-size:22px;font-weight:bold">${esc(c.name)}</div>
          ${c.source?`<div style="font-size:11px;color:#2A4A70;margin-top:2px;text-transform:uppercase;letter-spacing:1px">${esc(c.source)}</div>`:''}
        </div>
        ${badge(c.status)}
      </div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${c.phone?`<a href="tel:${esc(c.phone)}" class="contact-link phone">📞 ${esc(c.phone)}</a>`:''}
        ${c.email?`<a href="mailto:${esc(c.email)}" class="contact-link email">✉️ ${esc(c.email)}</a>`:''}
        ${c.address?`<div style="color:#888;font-size:13px">📍 ${esc(c.address)}</div>`:''}
        ${c.interest?`<div style="color:#7EB3E8;font-size:13px">Interested in: ${esc(c.interest)}</div>`:''}
        ${c.salesrep?`<div style="color:#C8D8E8;font-size:13px">👤 Sales Rep: ${esc(c.salesrep)}</div>`:''}
      </div>
      <div style="margin-top:14px">
        <label style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">Update Status</label>
        <select class="inp" data-cust-status="${esc(c.id)}">${statusOpts}</select>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div style="font-size:11px;color:#1E3A5F">Added ${fmt(c.createdAt)}</div>
        <button class="btn-ghost btn-danger" style="font-size:12px" data-del-cust="${esc(c.id)}">Delete Customer</button>
      </div>
    </div>

    <div class="pipeline-wrap">
      <div class="sec-lbl">Pipeline Stage</div>
      <div class="pipeline-stages">${pipelineStages}</div>
    </div>

    ${calCard}

    <div class="sec-header">
      <div class="sec-lbl" style="margin:0">Orders${c.orders&&c.orders.length?` (${c.orders.length})`:''}</div>
      <button class="sec-add-btn" data-action="order">+ Order</button>
    </div>
    ${orders}

    <div class="sec-header" style="margin-top:24px">
      <div class="sec-lbl" style="margin:0">Notes & Follow-Ups${c.notes&&c.notes.length?` (${c.notes.length})`:''}</div>
      <button class="sec-add-btn" data-action="note">+ Note</button>
    </div>
    ${notes}`;
}

// ── Event Binding ────────────────────────────────────────────────────────────
function bindContentEvents() {
  const content = document.getElementById('content');

  // Customer row → detail
  content.querySelectorAll('[data-detail]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('select')) return; // don't trigger on dropdowns
      state.selId = el.dataset.detail;
      state.tab = 'detail';
      render();
    });
  });

  // goto tab
  content.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => { state.tab = el.dataset.goto; state.selId=null; render(); });
  });

  // Action buttons (open modal)
  content.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => handleAction(el.dataset.action));
  });

  // Search
  const srch = document.getElementById('cust-search');
  if (srch) srch.addEventListener('input', e => { state.search = e.target.value; render(); });

  // Filter dropdown
  const flt = document.getElementById('cust-filter');
  if (flt) flt.addEventListener('change', e => { state.filterSt = e.target.value; render(); });

  // Board filter tabs
  content.querySelectorAll('[data-board-filter]').forEach(el => {
    el.addEventListener('click', () => { state.boardFilter = el.dataset.boardFilter; render(); });
  });

  // Fup filter
  content.querySelectorAll('[data-fup-filter]').forEach(el => {
    el.addEventListener('click', () => { state.fupFilter = el.dataset.fupFilter; render(); });
  });

  // Price tab
  content.querySelectorAll('[data-price-tab]').forEach(el => {
    el.addEventListener('click', () => {
      state.priceTab = el.dataset.priceTab;
      state.sheetSearch = '';
      state.activeMfrId = null;
      state.activeSheetId = null;
      render();
    });
  });

  // Open manufacturer drill-down
  content.querySelectorAll('[data-open-mfr]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeMfrId = el.dataset.openMfr;
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    });
  });

  // Open sheet full view
  content.querySelectorAll('[data-open-sheet]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeSheetId = el.dataset.openSheet;
      state.sheetSearch = '';
      render();
    });
  });

  // Back to manufacturer list
  content.querySelectorAll('[data-back-to-list]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeMfrId = null;
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    });
  });

  // Back to specific manufacturer
  content.querySelectorAll('[data-back-to-mfr]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeMfrId = el.dataset.backToMfr;
      state.activeSheetId = null;
      state.sheetSearch = '';
      render();
    });
  });

  // Labor section
  content.querySelectorAll('[data-labor-sec]').forEach(el => {
    el.addEventListener('click', () => { state.laborSec = el.dataset.laborSec; state.sheetSearch = ''; render(); });
  });

  // Sheet search
  const sheetSrch = document.getElementById('sheet-search');
  if (sheetSrch) {
    sheetSrch.addEventListener('input', e => { state.sheetSearch = e.target.value; render(); });
    sheetSrch.focus();
    sheetSrch.setSelectionRange(sheetSrch.value.length, sheetSrch.value.length);
  }

  // Directory search
  const dirSrch = document.getElementById('dir-search');
  if (dirSrch) {
    dirSrch.addEventListener('input', e => { state.dirSearch = e.target.value; render(); });
    dirSrch.focus();
    dirSrch.setSelectionRange(dirSrch.value.length, dirSrch.value.length);
  }

  // Order status (board view)
  content.querySelectorAll('[data-order-status]').forEach(el => {
    el.addEventListener('change', e => {
      const oid = el.dataset.orderStatus;
      state.customers = state.customers.map(c => ({
        ...c, orders: (c.orders||[]).map(o => o.id===oid ? {...o, status:e.target.value} : o)
      }));
      save();
      toast('Status updated!');
      if (state.tab==='orders') render(); // re-render board only, not detail
    });
  });

  // Customer status (detail)
  content.querySelectorAll('[data-cust-status]').forEach(el => {
    el.addEventListener('change', e => {
      const cid = el.dataset.custStatus;
      state.customers = state.customers.map(c => c.id===cid ? {...c,status:e.target.value} : c);
      save(); updateAlertBtn();
    });
  });

  // Set status from pipeline bar
  content.querySelectorAll('[data-set-status]').forEach(el => {
    el.addEventListener('click', () => {
      const cid = el.dataset.setStatus, val = el.dataset.statusVal;
      state.customers = state.customers.map(c => c.id===cid ? {...c,status:val} : c);
      save(); render();
    });
  });

  // Delete customer
  content.querySelectorAll('[data-del-cust]').forEach(el => {
    el.addEventListener('click', () => {
      if (!confirm('Delete this customer? This cannot be undone.')) return;
      state.customers = state.customers.filter(c=>c.id!==el.dataset.delCust);
      state.tab='customers'; state.selId=null;
      save(); render(); toast('Customer removed.');
    });
  });

  // Delete order
  content.querySelectorAll('[data-del-order]').forEach(el => {
    el.addEventListener('click', () => {
      state.customers = state.customers.map(c => c.id===state.selId
        ? {...c, orders:(c.orders||[]).filter(o=>o.id!==el.dataset.delOrder)} : c);
      save(); render(); toast('Order removed.');
    });
  });

  // Delete note
  content.querySelectorAll('[data-del-note]').forEach(el => {
    el.addEventListener('click', () => {
      state.customers = state.customers.map(c => c.id===state.selId
        ? {...c, notes:(c.notes||[]).filter(n=>n.id!==el.dataset.delNote)} : c);
      save(); render();
    });
  });

  // Edit manufacturer
  content.querySelectorAll('[data-edit-mfr]').forEach(el => {
    el.addEventListener('click', () => {
      state.editMfr = {...state.mfrs.find(m=>m.id===el.dataset.editMfr)};
      render();
    });
  });

  // Save manufacturer edit
  const emSave = document.getElementById('em-save');
  if (emSave) emSave.addEventListener('click', () => {
    state.editMfr.name   = document.getElementById('em-name').value;
    state.editMfr.rep    = document.getElementById('em-rep').value;
    state.editMfr.phone  = document.getElementById('em-phone').value;
    state.editMfr.email  = document.getElementById('em-email').value;
    state.editMfr.portal = document.getElementById('em-portal').value;
    state.editMfr.notes  = document.getElementById('em-notes').value;
    state.mfrs = state.mfrs.map(m=>m.id===state.editMfr.id?state.editMfr:m);
    state.editMfr=null; save(); render(); toast('Manufacturer saved!');
  });
  const emCancel = document.getElementById('em-cancel');
  if (emCancel) emCancel.addEventListener('click', () => { state.editMfr=null; render(); });
  const emDelete = document.getElementById('em-delete');
  if (emDelete) emDelete.addEventListener('click', () => {
    if (!confirm('Delete this manufacturer?')) return;
    state.mfrs = state.mfrs.filter(m=>m.id!==state.editMfr.id);
    state.editMfr=null; save(); render(); toast('Manufacturer removed.');
  });

  // Add manufacturer
  content.querySelectorAll('[data-add-mfr]').forEach(el => {
    el.addEventListener('click', () => {
      const m = {id:gid(),name:'New Manufacturer',rep:'',phone:'',email:'',portal:'',notes:''};
      state.mfrs.push(m);
      state.editMfr = {...m};
      save(); render();
    });
  });

  // Edit sheet
  content.querySelectorAll('[data-edit-sheet]').forEach(el => {
    el.addEventListener('click', () => {
      state.editSheet = JSON.parse(JSON.stringify(state.sheets.find(s=>s.id===el.dataset.editSheet)));
      openSheetModal();
    });
  });

  // Add sheet
  content.querySelectorAll('[data-add-sheet]').forEach(el => {
    el.addEventListener('click', () => {
      state.editSheet = {id:gid(),mfrId:el.dataset.addSheet,name:'New Price Sheet',effectiveDate:'',items:[{service:'',price:''}],_new:true};
      openSheetModal();
    });
  });

  // Alert banners & goto
  content.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => { state.tab=el.dataset.goto; state.selId=null; render(); });
  });

  // Revenue goal input
  const goalInput = document.getElementById('goal-input');
  if (goalInput) {
    goalInput.addEventListener('change', e => {
      state.revenueGoal = parseFloat(e.target.value) || 0;
      save(); render();
    });
  }
}

// ── Sheet Modal ──────────────────────────────────────────────────────────────
function openSheetModal() {
  renderSheetModal();
  document.getElementById('modal-sheet').classList.add('show');
}

function renderSheetModal() {
  const s = state.editSheet;
  if (!s) return;
  const items = s.items.map((it,i) => `
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:8px;align-items:center">
      <input class="inp" placeholder="Service / product description" value="${esc(it.service)}" data-item-service="${i}"/>
      <input class="inp" style="width:100px" placeholder="Price" value="${esc(it.price)}" data-item-price="${i}"/>
      <button style="background:none;border:none;color:#F87171;cursor:pointer;font-size:20px;line-height:1" data-del-item="${i}">✕</button>
    </div>`).join('');

  document.getElementById('sheet-modal-body').innerHTML = `
    <div class="modal-header"><div class="modal-title">Edit Price Sheet</div><button class="modal-close" data-close="modal-sheet">✕</button></div>
    <div class="field"><label>Sheet Name</label><input class="inp" id="sh-name" value="${esc(s.name)}"/></div>
    <div class="field"><label>Effective Date</label><input class="inp date-inp" id="sh-date" type="date" value="${esc(s.effectiveDate)}"/></div>
    <div class="sec-lbl">Line Items</div>
    <div id="sh-items">${items}</div>
    <button class="btn-ghost" style="width:100%;padding:10px;margin-bottom:14px" id="sh-add-item">+ Add Line Item</button>
    <button class="btn-gold" id="sh-save">Save Sheet</button>
    <button class="btn-ghost btn-danger" style="width:100%;margin-top:10px" id="sh-delete">Delete Sheet</button>`;

  // Bind sheet modal events
  document.getElementById('sh-add-item').addEventListener('click', () => {
    syncSheetFromDOM();
    state.editSheet.items.push({service:'',price:''});
    renderSheetModal();
  });

  document.querySelectorAll('[data-del-item]').forEach(el => {
    el.addEventListener('click', () => {
      syncSheetFromDOM();
      const i = parseInt(el.dataset.delItem);
      state.editSheet.items.splice(i,1);
      renderSheetModal();
    });
  });

  document.getElementById('sh-save').addEventListener('click', () => {
    syncSheetFromDOM();
    state.editSheet.name = document.getElementById('sh-name').value;
    state.editSheet.effectiveDate = document.getElementById('sh-date').value;
    if (state.editSheet._new) {
      const {_new,...sheet} = state.editSheet;
      state.sheets.push(sheet);
    } else {
      state.sheets = state.sheets.map(s=>s.id===state.editSheet.id?state.editSheet:s);
    }
    state.editSheet=null;
    closeModal('modal-sheet');
    save(); render(); toast('Price sheet saved!');
  });

  document.getElementById('sh-delete').addEventListener('click', () => {
    if (!confirm('Delete this price sheet?')) return;
    state.sheets = state.sheets.filter(s=>s.id!==state.editSheet.id);
    state.editSheet=null;
    closeModal('modal-sheet');
    save(); render(); toast('Sheet removed.');
  });


}

function syncSheetFromDOM() {
  document.querySelectorAll('[data-item-service]').forEach(el => {
    state.editSheet.items[parseInt(el.dataset.itemService)].service = el.value;
  });
  document.querySelectorAll('[data-item-price]').forEach(el => {
    state.editSheet.items[parseInt(el.dataset.itemPrice)].price = el.value;
  });
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('show');
    // Clear form fields when closing
    el.querySelectorAll('input:not([type=file]), textarea').forEach(f => f.value = '');
    el.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  }
}

function populateSelects() {
  ['wi-status','ac-status','ord-status'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    PIPELINE.forEach(p => { const o = document.createElement('option'); o.textContent = p; el.appendChild(o); });
  });
  populateOrdMfr();
}

// ── Actions ──────────────────────────────────────────────────────────────────
function handleAction(action) {
  if (action==='walkin')  { clearForm('wi'); openModal('modal-walkin'); return; }
  if (action==='addcust') { clearForm('ac'); openModal('modal-addcust'); return; }
  if (action==='order')   { clearForm('ord'); populateOrdMfr(); openModal('modal-order'); return; }
  if (action==='note')    { clearForm('note'); openModal('modal-note'); return; }
  if (action==='outlook') { openModal('modal-outlook'); return; }
}

function populateOrdMfr() {
  const el = document.getElementById('ord-mfr');
  if (!el) return;
  el.innerHTML = '';
  state.mfrs.forEach(m => { const o=document.createElement('option'); o.textContent=m.name; el.appendChild(o); });
}

function clearForm(prefix) {
  document.querySelectorAll(`[id^="${prefix}-"]`).forEach(el => {
    if (el.tagName==='INPUT'||el.tagName==='TEXTAREA') el.value='';
    else if (el.tagName==='SELECT') el.selectedIndex=0;
  });
}

// ── Calendar Button Generator ────────────────────────────────────────────────
window.generateCalButtons = function(custId, titleBase) {
  var dateEl  = document.getElementById('cal-date-'  + custId);
  var startEl = document.getElementById('cal-start-' + custId);
  var endEl   = document.getElementById('cal-end-'   + custId);
  var locEl   = document.getElementById('cal-loc-'   + custId);
  var notesEl = document.getElementById('cal-notes-' + custId);
  var btnDiv  = document.getElementById('cal-buttons-' + custId);

  if (!dateEl || !dateEl.value) {
    alert('Please pick a date first.');
    return;
  }

  var date    = dateEl.value;
  var tStart  = startEl ? startEl.value || '08:00' : '08:00';
  var tEnd    = endEl   ? endEl.value   || '10:00' : '10:00';
  var loc     = locEl   ? locEl.value   : '';
  var notes   = notesEl ? notesEl.value : '';
  var title   = titleBase;

  var outLink = buildOutlookLink(title, date, tStart, tEnd, loc, notes);
  var gcLink  = buildGoogleCalLink(title, date, tStart, tEnd, loc, notes);

  btnDiv.innerHTML = `
    <div style="font-size:12px;color:#4ADE80;margin-bottom:10px;text-align:center">✅ Event ready — tap a button below to add it</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <a href="${outLink}" target="_blank" style="display:flex;align-items:center;gap:12px;background:#0F2540;border:2px solid #2563BE;border-radius:12px;padding:16px;text-decoration:none">
        <span style="font-size:28px">📅</span>
        <div>
          <div style="font-size:16px;font-weight:bold;color:#7EB3E8">Add to Outlook Calendar</div>
          <div style="font-size:12px;color:#4A6080;margin-top:2px">Opens Outlook — tap Save to confirm</div>
        </div>
        <span style="margin-left:auto;color:#7EB3E8;font-size:20px">›</span>
      </a>
      <a href="${gcLink}" target="_blank" style="display:flex;align-items:center;gap:12px;background:#0F2035;border:2px solid #1A3555;border-radius:12px;padding:16px;text-decoration:none">
        <span style="font-size:28px">📆</span>
        <div>
          <div style="font-size:16px;font-weight:bold;color:#9DB8D4">Add to Google Calendar</div>
          <div style="font-size:12px;color:#4A6080;margin-top:2px">Opens Google Calendar — tap Save</div>
        </div>
        <span style="margin-left:auto;color:#9DB8D4;font-size:20px">›</span>
      </a>
      <button onclick="document.getElementById('cal-buttons-${custId}').innerHTML='<button onclick=\'generateCalButtons(\''+custId+'\',\''+titleBase+'\')\' style=\'width:100%;background:#2563BE;color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:bold;font-family:Georgia,serif;cursor:pointer\'>📅 Generate Calendar Event</button>'" style="background:transparent;border:1px solid #1A3555;color:#4A6080;border-radius:8px;padding:8px;font-size:12px;cursor:pointer;font-family:Georgia,serif">
        ← Change Date / Time
      </button>
    </div>`;
};

// ── Save Handlers + All Event Wiring ────────────────────────────────────────
// Everything is inside init() so it runs once, after DOM is ready, no duplicates.

function init() {
  load();
  state.tab = 'dashboard';
  state.selId = null;
  render();
  // Load shared team customers from SharePoint in background
  loadFromSharePoint();

  // ── Save: Walk-In ──
  document.getElementById('wi-save').onclick = function() {
    var name = document.getElementById('wi-name').value.trim();
    if (!name) { alert('Please enter a name.'); return; }
    var followUpDate = document.getElementById('wi-followup').value;
    var notes = followUpDate ? [{id:gid(),text:'Follow up from walk-in',followUpDate:followUpDate,createdAt:new Date().toISOString()}] : [];
    var c = {
      id: gid(), name: name,
      phone:    document.getElementById('wi-phone').value,
      email:    document.getElementById('wi-email').value,
      address:  document.getElementById('wi-address').value,
      interest: document.getElementById('wi-interest').value,
      source:   document.getElementById('wi-source').value,
      status:   document.getElementById('wi-status').value,
      salesman: document.getElementById('wi-salesman').value,
      salesrep: document.getElementById('wi-salesrep').value,
      orders: [], notes: notes, createdAt: new Date().toISOString(),
    };
    state.customers.unshift(c);
    save(); closeModal('modal-walkin'); render(); toast(name + ' logged!');
  };

  // ── Save: Add Customer ──
  document.getElementById('ac-save').onclick = function() {
    var name = document.getElementById('ac-name').value.trim();
    if (!name) { alert('Please enter a name.'); return; }
    var c = {
      id: gid(), name: name,
      phone:   document.getElementById('ac-phone').value,
      email:   document.getElementById('ac-email').value,
      address: document.getElementById('ac-address').value,
      source:  document.getElementById('ac-source').value,
      status:  document.getElementById('ac-status').value,
      salesrep: document.getElementById('ac-salesrep').value,
      orders: [], notes: [], createdAt: new Date().toISOString(),
    };
    state.customers.unshift(c);
    save(); closeModal('modal-addcust'); render(); toast(name + ' added!');
  };

  // ── Save: Order ──
  document.getElementById('ord-save').onclick = function() {
    if (!state.selId) return;
    var o = {
      id: gid(),
      flooringType: document.getElementById('ord-type').value,
      manufacturer: document.getElementById('ord-mfr').value,
      color:        document.getElementById('ord-color').value,
      sqft:         document.getElementById('ord-sqft').value,
      price:        document.getElementById('ord-price').value,
      installDate:  document.getElementById('ord-date').value,
      orderNum:     document.getElementById('ord-num').value,
      msJobRef:     document.getElementById('ord-ms').value,
      status:       document.getElementById('ord-status').value,
      notes:        document.getElementById('ord-notes').value,
      createdAt:    new Date().toISOString(),
    };
    state.customers = state.customers.map(function(c) {
      return c.id === state.selId ? Object.assign({}, c, {orders: [o].concat(c.orders || [])}) : c;
    });
    save(); closeModal('modal-order'); render(); toast('Order added!');
  };

  // ── Save: Note ──
  document.getElementById('note-save').onclick = function() {
    if (!state.selId) return;
    var text = document.getElementById('note-text').value.trim();
    if (!text) return;
    var n = { id:gid(), text:text, followUpDate:document.getElementById('note-date').value, createdAt:new Date().toISOString() };
    state.customers = state.customers.map(function(c) {
      return c.id === state.selId ? Object.assign({}, c, {notes: [n].concat(c.notes || [])}) : c;
    });
    save(); closeModal('modal-note'); render(); toast('Note saved!');
  };

  // ── Close buttons: X and Cancel ──
  // Using onclick so there is only ever ONE handler per button, never stacks
  document.getElementById('close-walkin').onclick    = function() { closeModal('modal-walkin'); };
  document.getElementById('cancel-walkin').onclick   = function() { closeModal('modal-walkin'); };
  document.getElementById('close-addcust').onclick   = function() { closeModal('modal-addcust'); };
  document.getElementById('cancel-addcust').onclick  = function() { closeModal('modal-addcust'); };
  document.getElementById('close-order').onclick     = function() { closeModal('modal-order'); };
  document.getElementById('cancel-order').onclick    = function() { closeModal('modal-order'); };
  document.getElementById('close-note').onclick      = function() { closeModal('modal-note'); };
  document.getElementById('cancel-note').onclick     = function() { closeModal('modal-note'); };
  document.getElementById('close-outlook').onclick   = function() { closeModal('modal-outlook'); };
  document.getElementById('close-outlook-ok').onclick = function() { closeModal('modal-outlook'); };

  // ── Home button ──
  document.getElementById('home-btn').onclick = function() {
    state.tab = 'dashboard';
    state.selId = null;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    render();
  };

  // ── FAB: Add Customer ──
  document.getElementById('fab').onclick = function() {
    clearForm('ac');
    populateSelects();
    openModal('modal-addcust');
  };

  // ── Alert button ──
  document.getElementById('alert-btn').onclick = function() {
    state.tab = 'followups';
    render();
  };

  // ── Menu button ──
  document.getElementById('menu-btn').onclick = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  };

  // ── Sidebar overlay (close sidebar when tapping outside) ──
  document.getElementById('sidebar-overlay').onclick = function() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  };

  // ── Sidebar nav buttons ──
  document.querySelectorAll('.nav-btn[data-tab]').forEach(function(btn) {
    btn.onclick = function() {
      state.tab = btn.dataset.tab;
      state.selId = null;
      state.dirSearch = '';
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
      render();
    };
  });
  document.querySelectorAll('.nav-btn[data-action]').forEach(function(btn) {
    btn.onclick = function() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
      handleAction(btn.dataset.action);
    };
  });
  var outlookBtn = document.querySelector('.outlook-btn');
  if (outlookBtn) {
    outlookBtn.onclick = function() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
      openModal('modal-outlook');
    };
  }

  // ── Click overlay background to close any modal ──
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.onclick = function(e) {
      if (e.target === this) closeModal(this.id);
    };
  });

  // ── Export / Import ──
  document.getElementById('export-btn').onclick = exportData;
  document.getElementById('import-btn').onclick = function() {
    document.getElementById('import-file').click();
  };
  document.getElementById('import-file').onchange = function(e) {
    importData(e.target.files[0]);
    e.target.value = '';
  };
}

// Run init once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
