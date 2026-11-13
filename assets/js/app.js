/* Bibel-Übersicht – App-Logik (ohne Abhängigkeiten) */
(() => {
  'use strict';

  const D = window.BIBEL;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  if (!D || !Array.isArray(D.persons)) {
    $('#main').innerHTML = '<div class="empty"><h2>Daten fehlen</h2><p>Die Datei assets/js/data.js konnte nicht geladen werden.</p></div>';
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Daten                                                               */
  /* ------------------------------------------------------------------ */
  const ERAS = D.eras;
  const ERA = new Map(ERAS.map((e, i) => [e.id, Object.assign({ idx: i }, e)]));
  const PERSONS = D.persons;
  const P = new Map(PERSONS.map((p) => [p.id, p]));
  const EVENTS = D.events; // nach Epoche und Jahr sortiert
  const E = new Map(EVENTS.map((e) => [e.id, e]));
  const EV_POS = new Map(EVENTS.map((e, i) => [e.id, i]));

  const TAGS = {
    gott: ['Gott', 'Gott'], engel: ['Engel', 'Engel'], patriarch: ['Patriarch', 'Patriarchin'],
    richter: ['Richter', 'Richterin'], koenig: ['König', 'Königin'], prophet: ['Prophet', 'Prophetin'],
    priester: ['Priester', 'Priesterin'], apostel: ['Apostel', 'Apostel'], juenger: ['Jünger', 'Jüngerin'],
    herrscher: ['Herrscher', 'Herrscherin'], schreiber: ['Bibelschreiber', 'Bibelschreiberin'],
    'vorfahr-jesu': ['Vorfahre Jesu', 'Vorfahrin Jesu'],
  };
  const FILTERS = [
    ['alle', 'Alle'], ['frauen', 'Frauen'], ['patriarch', 'Patriarchen'], ['richter', 'Richter'], ['koenig', 'Könige'],
    ['prophet', 'Propheten'], ['priester', 'Priester'], ['apostel', 'Apostel'], ['juenger', 'Jünger'],
    ['herrscher', 'Herrscher'], ['schreiber', 'Bibelschreiber'], ['vorfahr-jesu', 'Vorfahren Jesu'], ['himmel', 'Gott & Engel'],
  ];
  const TAB_LABEL = { uebersicht: 'Übersicht', zeitleiste: 'Zeitleiste', personen: 'Personen', suche: 'Suche' };
  const FEATURED = ['jehova', 'jesus', 'abraham', 'moses', 'david', 'maria', 'petrus', 'paulus'].filter((id) => P.has(id));
  const SUGGESTIONS = ['Abraham', 'Moses', 'David', 'Sintflut', 'Pfingsten', 'Propheten', 'Königin', '607'];

  const eraOf = (p) => (p.eras && p.eras.length ? ERA.get(p.eras[0]) : null);
  const tone = (era) => 't-' + (era ? era.color : 'gray');
  const tagLabel = (t, sex) => (TAGS[t] ? TAGS[t][sex === 'f' ? 1 : 0] : t);

  function initials(name) {
    const words = name.replace(/\(.*?\)/g, '').split(/\s+/).filter((w) => w && /^[A-ZÄÖÜ]/.test(w) && !/^[IVX]+\.?$/.test(w));
    if (!words.length) return name.slice(0, 1).toUpperCase();
    if (words.length === 1) return words[0][0];
    return words[0][0] + words[words.length - 1][0];
  }
  const sortLetter = (name) => {
    const c = name.trim()[0].toUpperCase();
    return { Ä: 'A', Ö: 'O', Ü: 'U' }[c] || c;
  };

  // Personen ↔ Epochen
  const personsByEra = new Map(ERAS.map((e) => [e.id, []]));
  for (const p of PERSONS) for (const id of p.eras || []) if (personsByEra.has(id)) personsByEra.get(id).push(p);
  // Wichtigste Personen einer Epoche zuerst: Anzahl ihrer Ereignisse in dieser Epoche, dann chronologisch
  const eventsInEra = (p, eraId) => (p.events || []).reduce((n, id) => n + (E.get(id)?.era === eraId ? 1 : 0), 0);
  for (const [eraId, list] of personsByEra) {
    const w = new Map(list.map((p) => [p.id, eventsInEra(p, eraId)]));
    list.sort((a, b) => w.get(b.id) - w.get(a.id) || (a.year ?? 1e9) - (b.year ?? 1e9) || a.name.localeCompare(b.name, 'de'));
  }
  const eventsByEra = new Map(ERAS.map((e) => [e.id, []]));
  for (const ev of EVENTS) if (eventsByEra.has(ev.era)) eventsByEra.get(ev.era).push(ev);

  /* ------------------------------------------------------------------ */
  /* Hilfsfunktionen                                                     */
  /* ------------------------------------------------------------------ */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const icon = (id, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mqSplit = matchMedia('(min-width: 768px)');
  const mqSide = matchMedia('(min-width: 1100px)');
  const isSplit = () => mqSplit.matches;
  const hasSidebar = () => mqSide.matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat / blockiert */ } },
  };

  function avatar(p, cls = '') {
    if (!p) return '';
    const god = p.tags && p.tags.includes('gott');
    return `<span class="avatar ${cls} ${god ? 'god' : ''}" aria-hidden="true">${esc(initials(p.name))}</span>`;
  }
  const personLink = (id) => (P.has(id) ? `<a href="#/person/${id}">${esc(P.get(id).name)}</a>` : esc(id));
  const nameOrLink = (v) => (P.has(v) ? personLink(v) : esc(v));
  const refLink = (r, cls = 'ref') =>
    r && r.u ? `<a class="${cls}" href="${esc(r.u)}" target="_blank" rel="noopener">${cls === 'ref-chip' ? icon('book') : ''}${esc(r.t)}${cls === 'ref' ? icon('external') : ''}</a>` : '';

  /* Suche: Normalisierung mit Positionszuordnung (für Hervorhebungen) */
  function normMap(str) {
    const src = String(str).toLowerCase();
    let a = '';
    const m = [];
    for (let i = 0; i < src.length; i++) {
      let c = src[i];
      if (c === 'ß') c = 's';
      else c = c.normalize('NFD')[0];
      if (!/[a-z0-9]/.test(c)) c = ' ';
      a += c;
      m.push(i);
    }
    let out = '';
    const map = [];
    for (let j = 0; j < a.length; j++) {
      let c = a[j];
      const nx = a[j + 1];
      const pos = m[j];
      if ((c === 'a' || c === 'o' || c === 'u') && nx === 'e') j++;
      else if (c === 'p' && nx === 'h') { c = 'f'; j++; }
      else if (c === 't' && nx === 'h') j++;
      if (c === 'c') c = 'k';
      else if (c === 'y') c = 'i';
      const last = out[out.length - 1];
      if (c === ' ' ? !out || last === ' ' : c === last) continue;
      out += c;
      map.push(pos);
    }
    return { n: out, map, len: src.length };
  }
  const norm = (s) => normMap(s).n;

  function highlight(text, tokens) {
    if (!tokens || !tokens.length) return esc(text);
    const { n, map, len } = normMap(text);
    const ranges = [];
    for (const t of tokens) {
      let from = 0;
      let i;
      while (t && (i = n.indexOf(t, from)) !== -1) {
        const s = map[i];
        const e = i + t.length < map.length ? map[i + t.length] : len;
        ranges.push([s, e]);
        from = i + t.length;
      }
    }
    if (!ranges.length) return esc(text);
    ranges.sort((x, y) => x[0] - y[0]);
    let html = '';
    let pos = 0;
    for (const [s, e] of ranges) {
      if (s < pos) continue;
      html += esc(text.slice(pos, s)) + '<mark>' + esc(text.slice(s, e).trimEnd()) + '</mark>';
      pos = s + text.slice(s, e).trimEnd().length;
    }
    return html + esc(text.slice(pos));
  }

  function editDistanceAtMost(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    const prev = new Array(b.length + 1);
    const cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      let rowMin = cur[0];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return false;
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length] <= max;
  }

  // Suchindex
  const INDEX = [];
  for (const p of PERSONS) {
    const era = eraOf(p);
    INDEX.push({
      type: 'p', item: p,
      fields: [
        [norm(p.name), 100, true], [norm((p.alt || []).join(' ')), 90, true], [norm(p.role), 40],
        [norm((p.tags || []).map((t) => tagLabel(t, p.sex) + ' ' + (FILTERS.find((f) => f[0] === t) || ['', ''])[1]).join(' ')), 36],
        [norm(p.meaning || ''), 14], [norm((p.books || []).join(' ')), 22],
        [norm((p.dates || []).map((d) => d.value).join(' ')), 24],
        [norm(era ? era.short + ' ' + era.title : ''), 12],
        [norm(p.summary + ' ' + (p.facts || []).map((f) => f.t).join(' ')), 9],
      ],
    });
  }
  for (const ev of EVENTS) {
    const era = ERA.get(ev.era);
    INDEX.push({
      type: 'e', item: ev,
      fields: [
        [norm(ev.title), 100, true], [norm(ev.place || ''), 40], [norm(ev.date || ''), 46],
        [norm(era ? era.short + ' ' + era.title : ''), 12],
        [norm((ev.persons || []).map((id) => (P.get(id) || {}).name || '').join(' ')), 14],
        [norm(ev.summary + ' ' + (ev.facts || []).map((f) => f.t).join(' ') + ' ' + (ev.significance || '')), 9],
      ],
    });
  }

  function search(q) {
    const tokens = norm(q).split(' ').filter(Boolean);
    if (!tokens.length) return { tokens, persons: [], events: [] };
    const hits = [];
    for (const entry of INDEX) {
      let total = 0;
      let ok = true;
      for (const t of tokens) {
        let best = 0;
        for (const [text, w] of entry.fields) {
          if (!text) continue;
          const i = text.indexOf(t);
          if (i === -1) continue;
          const word = i === 0 || text[i - 1] === ' ';
          const s = w * (i === 0 ? (text.length === t.length ? 1 : 0.9) : word ? 0.74 : 0.36);
          if (s > best) best = s;
        }
        if (!best && t.length >= 4) {
          const max = t.length >= 8 ? 2 : 1;
          for (const [text, w, isName] of entry.fields) {
            if (!isName || !text) continue;
            if (text.split(' ').some((word) => editDistanceAtMost(t, word.slice(0, t.length + max), max))) { best = w * 0.45; break; }
          }
        }
        if (!best) { ok = false; break; }
        total += best;
      }
      if (ok) hits.push({ entry, score: total });
    }
    hits.sort((a, b) => b.score - a.score || (a.entry.item.name || a.entry.item.title).length - (b.entry.item.name || b.entry.item.title).length);
    return {
      tokens,
      persons: hits.filter((h) => h.entry.type === 'p').map((h) => h.entry.item),
      events: hits.filter((h) => h.entry.type === 'e').map((h) => h.entry.item),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Bausteine                                                           */
  /* ------------------------------------------------------------------ */
  function personRow(p, tokens) {
    return `<a class="row has-avatar ${tone(eraOf(p))}" href="#/person/${p.id}">
      ${avatar(p)}
      <span class="row-main"><span class="row-title">${highlight(p.name, tokens)}</span><span class="row-sub">${esc(p.role)}</span></span>
      ${icon('chevron-right', 'chev')}</a>`;
  }
  function eventRow(ev, tokens, showEra = true) {
    const era = ERA.get(ev.era);
    return `<a class="row has-avatar ${tone(era)}" href="#/ereignis/${ev.id}">
      <span class="ev-icon" aria-hidden="true">${icon('calendar')}</span>
      <span class="row-main"><span class="row-title">${highlight(ev.title, tokens)}</span><span class="row-sub">${esc(ev.date)}${showEra && era ? ' · ' + esc(era.short) : ''}</span></span>
      ${icon('chevron-right', 'chev')}</a>`;
  }
  function tlItem(ev) {
    return `<a class="tl-item" href="#/ereignis/${ev.id}">
      <span class="tl-dot" aria-hidden="true"></span>
      <span class="tl-body"><span class="tl-date">${esc(ev.date)}</span><span class="tl-title" style="display:block">${esc(ev.title)}</span>${ev.place ? `<span class="tl-place" style="display:block">${esc(ev.place)}</span>` : ''}</span>
      ${icon('chevron-right', 'chev')}</a>`;
  }
  function navbar(title, { left = '', right = '' } = {}) {
    return `<header class="navbar"><div class="nav-left">${left}</div><div class="nav-title">${esc(title)}</div><div class="nav-right">${right}</div></header>`;
  }
  function watchLargeTitle(root) {
    const bar = $('.navbar', root);
    const title = $('.large-title, .d-head h1', root);
    if (!bar || !title || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => bar.classList.toggle('is-stuck', !e.isIntersecting), { rootMargin: '-52px 0px 0px 0px' });
    io.observe(title);
  }

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */
  const views = {
    uebersicht: $('#view-uebersicht'), zeitleiste: $('#view-zeitleiste'), personen: $('#view-personen'), suche: $('#view-suche'),
  };
  const rendered = {};

  function renderOverview() {
    const v = views.uebersicht;
    const years = '4000+';
    v.innerHTML = `
      ${navbar('Übersicht', { right: `<button class="nav-btn" data-action="random" aria-label="Zufällige Person entdecken">${icon('shuffle')}</button>` })}
      <h1 class="large-title">Übersicht</h1>
      <div class="hero">
        <p>Die Personen und Ereignisse der Bibel – von der Schöpfung bis zur Christenversammlung des 1. Jahrhunderts. Tippe auf einen Eintrag, um mehr zu erfahren.</p>
        <div class="stats">
          <a class="stat" href="#/personen"><b>${PERSONS.length}</b><span>Personen</span></a>
          <a class="stat" href="#/zeitleiste"><b>${EVENTS.length}</b><span>Ereignisse</span></a>
          <a class="stat" href="#/zeitleiste"><b>${years}</b><span>Jahre</span></a>
        </div>
      </div>
      <h2 class="section-title">Im Mittelpunkt</h2>
      <div class="rail">${FEATURED.map((id) => {
        const p = P.get(id);
        return `<a class="feature ${tone(eraOf(p))}" href="#/person/${p.id}">${avatar(p)}<b>${esc(p.name)}</b><span class="role">${esc(p.role)}</span></a>`;
      }).join('')}</div>
      <h2 class="section-title">Epochen <small>${ERAS.length} Abschnitte</small></h2>
      <div class="era-cards">${ERAS.map((era) => {
        const ppl = personsByEra.get(era.id) || [];
        const evs = eventsByEra.get(era.id) || [];
        return `<a class="era-card ${tone(era)}" href="#/zeitleiste/${era.id}">
          <div class="eyebrow">${esc(era.range)}</div>
          <h3>${esc(era.title)}</h3>
          <p>${esc(era.summary)}</p>
          <div class="meta"><span class="stack-avatars">${ppl.slice(0, 4).map((p) => avatar(p)).join('')}</span><span>${evs.length} Ereignisse · ${ppl.length} Personen</span></div>
        </a>`;
      }).join('')}</div>
      <p class="footnote">Alle Texte sind eigene Zusammenfassungen. Grundlage sind ausschließlich Veröffentlichungen auf <a href="https://www.jw.org/de/" target="_blank" rel="noopener">jw.org</a> – vor allem „Einsichten über die Heilige Schrift“ und die Studienbibel. Jeder Eintrag nennt und verlinkt seine Quellen; Bibelstellen öffnen die Neue-Welt-Übersetzung auf jw.org. Jahresangaben folgen der dort verwendeten Zeitrechnung (v. u. Z. = vor unserer Zeitrechnung).<br>Datenstand: ${esc(new Date(D.built).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>`;
    watchLargeTitle(v);
  }

  let eraObserver = null;
  let setActiveEra = () => {};
  function renderTimeline() {
    const v = views.zeitleiste;
    let html = `${navbar('Zeitleiste')}
      <h1 class="large-title">Zeitleiste</h1>
      <p class="page-intro">${EVENTS.length} Ereignisse in ${ERAS.length} Epochen. Daten nach der Zeitrechnung auf jw.org.</p>
      <div class="sticky-sub" id="tlBar"><div class="chips" role="tablist" aria-label="Epoche wählen">${ERAS.map((era) =>
        `<a class="chip era ${tone(era)}" href="#/zeitleiste/${era.id}" data-era="${era.id}" role="tab"><span class="dot"></span>${esc(era.short)}</a>`).join('')}</div></div>`;
    ERAS.forEach((era, i) => {
      if (era.gapBefore) html += `<div class="gap-note">${esc(era.gapBefore)}</div>`;
      const ppl = personsByEra.get(era.id) || [];
      const evs = eventsByEra.get(era.id) || [];
      html += `<section class="era-section ${tone(era)}" id="era-${era.id}" data-era="${era.id}" aria-labelledby="h-${era.id}">
        <div class="era-head"><div class="eyebrow">${esc(era.short)}</div><h2 id="h-${era.id}">${esc(era.title)}</h2><div class="range">${esc(era.range)}</div><p>${esc(era.summary)}</p></div>
        ${ppl.length ? `<div class="people-rail" aria-label="Personen dieser Epoche">${ppl.map((p) => `<a class="mini-person ${tone(era)}" href="#/person/${p.id}">${avatar(p)}<span class="nm">${esc(p.name)}</span></a>`).join('')}</div>` : ''}
        <div class="tl">${evs.map(tlItem).join('')}</div>
      </section>`;
      void i;
    });
    v.innerHTML = html;
    watchLargeTitle(v);

    const chips = $$('.chip', v);
    const bar = $('#tlBar .chips', v);
    const setActive = (id, instant = false) => {
      for (const c of chips) {
        const on = c.dataset.era === id;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          const target = c.offsetLeft - (bar.clientWidth - c.offsetWidth) / 2;
          bar.scrollTo({ left: target, behavior: instant || reduceMotion.matches ? 'auto' : 'smooth' });
        }
      }
    };
    setActiveEra = setActive;
    if (eraObserver) eraObserver.disconnect();
    if ('IntersectionObserver' in window) {
      eraObserver = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.dataset.era);
      }, { rootMargin: '-40% 0px -55% 0px' });
      $$('.era-section', v).forEach((s) => eraObserver.observe(s));
    }
    setActive(ERAS[0].id);
    const sub = $('#tlBar', v);
    new IntersectionObserver(([e]) => sub.classList.toggle('edge', e.intersectionRatio < 1), { threshold: [1], rootMargin: `-${45 + 1}px 0px 0px 0px` }).observe(sub);
  }

  function scrollToEra(id, smooth = true) {
    const sec = document.getElementById('era-' + id);
    if (!sec) return;
    requestAnimationFrame(() => {
      setActiveEra(id, true);
      sec.scrollIntoView({ block: 'start', behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
    });
  }

  /* Personen */
  const people = { filter: 'alle', sort: 'az', q: '' };
  const matchesFilter = (p, f) => {
    if (f === 'alle') return true;
    if (f === 'frauen') return p.sex === 'f';
    if (f === 'himmel') return p.tags.includes('gott') || p.tags.includes('engel');
    return p.tags.includes(f);
  };
  function renderPeople() {
    const v = views.personen;
    v.innerHTML = `${navbar('Personen')}
      <h1 class="large-title">Personen</h1>
      <div class="search-row"><label class="search">${icon('search')}<span class="sr-only">Personen filtern</span>
        <input id="pplQuery" type="search" placeholder="Name, Rolle oder Stichwort" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <button class="search-clear" type="button" aria-label="Eingabe löschen" hidden>${icon('xmark-circle')}</button></label></div>
      <div class="chips" id="pplChips" aria-label="Filter">${FILTERS.map(([id, label]) => {
        const n = PERSONS.filter((p) => matchesFilter(p, id)).length;
        return n ? `<button class="chip" type="button" data-filter="${id}" aria-pressed="${id === people.filter}">${esc(label)}${id === 'alle' ? '' : ` <span class="count">${n}</span>`}</button>` : '';
      }).join('')}</div>
      <div class="segmented" id="pplSort" role="group" aria-label="Sortierung"><span class="thumb"></span>
        <button type="button" data-sort="az" aria-pressed="true">A–Z</button><button type="button" data-sort="zeit" aria-pressed="false">Nach Epoche</button></div>
      <div id="pplList" class="people-list"></div>
      <nav class="az" id="pplAz" aria-label="Alphabet"></nav>`;
    watchLargeTitle(v);
    const input = $('#pplQuery', v);
    const clear = $('.search-clear', v);
    input.addEventListener('input', () => { people.q = input.value; clear.hidden = !input.value; renderPeopleList(); });
    clear.addEventListener('click', () => { input.value = ''; people.q = ''; clear.hidden = true; renderPeopleList(); input.focus(); });
    $('#pplChips', v).addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      people.filter = b.dataset.filter;
      $$('#pplChips .chip', v).forEach((c) => c.setAttribute('aria-pressed', c === b ? 'true' : 'false'));
      renderPeopleList();
    });
    const seg = $('#pplSort', v);
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      people.sort = b.dataset.sort;
      updateSegment(seg);
      renderPeopleList();
    });
    updateSegment(seg);
    setupAz($('#pplAz', v));
    renderPeopleList();
  }
  function updateSegment(seg) {
    const btns = $$('button', seg);
    const idx = btns.findIndex((b) => b.dataset.sort === people.sort);
    btns.forEach((b, i) => b.setAttribute('aria-pressed', i === idx ? 'true' : 'false'));
    const thumb = $('.thumb', seg);
    thumb.style.width = `calc((100% - 4px) / ${btns.length})`;
    thumb.style.transform = `translateX(${idx * 100}%)`;
  }
  function renderPeopleList() {
    const list = $('#pplList');
    const tokens = norm(people.q).split(' ').filter(Boolean);
    let items = PERSONS.filter((p) => matchesFilter(p, people.filter));
    if (tokens.length) {
      const found = new Set(search(people.q).persons.map((p) => p.id));
      items = items.filter((p) => found.has(p.id));
    }
    const az = $('#pplAz');
    if (!items.length) {
      list.innerHTML = `<div class="empty">${icon('people')}<h2>Keine Personen</h2><p>Für diese Auswahl gibt es keine Treffer.</p></div>`;
      az.innerHTML = '';
      return;
    }
    let html = '';
    const letters = [];
    if (people.sort === 'az') {
      let cur = '';
      for (const p of items) {
        const L = sortLetter(p.name);
        if (L !== cur) { cur = L; letters.push(L); html += `<h3 class="letter" id="ppl-${L}">${L}</h3>`; }
        html += personRow(p, tokens);
      }
    } else {
      const groups = new Map();
      for (const p of items) {
        const k = p.eras && p.eras[0] ? p.eras[0] : '_';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(p);
      }
      const order = ['_', ...ERAS.map((e) => e.id)];
      for (const k of order) {
        const g = groups.get(k);
        if (!g) continue;
        g.sort((a, b) => (a.year ?? 1e9) - (b.year ?? 1e9) || a.name.localeCompare(b.name, 'de'));
        const era = ERA.get(k);
        html += `<h3 class="letter ${tone(era)}">${era ? esc(era.short) + ' · ' + esc(era.range) : 'Ohne Epoche'}</h3>` + g.map((p) => personRow(p, tokens)).join('');
      }
    }
    list.innerHTML = html;
    az.innerHTML = people.sort === 'az' && letters.length > 6 ? letters.map((L) => `<button type="button" data-l="${L}" tabindex="-1">${L}</button>`).join('') : '';
    markSelected();
  }
  function setupAz(az) {
    const jump = (y) => {
      const el = document.elementFromPoint(az.getBoundingClientRect().left + 9, y);
      const L = el && el.dataset && el.dataset.l;
      if (!L) return;
      const target = document.getElementById('ppl-' + L);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 44);
        window.scrollTo(0, top);
      }
    };
    az.addEventListener('pointerdown', (e) => { az.setPointerCapture(e.pointerId); jump(e.clientY); e.preventDefault(); });
    az.addEventListener('pointermove', (e) => { if (az.hasPointerCapture(e.pointerId)) jump(e.clientY); });
  }

  /* Suche */
  let searchQuery = '';
  let searchExpanded = { p: false, e: false };
  function renderSearch() {
    const v = views.suche;
    v.innerHTML = `${navbar('Suche')}
      <h1 class="large-title">Suche</h1>
      <div class="sticky-sub search-sticky"><div class="search-row"><label class="search">${icon('search')}<span class="sr-only">Suchen</span>
        <input id="q" type="search" placeholder="Personen, Ereignisse, Orte, Jahre" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <button class="search-clear" type="button" aria-label="Eingabe löschen" hidden>${icon('xmark-circle')}</button></label>
        <button class="search-cancel" type="button" hidden>Abbrechen</button></div></div>
      <div id="results"></div>`;
    watchLargeTitle(v);
    const input = $('#q', v);
    const clear = $('.search-clear', v);
    const cancel = $('.search-cancel', v);
    input.value = searchQuery;
    clear.hidden = !searchQuery;
    input.addEventListener('input', () => setSearch(input.value, 'main'));
    input.addEventListener('focus', () => { cancel.hidden = false; });
    input.addEventListener('blur', () => { setTimeout(() => { if (!input.value) cancel.hidden = true; }, 150); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { rememberSearch(input.value); input.blur(); } });
    clear.addEventListener('click', () => { setSearch('', 'main'); input.focus(); });
    cancel.addEventListener('click', () => { setSearch('', 'main'); cancel.hidden = true; input.blur(); });
    renderResults();
  }
  function setSearch(q, origin) {
    searchQuery = q;
    searchExpanded = { p: false, e: false };
    const main = $('#q');
    const side = $('#sideSearch');
    if (main && origin !== 'main') main.value = q;
    if (side && origin !== 'side') side.value = q;
    const clear = main && main.parentElement.querySelector('.search-clear');
    if (clear) clear.hidden = !q;
    renderResults();
  }
  function rememberSearch(q) {
    q = q.trim();
    if (q.length < 2) return;
    const list = store.get('recent', []).filter((x) => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    store.set('recent', list.slice(0, 8));
  }
  function renderResults() {
    const box = $('#results');
    if (!box) return;
    const q = searchQuery.trim();
    if (!q) {
      const recent = store.get('recent', []);
      box.innerHTML = `
        ${recent.length ? `<div class="section-label" style="display:flex;justify-content:space-between;align-items:baseline">Zuletzt gesucht<button class="link-btn" type="button" data-action="clear-recent">Löschen</button></div>
        <div class="recent">${recent.map((r) => `<button class="chip" type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
        <div class="section-label">Vorschläge</div>
        <div class="recent">${SUGGESTIONS.map((r) => `<button class="chip" type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <p class="footnote">Gesucht wird in Namen, Rollen, Orten, Jahreszahlen und Beschreibungen. Kleine Tippfehler und unterschiedliche Schreibweisen (z. B. „Josef“ / „Joseph“) werden berücksichtigt.</p>`;
      return;
    }
    const r = search(q);
    if (!r.persons.length && !r.events.length) {
      box.innerHTML = `<div class="empty">${icon('search')}<h2>Keine Treffer</h2><p>Für „${esc(q)}“ wurde nichts gefunden. Versuche eine andere Schreibweise oder einen kürzeren Begriff.</p></div>`;
      return;
    }
    const LIM = 12;
    const ps = searchExpanded.p ? r.persons : r.persons.slice(0, LIM);
    const es = searchExpanded.e ? r.events : r.events.slice(0, LIM);
    box.innerHTML = `
      ${r.persons.length ? `<div class="section-label">Personen · ${r.persons.length}</div>${ps.map((p) => personRow(p, r.tokens)).join('')}
        ${r.persons.length > ps.length ? `<div class="result-count"><button class="link-btn" type="button" data-more="p">Alle ${r.persons.length} Personen anzeigen</button></div>` : ''}` : ''}
      ${r.events.length ? `<div class="section-label">Ereignisse · ${r.events.length}</div>${es.map((ev) => eventRow(ev, r.tokens)).join('')}
        ${r.events.length > es.length ? `<div class="result-count"><button class="link-btn" type="button" data-more="e">Alle ${r.events.length} Ereignisse anzeigen</button></div>` : ''}` : ''}`;
    markSelected();
  }

  const RENDER = { uebersicht: renderOverview, zeitleiste: renderTimeline, personen: renderPeople, suche: renderSearch };
  function ensureRendered(tab) {
    if (!rendered[tab]) { RENDER[tab](); rendered[tab] = true; }
  }

  /* ------------------------------------------------------------------ */
  /* Detailseiten                                                        */
  /* ------------------------------------------------------------------ */
  function section(title, body, cls = '') {
    return body ? `<section class="d-sec ${cls}">${title ? `<h2>${esc(title)}</h2>` : ''}${body}</section>` : '';
  }
  function factsList(facts) {
    if (!facts || !facts.length) return '';
    return `<div class="card facts">${facts.map((f) => `<div class="fact"><p>${esc(f.t)}${f.r ? ' ' + refLink(f.r) : ''}</p></div>`).join('')}</div>`;
  }
  function sourcesBlock(sources) {
    if (!sources || !sources.length) return '';
    return `<div class="card">${sources.map((s) => {
      let host = '';
      try { host = new URL(s.url).host; } catch { /* ungültig */ }
      return `<a class="link-row" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="lead">${icon('book')}</span><span class="t">${esc(s.title)}<small>${esc(host)}</small></span>${icon('external', 'ext')}</a>`;
    }).join('')}</div><p class="source-note">Zusammenfassung in eigenen Worten. Ausführliche Informationen in den verlinkten Artikeln auf jw.org.</p>`;
  }
  const refsBlock = (refs) => (refs && refs.length ? `<div class="ref-chips">${refs.map((r) => refLink(r, 'ref-chip')).join('')}</div>` : '');

  // Lange Werte stehen (wie in iOS-Zellen mit Untertitel) unter der Bezeichnung statt rechtsbündig daneben
  const kvRow = (k, v) => `<div class="kv${v.replace(/<[^>]+>/g, '').length > 44 ? ' kv-stack' : ''}"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;

  function personDetail(p) {
    const era = eraOf(p);
    const kv = [];
    if (p.meaning) kv.push(['Bedeutung des Namens', esc(p.meaning)]);
    for (const d of p.dates || []) kv.push([d.label, esc(d.value)]);
    if (p.alt && p.alt.length) kv.push(['Auch genannt', esc(p.alt.join(', '))]);
    if (p.books && p.books.length) kv.push(['Schrieb', esc(p.books.map((b) => b.replace(/^(\d\.) /, '$1 ')).join(', '))]);
    const fam = p.family || {};
    const famRows = [];
    const famRow = (label, vals) => { vals = (Array.isArray(vals) ? vals : [vals]).filter(Boolean); if (vals.length) famRows.push([label, vals.map(nameOrLink).join(', ')]); };
    famRow('Vater', fam.father);
    famRow('Mutter', fam.mother);
    famRow((fam.spouses || []).length > 1 ? 'Ehepartner' : p.sex === 'f' ? 'Ehemann' : p.sex === 'm' ? 'Ehefrau' : 'Ehepartner', fam.spouses);
    famRow('Kinder', fam.children);
    famRow('Geschwister', fam.siblings);
    const related = (p.related || []).filter((id) => P.has(id)).map((id) => P.get(id));
    const evs = (p.events || []).map((id) => E.get(id)).filter(Boolean);
    const tags = (p.tags || []).filter((t) => t !== 'gott');
    return `<article class="d ${tone(era)}"><div class="d-inner fade-in">
      <header class="d-head">
        ${avatar(p, 'lg')}
        <h1 tabindex="-1">${esc(p.name)}</h1>
        <p class="sub">${esc(p.role)}</p>
        <div class="d-tags">${era ? `<a class="tag era" href="#/zeitleiste/${era.id}">${esc(era.short)}</a>` : ''}${tags.map((t) => `<span class="tag">${esc(tagLabel(t, p.sex))}</span>`).join('')}</div>
      </header>
      ${kv.length ? section('', `<div class="card"><dl>${kv.map(([k, v]) => kvRow(k, v)).join('')}</dl></div>`) : ''}
      ${section('Überblick', `<div class="card pad"><p class="prose">${esc(p.summary)}</p></div>`)}
      ${section('Wichtige Punkte', factsList(p.facts))}
      ${p.lesson ? section('', `<div class="callout">${icon('bulb')}<div><b>Was wir lernen können</b><p>${esc(p.lesson)}</p></div></div>`) : ''}
      ${famRows.length ? section('Familie', `<div class="card"><dl>${famRows.map(([k, v]) => kvRow(k, v)).join('')}</dl></div>`) : ''}
      ${evs.length ? section('Ereignisse', `<div class="card group-plain">${evs.map((ev) => eventRow(ev, null, true)).join('')}</div>`) : ''}
      ${related.length ? section('Weitere Personen', `<div class="card group-plain">${related.map((r) => personRow(r)).join('')}</div>`) : ''}
      ${section('Bibelstellen', refsBlock(p.refs))}
      ${section('Quellen auf jw.org', sourcesBlock(p.sources))}
    </div></article>`;
  }

  function badge(ev) {
    const m = (ev.date || '').match(/(\d{1,4})(?:\s*[–-]\s*\d{1,4})?\s*(v\.\s?u\.\s?Z\.|u\.\s?Z\.)/);
    if (!m) return `<div class="event-badge" aria-hidden="true">${icon('calendar')}</div>`;
    return `<div class="event-badge" aria-hidden="true"><b>${esc(m[1])}<small>${esc(m[2].replace(/\s/g, ' '))}</small></b></div>`;
  }
  function eventDetail(ev) {
    const era = ERA.get(ev.era);
    const ppl = (ev.persons || []).map((id) => P.get(id)).filter(Boolean);
    const i = EV_POS.get(ev.id);
    const prev = EVENTS[i - 1];
    const next = EVENTS[i + 1];
    return `<article class="d ${tone(era)}"><div class="d-inner fade-in">
      <header class="d-head">
        ${badge(ev)}
        <h1 tabindex="-1">${esc(ev.title)}</h1>
        <p class="sub">${esc(ev.date)}${ev.place ? ' · ' + esc(ev.place) : ''}</p>
        <div class="d-tags">${era ? `<a class="tag era" href="#/zeitleiste/${era.id}">${esc(era.short)}</a>` : ''}</div>
      </header>
      ${section('Was geschah', `<div class="card pad"><p class="prose">${esc(ev.summary)}</p></div>`)}
      ${ev.significance ? section('', `<div class="callout">${icon('sparkle')}<div><b>Bedeutung</b><p>${esc(ev.significance)}</p></div></div>`) : ''}
      ${section('Im Einzelnen', factsList(ev.facts))}
      ${ppl.length ? section('Beteiligte Personen', `<div class="card group-plain">${ppl.map((p) => personRow(p)).join('')}</div>`) : ''}
      ${section('Bibelstellen', refsBlock(ev.refs))}
      ${section('Quellen auf jw.org', sourcesBlock(ev.sources))}
      ${prev || next ? section('', `<nav class="pager" aria-label="Zeitleiste">
        ${prev ? `<a class="prev" href="#/ereignis/${prev.id}"><small>${icon('chevron-left')} Vorher</small><b>${esc(prev.title)}</b></a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/ereignis/${next.id}"><small>Danach ${icon('chevron-right')}</small><b>${esc(next.title)}</b></a>` : '<span></span>'}
      </nav>`) : ''}
    </div></article>`;
  }

  function resolve(key) {
    const [kind, id] = key.split('/');
    if (kind === 'person' && P.has(id)) return { kind, item: P.get(id), title: P.get(id).name };
    if (kind === 'ereignis' && E.has(id)) return { kind, item: E.get(id), title: E.get(id).title };
    return null;
  }
  function detailHTML(key) {
    const r = resolve(key);
    if (!r) return `<div class="empty">${icon('info')}<h2>Nicht gefunden</h2><p>Dieser Eintrag existiert nicht (mehr).</p><a class="btn" href="#/">Zur Übersicht</a></div>`;
    return r.kind === 'person' ? personDetail(r.item) : eventDetail(r.item);
  }
  const titleOf = (key) => (resolve(key) || { title: 'Details' }).title;
  const backLabel = (t) => (t.length > 16 ? 'Zurück' : t);

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  const S = { tab: null, stack: [], scroll: {} };
  const stackEl = $('#stack');
  const pane = $('#detail');

  function parseHref(href) {
    const h = decodeURIComponent(String(href).replace(/^#\/?/, ''));
    const [a, b] = h.split('/');
    if (a === 'person' && b) return { kind: 'detail', key: 'person/' + b, tab: 'personen' };
    if (a === 'ereignis' && b) return { kind: 'detail', key: 'ereignis/' + b, tab: 'zeitleiste' };
    if (a === 'zeitleiste') return { kind: 'tab', tab: 'zeitleiste', era: ERA.has(b) ? b : null };
    if (a === 'personen') return { kind: 'tab', tab: 'personen' };
    if (a === 'suche') return { kind: 'tab', tab: 'suche' };
    return { kind: 'tab', tab: 'uebersicht' };
  }
  function stateFromHash() {
    const r = parseHref(location.hash);
    return r.kind === 'tab' ? { tab: r.tab, era: r.era || null, stack: [] } : { tab: r.tab, era: null, stack: [r.key] };
  }
  function hrefFor(st) {
    if (st.stack && st.stack.length) return '#/' + st.stack[st.stack.length - 1];
    if (st.tab === 'zeitleiste' && st.era) return '#/zeitleiste/' + st.era;
    return st.tab === 'uebersicht' ? '#/' : '#/' + st.tab;
  }

  function go(href, { from = 'main', replace = false } = {}) {
    const r = parseHref(href);
    let st;
    if (r.kind === 'tab') {
      st = { tab: r.tab, era: r.era || null, stack: isSplit() ? S.stack.slice() : [] };
    } else {
      let stack;
      if (from === 'detail') {
        const i = S.stack.indexOf(r.key);
        stack = i >= 0 ? S.stack.slice(0, i + 1) : [...S.stack, r.key];
      } else stack = [r.key];
      st = { tab: S.tab || r.tab, era: null, stack };
    }
    if (r.kind === 'detail' && S.stack[S.stack.length - 1] === r.key && st.stack.length === S.stack.length) return;
    st.idx = ((history.state && history.state.idx) || 0) + (replace ? 0 : 1);
    try { history[replace ? 'replaceState' : 'pushState'](st, '', hrefFor(st)); } catch { /* file:// in manchen Browsern */ }
    apply(st);
  }

  function back() {
    if (history.state && history.state.idx > 0) { history.back(); return; }
    const st = { tab: S.tab, era: null, stack: S.stack.slice(0, -1), idx: 0 };
    try { history.replaceState(st, '', hrefFor(st)); } catch { /* ignore */ }
    apply(st);
  }

  function apply(st) {
    setTab(st.tab);
    setStack(st.stack || []);
    if (st.era) {
      if (!isSplit() && S.stack.length) return;
      scrollToEra(st.era);
    }
  }

  function setTab(tab) {
    if (!views[tab]) tab = 'uebersicht';
    if (S.tab === tab) return;
    if (S.tab && !isSplit()) S.scroll[S.tab] = window.scrollY;
    const prevTab = S.tab;
    S.tab = tab;
    ensureRendered(tab);
    for (const [k, el] of Object.entries(views)) el.hidden = k !== tab;
    document.body.classList.toggle('is-grouped', tab === 'uebersicht');
    if (!isSplit()) window.scrollTo(0, S.scroll[tab] || 0);
    for (const a of $$('[data-tab]')) {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    if (tab !== 'suche' && prevTab === 'suche' && hasSidebar() && searchQuery) setSearch('', 'x');
    updateTitle();
    markSelected();
  }

  function updateTitle() {
    const top = S.stack[S.stack.length - 1];
    document.title = (top ? titleOf(top) : TAB_LABEL[S.tab] || 'Übersicht') + ' · Bibel-Übersicht';
  }

  function markSelected() {
    for (const el of $$('#main .is-selected')) el.classList.remove('is-selected');
    const top = S.stack[S.stack.length - 1];
    if (!top || !isSplit()) return;
    for (const el of $$(`#main a[href="#/${CSS.escape(top).replace(/\\\//g, '/')}"]`)) el.classList.add('is-selected');
  }

  /* Detailbereich in der geteilten Ansicht */
  function renderPane(focus = true) {
    const key = S.stack[S.stack.length - 1];
    if (!key) {
      pane.innerHTML = `<div class="empty" style="min-height:100%;align-content:center">${icon('book')}<h2>Wähle einen Eintrag</h2>
        <p>Tippe in der Zeitleiste oder in der Personenliste auf einen Eintrag, um hier alle Details zu sehen.</p>
        <button class="btn plain" type="button" data-action="random">${icon('shuffle')}Zufällig entdecken</button></div>`;
      return;
    }
    const prevKey = S.stack[S.stack.length - 2];
    const left = prevKey ? `<button class="nav-btn" type="button" data-back>${icon('chevron-left')}<span>${esc(backLabel(titleOf(prevKey)))}</span></button>` : '';
    pane.innerHTML = navbar(titleOf(key), { left }) + detailHTML(key);
    pane.scrollTop = 0;
    watchLargeTitle(pane);
    if (focus) { const h = $('h1', pane); if (h) h.focus({ preventScroll: true }); }
  }

  /* Gestapelte Seiten (iPhone) */
  function makePage(key, index) {
    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.key = key;
    const prevTitle = index > 0 ? titleOf(S.stack[index - 1]) : TAB_LABEL[S.tab];
    page.innerHTML = `<div class="page-scroll">${navbar(titleOf(key), { left: `<button class="nav-btn" type="button" data-back>${icon('chevron-left')}<span>${esc(backLabel(prevTitle))}</span></button>` })}${detailHTML(key)}</div>`;
    watchLargeTitle(page);
    return page;
  }
  const PUSH = { duration: 480, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' };
  function animatePush(page, under) {
    if (reduceMotion.matches || !page.animate) {
      if (page.animate) page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      return;
    }
    page.classList.add('page-shadow');
    const a = page.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], PUSH);
    a.onfinish = () => page.classList.remove('page-shadow');
    if (under) under.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-28%)' }], PUSH);
  }
  function animatePop(page, under, done) {
    if (reduceMotion.matches || !page.animate) {
      if (!page.animate) { done(); return; }
      page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).onfinish = done;
      return;
    }
    page.classList.add('page-shadow');
    const from = page.style.transform || 'translateX(0)';
    page.animate([{ transform: from }, { transform: 'translateX(100%)' }], { duration: 380, easing: 'cubic-bezier(0.3, 0.8, 0.3, 1)', fill: 'forwards' }).onfinish = done;
    if (under) under.animate([{ transform: under.style.transform || 'translateX(-28%)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'cubic-bezier(0.3, 0.8, 0.3, 1)' });
  }
  let skipNextPopAnimation = false;
  function setStack(next) {
    const prev = S.stack;
    S.stack = next;
    updateTitle();
    if (isSplit()) {
      const changed = prev[prev.length - 1] !== next[next.length - 1] || !pane.firstElementChild;
      if (changed) renderPane();
      markSelected();
      return;
    }
    const pages = [...stackEl.children];
    let k = 0;
    while (k < prev.length && k < next.length && prev[k] === next[k] && pages[k]) k++;
    const remove = pages.slice(k);
    const add = next.slice(k);
    const underFor = (i) => (i === 0 ? $('#main') : stackEl.children[i - 1]);
    if (!add.length && remove.length) {
      const top = remove[remove.length - 1];
      remove.slice(0, -1).forEach((p) => p.remove());
      const under = underFor(k);
      if (skipNextPopAnimation) { skipNextPopAnimation = false; top.remove(); }
      else animatePop(top, under, () => top.remove());
    } else {
      remove.forEach((p) => p.remove());
      add.forEach((key, j) => {
        const i = k + j;
        const page = makePage(key, i);
        stackEl.appendChild(page);
        if (j === add.length - 1) {
          animatePush(page, underFor(i));
          const h = $('h1', page);
          if (h) setTimeout(() => h.focus({ preventScroll: true }), 50);
        }
      });
    }
    const open = next.length > 0;
    $('#main').setAttribute('aria-hidden', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
  }

  /* Wischgeste vom linken Rand (nur als installierte App; Safari hat eine eigene) */
  function setupEdgeSwipe() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!standalone) return;
    let g = null;
    stackEl.addEventListener('pointerdown', (e) => {
      const page = stackEl.lastElementChild;
      if (!page || e.clientX > 24 || e.pointerType === 'mouse') return;
      g = { page, under: stackEl.children.length > 1 ? stackEl.children[stackEl.children.length - 2] : $('#main'), x0: e.clientX, hist: [], id: e.pointerId };
      page.setPointerCapture(e.pointerId);
    });
    stackEl.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const w = innerWidth;
      const dx = Math.max(0, e.clientX - g.x0);
      g.page.style.transform = `translateX(${dx}px)`;
      g.under.style.transform = `translateX(${-0.28 * w + dx * 0.28}px)`;
      g.hist.push([e.timeStamp, e.clientX]);
      if (g.hist.length > 6) g.hist.shift();
    });
    const end = (e) => {
      if (!g || e.pointerId !== g.id) return;
      const w = innerWidth;
      const dx = Math.max(0, e.clientX - g.x0);
      const h = g.hist;
      const v = h.length > 1 ? ((h[h.length - 1][1] - h[0][1]) / Math.max(1, h[h.length - 1][0] - h[0][0])) * 1000 : 0;
      const projected = dx + (v / 1000) * 0.998 / (1 - 0.998);
      const { page, under } = g;
      g = null;
      if (projected > w * 0.5) {
        page.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(100%)' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)', fill: 'forwards' });
        under.animate([{ transform: under.style.transform }, { transform: 'translateX(0)' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }).onfinish = () => {
          under.style.transform = '';
          skipNextPopAnimation = true;
          back();
        };
      } else {
        page.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }).onfinish = () => { page.style.transform = ''; };
        under.style.transform = '';
      }
    };
    stackEl.addEventListener('pointerup', end);
    stackEl.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------------ */
  /* Ereignisse                                                          */
  /* ------------------------------------------------------------------ */
  function randomPerson() {
    const pool = PERSONS.filter((p) => p.summary);
    const p = pool[Math.floor(Math.random() * pool.length)];
    go('#/person/' + p.id, { from: 'main' });
  }

  document.addEventListener('click', (e) => {
    const backBtn = e.target.closest('[data-back]');
    if (backBtn) { e.preventDefault(); back(); return; }
    const act = e.target.closest('[data-action]');
    if (act) {
      if (act.dataset.action === 'random') randomPerson();
      if (act.dataset.action === 'clear-recent') { store.set('recent', []); renderResults(); }
      return;
    }
    const qBtn = e.target.closest('[data-q]');
    if (qBtn) {
      setSearch(qBtn.dataset.q, 'x');
      const inp = hasSidebar() ? $('#sideSearch') : $('#q');
      if (inp) inp.value = qBtn.dataset.q;
      rememberSearch(qBtn.dataset.q);
      return;
    }
    const more = e.target.closest('[data-more]');
    if (more) { searchExpanded[more.dataset.more] = true; renderResults(); return; }

    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (a.dataset.tab && a.dataset.tab === S.tab && !(S.stack.length && !isSplit())) {
      const view = views[S.tab];
      if (isSplit()) view.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      else window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      if (S.tab === 'suche') { const i = $('#q'); if (i) i.focus(); }
      return;
    }
    if (searchQuery && a.closest('#view-suche')) rememberSearch(searchQuery);
    const fromDetail = !!a.closest('#detail, #stack');
    go(href, { from: fromDetail ? 'detail' : 'main' });
    if (a.dataset.tab === 'suche') { const i = $('#q'); if (i) i.focus(); }
  });

  window.addEventListener('popstate', (e) => apply(e.state && e.state.tab ? e.state : stateFromHash()));

  // Suchfeld in der Seitenleiste (Desktop)
  const side = $('#sideSearch');
  let tabBeforeSearch = 'uebersicht';
  side.addEventListener('input', () => {
    const q = side.value;
    if (q && S.tab !== 'suche') { tabBeforeSearch = S.tab; setTab('suche'); }
    setSearch(q, 'side');
    if (!q && S.tab === 'suche') setTab(tabBeforeSearch);
  });
  side.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') rememberSearch(side.value);
    if (e.key === 'Escape') { side.value = ''; setSearch('', 'side'); setTab(tabBeforeSearch); side.blur(); }
    if (e.key === 'ArrowDown') { const first = $('#results a'); if (first) { e.preventDefault(); first.focus(); } }
  });

  // Tastatur
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      if (hasSidebar()) { side.focus(); side.select(); }
      else { go('#/suche'); const i = $('#q'); if (i) i.focus(); }
      return;
    }
    if (e.key === 'Escape' && !typing && S.stack.length) { e.preventDefault(); back(); }
  });

  // :active-Zustände auf iOS aktivieren
  document.addEventListener('touchstart', () => {}, { passive: true });

  // Seitenleiste: Epochen und Zähler
  $('#sideEras').innerHTML = ERAS.map((era) => `<a class="side-link short ${tone(era)}" href="#/zeitleiste/${era.id}"><span class="sw"></span>${esc(era.short)}<span class="n">${(eventsByEra.get(era.id) || []).length}</span></a>`).join('');
  for (const el of $$('[data-count]')) el.textContent = el.dataset.count === 'events' ? EVENTS.length : PERSONS.length;

  // Wechsel zwischen kompakter und geteilter Darstellung
  function onLayoutChange() {
    if (isSplit()) {
      stackEl.innerHTML = '';
      $('#main').setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = '';
      renderPane(false);
    } else {
      pane.innerHTML = '';
      const keep = S.stack;
      stackEl.innerHTML = '';
      keep.forEach((key, i) => stackEl.appendChild(makePage(key, i)));
      const open = keep.length > 0;
      $('#main').setAttribute('aria-hidden', open ? 'true' : 'false');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    markSelected();
  }
  mqSplit.addEventListener('change', onLayoutChange);

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  const st0 = Object.assign(stateFromHash(), { idx: 0 });
  try { history.replaceState(st0, '', location.hash ? hrefFor(st0) : '#/'); } catch { /* ignore */ }
  setTab(st0.tab);
  S.stack = [];
  if (isSplit()) { S.stack = st0.stack; renderPane(false); markSelected(); updateTitle(); }
  else if (st0.stack.length) {
    S.stack = st0.stack;
    st0.stack.forEach((key, i) => stackEl.appendChild(makePage(key, i)));
    $('#main').setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = 'hidden';
    updateTitle();
  }
  if (st0.era) scrollToEra(st0.era, false);
  setupEdgeSwipe();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
