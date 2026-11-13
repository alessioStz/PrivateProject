#!/usr/bin/env node
/**
 * Validiert die Inhaltsdateien und erzeugt assets/js/data.js für die App.
 *
 *   node scripts/build-data.mjs                      → data/src/*.json prüfen und assets/js/data.js schreiben
 *   node scripts/build-data.mjs --check <datei.json> [--known <master.json>] [--batch b01]
 *                                                    → nur eine Datei prüfen (für die Recherche)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ERA_IDS = ['anfaenge', 'patriarchen', 'aegypten', 'richter', 'koenigreich', 'geteilt', 'exil', 'rueckkehr', 'jesus', 'versammlung'];
export const TAGS = ['gott', 'engel', 'patriarch', 'richter', 'koenig', 'prophet', 'priester', 'apostel', 'juenger', 'herrscher', 'schreiber', 'vorfahr-jesu'];
const DATE_LABELS = ['Lebenszeit', 'Geboren', 'Gestorben', 'Alter', 'Regierung', 'Wirken', 'Zeit'];

// [Nummer, Name auf jw.org, URL-Slug auf jw.org, Abkürzungen/Varianten]
export const BOOKS = [
  [1, '1. Mose', '1-mose', ['1Mo', '1Mose', 'Genesis']],
  [2, '2. Mose', '2-mose', ['2Mo', '2Mose', 'Exodus']],
  [3, '3. Mose', '3-mose', ['3Mo', '3Mose', 'Levitikus']],
  [4, '4. Mose', '4-mose', ['4Mo', '4Mose', 'Numeri']],
  [5, '5. Mose', '5-mose', ['5Mo', '5Mose', 'Deuteronomium']],
  [6, 'Josua', 'josua', ['Jos']],
  [7, 'Richter', 'richter', ['Ri']],
  [8, 'Ruth', 'ruth', ['Ru']],
  [9, '1. Samuel', '1-samuel', ['1Sa', '1Sam']],
  [10, '2. Samuel', '2-samuel', ['2Sa', '2Sam']],
  [11, '1. Könige', '1-K%C3%B6nige', ['1Kö', '1Koe', '1Kön']],
  [12, '2. Könige', '2-K%C3%B6nige', ['2Kö', '2Koe', '2Kön']],
  [13, '1. Chronika', '1-chronika', ['1Ch', '1Chr', '1Chronik']],
  [14, '2. Chronika', '2-chronika', ['2Ch', '2Chr', '2Chronik']],
  [15, 'Esra', 'esra', ['Esr']],
  [16, 'Nehemia', 'nehemia', ['Ne', 'Neh']],
  [17, 'Esther', 'esther', ['Est']],
  [18, 'Hiob', 'hiob', ['Hi']],
  [19, 'Psalm', 'psalmen', ['Ps', 'Psalmen']],
  [20, 'Sprüche', 'Spr%C3%BCche', ['Spr']],
  [21, 'Prediger', 'prediger', ['Pred']],
  [22, 'Hohes Lied', 'hohes-lied', ['Hoh', 'Hoheslied', 'Hohelied']],
  [23, 'Jesaja', 'jesaja', ['Jes']],
  [24, 'Jeremia', 'jeremia', ['Jer']],
  [25, 'Klagelieder', 'klagelieder', ['Klg']],
  [26, 'Hesekiel', 'hesekiel', ['Hes']],
  [27, 'Daniel', 'daniel', ['Da', 'Dan']],
  [28, 'Hosea', 'hosea', ['Hos']],
  [29, 'Joel', 'joel', []],
  [30, 'Amos', 'amos', ['Am']],
  [31, 'Obadja', 'obadja', ['Ob']],
  [32, 'Jona', 'jona', ['Jon']],
  [33, 'Micha', 'micha', ['Mi']],
  [34, 'Nahum', 'nahum', ['Nah']],
  [35, 'Habakuk', 'habakuk', ['Hab']],
  [36, 'Zephanja', 'zephanja', ['Ze', 'Zeph']],
  [37, 'Haggai', 'haggai', ['Hag']],
  [38, 'Sacharja', 'sacharja', ['Sach']],
  [39, 'Maleachi', 'maleachi', ['Mal']],
  [40, 'Matthäus', 'Matth%C3%A4us', ['Mat', 'Mt']],
  [41, 'Markus', 'markus', ['Mar', 'Mk']],
  [42, 'Lukas', 'lukas', ['Luk', 'Lk']],
  [43, 'Johannes', 'johannes', ['Joh']],
  [44, 'Apostelgeschichte', 'apostelgeschichte', ['Apg']],
  [45, 'Römer', 'R%C3%B6mer', ['Röm', 'Roem']],
  [46, '1. Korinther', '1-korinther', ['1Ko', '1Kor']],
  [47, '2. Korinther', '2-korinther', ['2Ko', '2Kor']],
  [48, 'Galater', 'galater', ['Gal']],
  [49, 'Epheser', 'epheser', ['Eph']],
  [50, 'Philipper', 'philipper', ['Phil']],
  [51, 'Kolosser', 'kolosser', ['Kol']],
  [52, '1. Thessalonicher', '1-thessalonicher', ['1Th', '1Thess']],
  [53, '2. Thessalonicher', '2-thessalonicher', ['2Th', '2Thess']],
  [54, '1. Timotheus', '1-timotheus', ['1Ti', '1Tim']],
  [55, '2. Timotheus', '2-timotheus', ['2Ti', '2Tim']],
  [56, 'Titus', 'titus', ['Tit']],
  [57, 'Philemon', 'philemon', ['Phm', 'Phlm']],
  [58, 'Hebräer', 'Hebr%C3%A4er', ['Heb', 'Hebr']],
  [59, 'Jakobus', 'jakobus', ['Jak']],
  [60, '1. Petrus', '1-petrus', ['1Pe', '1Petr']],
  [61, '2. Petrus', '2-petrus', ['2Pe', '2Petr']],
  [62, '1. Johannes', '1-johannes', ['1Jo', '1Joh']],
  [63, '2. Johannes', '2-johannes', ['2Jo', '2Joh']],
  [64, '3. Johannes', '3-johannes', ['3Jo', '3Joh']],
  [65, 'Judas', 'judas', ['Jud']],
  [66, 'Offenbarung', 'offenbarung', ['Off', 'Offb']],
];
const SINGLE_CHAPTER = new Set([31, 57, 63, 64, 65]);
const norm = (s) => s.toLowerCase().replace(/[\s.]/g, '');
const BOOK_LOOKUP = new Map();
for (const [n, name, slug, abbr] of BOOKS) for (const k of [name, ...abbr]) BOOK_LOOKUP.set(norm(k), { n, name, slug });

const pad3 = (x) => String(x).padStart(3, '0');

/** "1. Mose 12:1-3" → { t: Anzeige, u: Link zur Studienbibel auf jw.org } oder null */
export function parseRef(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/\s+/g, ' ');
  const m = s.match(/^((?:[1-5]\.?\s?)?[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.\s]*?)\s?(\d[\d:,\-–\s]*)$/);
  if (!m) return null;
  const book = BOOK_LOOKUP.get(norm(m[1]));
  if (!book) return null;
  const rest = m[2].replace(/\s/g, '').replace(/–/g, '-');
  let c, v, c2, v2;
  let r;
  if ((r = rest.match(/^(\d+)$/))) {
    if (SINGLE_CHAPTER.has(book.n)) { c = 1; v = +r[1]; } else c = +r[1];
  } else if ((r = rest.match(/^(\d+)-(\d+)$/))) {
    if (SINGLE_CHAPTER.has(book.n)) { c = 1; v = +r[1]; v2 = +r[2]; } else { c = +r[1]; c2 = +r[2]; }
  } else if ((r = rest.match(/^(\d+):(\d+)$/))) { c = +r[1]; v = +r[2]; }
  else if ((r = rest.match(/^(\d+):(\d+)-(\d+)$/))) { c = +r[1]; v = +r[2]; v2 = +r[3]; }
  else if ((r = rest.match(/^(\d+):(\d+)-(\d+):(\d+)$/))) { c = +r[1]; v = +r[2]; c2 = +r[3]; v2 = +r[4]; }
  else if ((r = rest.match(/^(\d+):(\d+)((?:,\d+)+)$/))) { c = +r[1]; v = +r[2]; }
  else return null;
  if (!c || c > 150 || (v !== undefined && (v < 1 || v > 176))) return null;
  let u = `https://www.jw.org/de/bibliothek/bibel/studienbibel/buecher/${book.slug}/${c}/`;
  if (v) {
    u += `#v${book.n}${pad3(c)}${pad3(v)}`;
    if (v2) u += `-v${book.n}${pad3(c2 || c)}${pad3(v2)}`;
  }
  const label = `${book.name} ${m[2].trim().replace(/\s*-\s*/g, '-').replace(/\s*–\s*/g, '–')}`;
  return { t: label, u };
}

const ID_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_RX = /^https:\/\/(?:wol|www)\.jw\.org\/de\//;
const BAD_WORDS = [
  [/\bv\.\s?Chr\b|\bn\.\s?Chr\b/, '„v. Chr./n. Chr.“ → „v. u. Z./u. Z.“ verwenden'],
  [/\bKreuz/i, '„Kreuz“ → „Marterpfahl“/„Pfahl“ (Sprachgebrauch auf jw.org)'],
  [/Altes Testament|Neues Testament|\bAT\b|\bNT\b/, '„Hebräische Schriften“ / „Christliche Griechische Schriften“ verwenden'],
  [/\bHERR\b|\bJahwe\b|\bJahve\b/, 'Gottesname: „Jehova“'],
];

function isStr(x) { return typeof x === 'string'; }

/** Prüft eine Batch-Datei. Liefert { errors, warnings }. knownIds: Set gültiger IDs für Querverweise. */
export function validateBatch(data, knownIds, label = 'Datei', { lenient = false } = {}) {
  const errors = [], warnings = [];
  const E = (id, msg) => errors.push(`${id}: ${msg}`);
  const W = (id, msg) => warnings.push(`${id}: ${msg}`);
  if (!data || typeof data !== 'object') return { errors: [`${label}: kein JSON-Objekt`], warnings };
  const persons = Array.isArray(data.persons) ? data.persons : (E(label, '„persons“ fehlt (Array)'), []);
  const events = Array.isArray(data.events) ? data.events : (E(label, '„events“ fehlt (Array)'), []);
  const seen = new Set();
  const own = new Set([...persons, ...events].map((x) => x && x.id).filter(Boolean));
  const all = new Set([...knownIds, ...own]);

  const checkText = (id, field, text) => {
    for (const [rx, hint] of BAD_WORDS) if (rx.test(text)) W(id, `${field}: ${hint}`);
  };
  const checkRefs = (id, field, refs) => {
    if (!Array.isArray(refs)) return E(id, `${field} muss ein Array sein`);
    for (const r of refs) if (!parseRef(r)) E(id, `${field}: Bibelstelle nicht lesbar: „${r}“ (Format z. B. „1. Mose 12:1-3“)`);
  };
  const checkFacts = (id, facts) => {
    if (!Array.isArray(facts)) return E(id, 'facts muss ein Array sein');
    for (const f of facts) {
      if (!f || !isStr(f.text) || !f.text.trim()) { E(id, 'facts: jedes Element braucht „text“'); continue; }
      if (f.text.length > 260) W(id, `facts: sehr langer Punkt (${f.text.length} Zeichen)`);
      checkText(id, 'facts', f.text);
      if (f.ref && !parseRef(f.ref)) E(id, `facts.ref nicht lesbar: „${f.ref}“`);
    }
  };
  const checkSources = (id, sources) => {
    if (!Array.isArray(sources) || !sources.length) return E(id, 'sources: mindestens eine jw.org-Quelle nötig');
    for (const s of sources) {
      if (!s || !isStr(s.title) || !s.title.trim()) E(id, 'sources: „title“ fehlt');
      if (!s || !isStr(s.url) || !URL_RX.test(s.url)) E(id, `sources: nur https://wol.jw.org/de/… oder https://www.jw.org/de/… erlaubt („${s && s.url}“)`);
    }
  };
  const checkIds = (id, field, arr, { allowNames = false } = {}) => {
    for (const x of arr) {
      if (!isStr(x) || !x.trim()) { E(id, `${field}: leerer Eintrag`); continue; }
      if (ID_RX.test(x)) { if (!all.has(x)) (lenient ? W : E)(id, `${field}: unbekannte ID „${x}“`); }
      else if (!allowNames) E(id, `${field}: „${x}“ ist keine gültige ID`);
    }
  };
  const checkSummary = (id, s) => {
    if (!isStr(s) || s.trim().length < 80) E(id, 'summary fehlt oder ist zu kurz (2–4 Sätze)');
    else { if (s.length > 900) W(id, `summary ist lang (${s.length} Zeichen)`); checkText(id, 'summary', s); }
  };

  for (const p of persons) {
    const id = p && p.id ? p.id : '(Person ohne id)';
    if (!p || !isStr(p.id) || !ID_RX.test(p.id)) { E(id, 'id fehlt/ungültig (kebab-case, a–z, 0–9)'); continue; }
    if (seen.has(p.id)) E(id, 'doppelte id'); seen.add(p.id);
    if (!isStr(p.name) || !p.name.trim()) E(id, 'name fehlt');
    if (p.altNames !== undefined && !Array.isArray(p.altNames)) E(id, 'altNames muss Array sein');
    if (!['m', 'f', ''].includes(p.sex)) E(id, 'sex: "m", "f" oder ""');
    if (!Array.isArray(p.tags)) E(id, 'tags muss Array sein');
    else for (const t of p.tags) if (!TAGS.includes(t)) E(id, `tags: unbekannt „${t}“ (erlaubt: ${TAGS.join(', ')})`);
    if (!isStr(p.role) || !p.role.trim()) E(id, 'role fehlt'); else if (p.role.length > 60) W(id, 'role ist lang (max. ~50 Zeichen)');
    if (!Array.isArray(p.eras)) E(id, 'eras muss Array sein');
    else { for (const e of p.eras) if (!ERA_IDS.includes(e)) E(id, `eras: unbekannt „${e}“`); if (!p.eras.length && p.id !== 'jehova') E(id, 'eras: mindestens eine Epoche'); }
    if (!Array.isArray(p.dates)) E(id, 'dates muss Array sein ([{label, value}])');
    else for (const d of p.dates) {
      if (!d || !isStr(d.label) || !isStr(d.value) || !d.value.trim()) E(id, 'dates: {label, value} erwartet');
      else { if (!DATE_LABELS.includes(d.label)) W(id, `dates.label „${d.label}“ ungewöhnlich (${DATE_LABELS.join(', ')})`); checkText(id, 'dates', d.value); }
    }
    if (!(p.year === null || Number.isInteger(p.year))) E(id, 'year: ganze Zahl (negativ = v. u. Z.) oder null');
    if (!isStr(p.nameMeaning)) E(id, 'nameMeaning: String (leer, wenn unbekannt)');
    checkSummary(id, p.summary);
    checkFacts(id, p.facts || (E(id, 'facts fehlt'), []));
    if (p.lesson !== undefined && !isStr(p.lesson)) E(id, 'lesson muss String sein');
    const f = p.family;
    if (!f || typeof f !== 'object') E(id, 'family fehlt ({father, mother, spouses, children, siblings})');
    else {
      for (const k of ['father', 'mother']) { if (!isStr(f[k])) E(id, `family.${k}: String (ID, Name oder "")`); else if (f[k]) checkIds(id, `family.${k}`, [f[k]], { allowNames: true }); }
      for (const k of ['spouses', 'children', 'siblings']) { if (!Array.isArray(f[k])) E(id, `family.${k}: Array`); else checkIds(id, `family.${k}`, f[k], { allowNames: true }); }
    }
    for (const k of ['related', 'events']) { if (!Array.isArray(p[k])) E(id, `${k} muss Array sein`); else checkIds(id, k, p[k]); }
    if (p.books !== undefined && !Array.isArray(p.books)) E(id, 'books muss Array sein');
    checkRefs(id, 'refs', p.refs);
    checkSources(id, p.sources);
  }
  for (const ev of events) {
    const id = ev && ev.id ? ev.id : '(Ereignis ohne id)';
    if (!ev || !isStr(ev.id) || !ID_RX.test(ev.id)) { E(id, 'id fehlt/ungültig'); continue; }
    if (seen.has(ev.id)) E(id, 'doppelte id'); seen.add(ev.id);
    if (!isStr(ev.title) || !ev.title.trim()) E(id, 'title fehlt');
    if (!ERA_IDS.includes(ev.era)) E(id, `era ungültig „${ev.era}“`);
    if (!Number.isInteger(ev.year)) E(id, 'year: ganze Zahl für die Sortierung (negativ = v. u. Z.)');
    if (!isStr(ev.dateLabel) || !ev.dateLabel.trim()) E(id, 'dateLabel fehlt (z. B. „1513 v. u. Z.“ oder „Zeitpunkt unbekannt“)');
    else checkText(id, 'dateLabel', ev.dateLabel);
    if (!isStr(ev.place)) E(id, 'place: String (leer, wenn unbekannt)');
    checkSummary(id, ev.summary);
    checkFacts(id, ev.facts || []);
    if (ev.significance !== undefined && !isStr(ev.significance)) E(id, 'significance muss String sein');
    if (!Array.isArray(ev.persons)) E(id, 'persons muss Array sein'); else checkIds(id, 'persons', ev.persons);
    checkRefs(id, 'refs', ev.refs);
    checkSources(id, ev.sources);
  }
  return { errors, warnings };
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  return JSON.parse(raw);
}

function report(title, { errors, warnings }) {
  console.log(`\n${title}`);
  if (errors.length) { console.log(`  ✗ ${errors.length} Fehler:`); for (const e of errors) console.log('    - ' + e); }
  if (warnings.length) { console.log(`  ! ${warnings.length} Hinweise:`); for (const w of warnings) console.log('    - ' + w); }
  if (!errors.length && !warnings.length) console.log('  ✓ keine Probleme');
}

function checkMode(args) {
  const file = args[args.indexOf('--check') + 1];
  let data;
  try { data = readJson(file); } catch (e) { console.log(`✗ JSON nicht lesbar: ${e.message}`); process.exit(1); }
  const known = new Set();
  let master = null;
  if (args.includes('--known')) {
    master = readJson(args[args.indexOf('--known') + 1]);
    for (const p of master.persons) known.add(p[0]);
    for (const e of master.events) known.add(e[0]);
  }
  const res = validateBatch(data, known, file);
  report(`Prüfung: ${file}  (${(data.persons || []).length} Personen, ${(data.events || []).length} Ereignisse)`, res);
  const batch = args.includes('--batch') ? args[args.indexOf('--batch') + 1] : data.batch;
  if (master && batch) {
    const have = new Set([...(data.persons || []), ...(data.events || [])].map((x) => x.id));
    const missing = [...master.persons.filter((p) => p[2] === batch).map((p) => p[0]), ...master.events.filter((e) => e[3] === batch).map((e) => e[0])].filter((id) => !have.has(id));
    console.log(missing.length ? `\n  Noch offen in ${batch} (${missing.length}): ${missing.join(', ')}` : `\n  ✓ Alle geplanten Einträge von ${batch} vorhanden.`);
  }
  process.exit(res.errors.length ? 1 : 0);
}

function buildMode() {
  const srcDir = path.join(ROOT, 'data', 'src');
  const eras = readJson(path.join(srcDir, 'eras.json'));
  const files = fs.readdirSync(srcDir).filter((f) => /^b\d+.*\.json$/.test(f)).sort();
  const persons = [], events = [];
  for (const f of files) {
    const d = readJson(path.join(srcDir, f));
    persons.push(...(d.persons || []));
    events.push(...(d.events || []));
  }
  const ids = new Set([...persons, ...events].map((x) => x.id));
  const res = validateBatch({ persons, events }, ids, 'data/src', { lenient: true });
  // Doppelte IDs über Dateien hinweg
  const count = new Map();
  for (const x of [...persons, ...events]) count.set(x.id, (count.get(x.id) || 0) + 1);
  for (const [id, n] of count) if (n > 1) res.errors.push(`${id}: kommt ${n}× vor`);
  report(`Build: ${files.length} Dateien, ${persons.length} Personen, ${events.length} Ereignisse`, res);
  if (res.errors.length) { console.log('\nAbbruch – bitte Fehler beheben.'); process.exit(1); }

  const P = new Map(persons.map((p) => [p.id, p]));
  const EV = new Map(events.map((e) => [e.id, e]));
  // Verknüpfungen in beide Richtungen ergänzen
  for (const e of events) for (const pid of e.persons) { const p = P.get(pid); if (p && !p.events.includes(e.id)) p.events.push(e.id); }
  for (const p of persons) for (const eid of p.events) { const e = EV.get(eid); if (e && !e.persons.includes(p.id)) e.persons.push(p.id); }

  const known = (x) => P.has(x) || !ID_RX.test(x);
  const cleanFamily = (f) => ({ father: known(f.father) ? f.father : '', mother: known(f.mother) ? f.mother : '', spouses: f.spouses.filter(known), children: f.children.filter(known), siblings: f.siblings.filter(known) });
  const ref = (r) => parseRef(r);
  const facts = (arr) => (arr || []).map((f) => (f.ref ? { t: f.text, r: ref(f.ref) } : { t: f.text }));
  const outP = persons.map((p) => ({
    id: p.id, name: p.name, alt: p.altNames || [], sex: p.sex, tags: p.tags, role: p.role, eras: p.eras,
    dates: p.dates, year: p.year, meaning: p.nameMeaning, summary: p.summary, facts: facts(p.facts),
    lesson: p.lesson || '', family: cleanFamily(p.family), related: p.related.filter((x) => P.has(x) || EV.has(x)),
    events: p.events.filter((x) => EV.has(x)).sort((a, b) => EV.get(a).year - EV.get(b).year),
    books: p.books || [], refs: p.refs.map(ref), sources: p.sources,
  }));
  const outE = events.map((e) => ({
    id: e.id, title: e.title, era: e.era, year: e.year, date: e.dateLabel, place: e.place, summary: e.summary,
    facts: facts(e.facts), significance: e.significance || '', persons: e.persons.filter((x) => P.has(x)),
    refs: e.refs.map(ref), sources: e.sources,
  }));
  const eraOrder = new Map(eras.map((e, i) => [e.id, i]));
  outE.sort((a, b) => eraOrder.get(a.era) - eraOrder.get(b.era) || a.year - b.year);
  outP.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const out = { built: new Date().toISOString().slice(0, 10), eras, persons: outP, events: outE };
  const target = path.join(ROOT, 'assets', 'js', 'data.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `/* Automatisch erzeugt von scripts/build-data.mjs – nicht von Hand bearbeiten. */\nwindow.BIBEL = ${JSON.stringify(out)};\n`);
  console.log(`\n✓ ${path.relative(ROOT, target)} geschrieben (${(fs.statSync(target).size / 1024).toFixed(0)} KB)`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) checkMode(args);
  else buildMode();
}
