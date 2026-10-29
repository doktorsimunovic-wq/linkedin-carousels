// Renders a slide spec (JSON) into a LinkedIn carousel PDF or a single infographic PNG.
// Usage: node render.js <spec.json> <out-file.pdf|.png>
// Spec: { "brand": "sicknote" | "personal", "slides": [ ... ] }
// Slide types:
//   cover: kicker, title, sub
//   stat:  kicker, big, unit, title, body, card
//   text:  kicker, title, body, card
//   list:  kicker, title, items: [ "...", "..." ]
//   close: kicker, title, body, source
// Inline **bold** is supported in body, card, items and sub.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const FONT_DIR = path.join(__dirname, 'fonts');

const BRANDS = {
  sicknote: {
    footer: 'sicknote.com',
    fonts: `@font-face{font-family:"Inter";src:url("file://${FONT_DIR}/Inter.ttf") format("truetype");font-weight:100 900}`,
    css: `
      :root{--bg:#F8FAFE;--ink:#1A2B3C;--body:#44535C;--accent:#298EA6;--dark:#111B27;--darkText:#FFFFFF;--darkBody:#C9D6DE;--darkKicker:#7CC4D6;--closeBg:#298EA6;--closeText:#FFFFFF;--closeBody:#EAF6FA;--closeKicker:#D9F0F6;--bar:#298EA6;--closeBar:#111B27;--cardBg:#FFFFFF;--cardLine:#D8ECF0;--foot:#8A9AA6;--display:"Inter",sans-serif;--text:"Inter",sans-serif;--dispWeight:800;--track:-0.02em}
    `,
  },
  personal: {
    footer: 'Viktor Simunović, MD',
    fonts: `@font-face{font-family:"Fraunces";src:url("file://${FONT_DIR}/Fraunces.ttf") format("truetype");font-weight:100 900}
            @font-face{font-family:"Archivo";src:url("file://${FONT_DIR}/Archivo.ttf") format("truetype");font-weight:100 900}`,
    css: `
      :root{--bg:#0E1116;--ink:#F4F1EA;--body:#C9C4B8;--accent:#E8A33B;--stat:#E84A3B;--dark:#0E1116;--darkText:#F4F1EA;--darkBody:#C9C4B8;--darkKicker:#E8A33B;--closeBg:#E8A33B;--closeText:#0E1116;--closeBody:#2A2418;--closeKicker:#0E1116;--bar:#E8A33B;--closeBar:#0E1116;--cardBg:#171B22;--cardLine:#2A303A;--foot:#8C877C;--display:"Fraunces",serif;--text:"Archivo",sans-serif;--dispWeight:700;--track:-0.01em}
      .stat .big{color:var(--stat)}
    `,
  },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

function slideHtml(s, i, n, brand) {
  const foot = `<div class="foot"><span>${esc(brand.footer)}</span><span>${n > 1 ? `${i + 1} / ${n}` : ''}</span></div>`;
  const kicker = s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : '';
  switch (s.type) {
    case 'cover':
      return `<section class="slide cover"><div class="bar"></div>${kicker}<h1>${esc(s.title)}</h1>${s.sub ? `<p>${rich(s.sub)}</p>` : ''}${n > 1 ? '<div class="swipe">Swipe →</div>' : ''}${foot}</section>`;
    case 'stat':
      return `<section class="slide stat"><div class="bar"></div>${kicker}<div class="big">${esc(s.big)}${s.unit ? ` <small>${esc(s.unit)}</small>` : ''}</div>${s.title ? `<h2>${esc(s.title)}</h2>` : ''}${s.body ? `<p>${rich(s.body)}</p>` : ''}${s.card ? `<div class="card"><p>${rich(s.card)}</p></div>` : ''}${foot}</section>`;
    case 'list':
      return `<section class="slide"><div class="bar"></div>${kicker}<h2 class="lead">${esc(s.title)}</h2><ol>${(s.items || []).map((it) => `<li><span>${rich(it)}</span></li>`).join('')}</ol>${foot}</section>`;
    case 'close':
      return `<section class="slide close"><div class="bar"></div>${kicker}<h1>${esc(s.title)}</h1>${s.body ? `<p>${rich(s.body)}</p>` : ''}${s.source ? `<div class="src">${rich(s.source)}</div>` : ''}${foot}</section>`;
    default:
      return `<section class="slide"><div class="bar"></div>${kicker}<h2 class="lead">${esc(s.title)}</h2>${s.body ? `<p>${rich(s.body)}</p>` : ''}${s.card ? `<div class="card"><p>${rich(s.card)}</p></div>` : ''}${foot}</section>`;
  }
}

function pageHtml(spec) {
  const brand = BRANDS[spec.brand];
  if (!brand) throw new Error(`Unknown brand "${spec.brand}"`);
  const n = spec.slides.length;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${brand.fonts}
${brand.css}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#888}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden;background:var(--bg);color:var(--ink);padding:110px 96px 150px;display:flex;flex-direction:column;font-family:var(--text);page-break-after:always;break-after:page}
.bar{position:absolute;left:0;top:0;width:100%;height:14px;background:var(--bar)}
.kicker{font-family:var(--text);font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
h1{font-family:var(--display);font-size:90px;line-height:1.05;font-weight:var(--dispWeight);letter-spacing:var(--track);margin-top:56px}
h2{font-family:var(--display);font-size:62px;line-height:1.12;font-weight:var(--dispWeight);letter-spacing:var(--track);margin-top:28px}
h2.lead{margin-top:56px}
.big{font-family:var(--display);font-size:220px;line-height:.95;font-weight:var(--dispWeight);letter-spacing:-.04em;color:var(--accent);margin-top:110px}
.big small{font-size:86px;letter-spacing:-.02em}
p{font-size:40px;line-height:1.4;color:var(--body);margin-top:40px;max-width:860px}
b{color:var(--accent);font-weight:700}
.card{margin-top:56px;background:var(--cardBg);border:2px solid var(--cardLine);border-radius:22px;padding:44px 48px}
.card p{margin-top:0;font-size:38px;color:var(--ink)}
ol{margin-top:48px;padding-left:0;list-style:none;counter-reset:i;display:flex;flex-direction:column;gap:30px}
ol li{counter-increment:i;font-size:38px;line-height:1.35;color:var(--ink);display:grid;grid-template-columns:70px 1fr;gap:10px}
ol li::before{content:counter(i);font-family:var(--display);font-weight:var(--dispWeight);color:var(--accent);font-size:44px;line-height:1.1}
.cover{background:var(--dark);color:var(--darkText)}
.cover .kicker{color:var(--darkKicker)} .cover p{color:var(--darkBody)}
.close{background:var(--closeBg);color:var(--closeText)}
.close .kicker{color:var(--closeKicker)} .close p{color:var(--closeBody)} .close .bar{background:var(--closeBar)}
.swipe{margin-top:auto;font-size:30px;font-weight:700;color:var(--darkKicker)}
.src{margin-top:auto;font-size:26px;line-height:1.45;color:var(--closeBody)}
.foot{position:absolute;left:96px;right:96px;bottom:72px;display:flex;justify-content:space-between;font-size:26px;font-weight:600;color:var(--foot)}
.cover .foot,.close .foot{color:inherit;opacity:.6}
</style></head><body>${spec.slides.map((s, i) => slideHtml(s, i, n, brand)).join('\n')}</body></html>`;
}

(async () => {
  const [specPath, outPath] = process.argv.slice(2);
  if (!specPath || !outPath) { console.error('Usage: node render.js <spec.json> <out.pdf|out.png>'); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const html = pageHtml(spec);
  const tmp = path.join(path.dirname(path.resolve(outPath)), `.render-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto('file://' + tmp);
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate((b) => b === 'sicknote' ? document.fonts.check('800 40px Inter') : (document.fonts.check('700 40px Fraunces') && document.fonts.check('700 40px Archivo')), spec.brand);
  if (!fontsOk) { console.error('Brand fonts did not load'); process.exit(3); }
  // Overflow check: no slide content may run past the footer zone.
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => {
    const limit = s.getBoundingClientRect().bottom - 130;
    const worst = Math.max(...[...s.querySelectorAll('h1,h2,p,.big,.card,ol,.src,.swipe')].map((e) => e.getBoundingClientRect().bottom));
    return worst > limit ? i + 1 : null;
  }).filter(Boolean));
  if (overflow.length) { console.error(`Text overflows on slide(s): ${overflow.join(', ')}. Shorten the copy.`); process.exit(4); }
  if (outPath.endsWith('.png')) {
    await (await page.$('.slide')).screenshot({ path: outPath });
  } else {
    // Each slide gets its own PNG next to the PDF for the visual check.
    const slides = await page.$$('.slide');
    for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: outPath.replace(/\.pdf$/, `.s${i + 1}.png`) });
    await page.pdf({ path: outPath, width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  }
  await browser.close();
  fs.unlinkSync(tmp);
  console.log(`OK ${outPath} (${fs.statSync(outPath).size} bytes, ${spec.slides.length} slide(s))`);
})().catch((e) => { console.error(e); process.exit(1); });
