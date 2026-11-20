'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  /* ================== ХРАНИЛИЩЕ ================== */

  const DEFAULTS = {
    ukMorning: 1.0,
    ukDay: 0.8,
    ukEvening: 1.2,
    icf: 3.0,
    target: 5.5,
    heGrams: 12,
    operatorName: 'Оператор',
    archiveCode: '2111',
    polymer: 0,
    directives: [],
    customFoods: [],
    tiles: null,
    injections: [],
    sound: true,
    calc: { carbs: '', he: '', glucose: '' }
  };

  const LS_KEY = 'p3826_profile_v1';
  const DIA_HOURS = 4;

  let profile = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const saved = JSON.parse(raw);
      if (saved.archiveCode === '1608' || saved.archiveCode === 1608) saved.archiveCode = '2111';
      const p = Object.assign(structuredClone(DEFAULTS), saved);
      p.calc = Object.assign({}, DEFAULTS.calc, saved.calc || {});
      return p;
    } catch (e) {
      return structuredClone(DEFAULTS);
    }
  }

  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(profile));
    } catch (e) { /* приватный режим браузера — работаем без сохранения */ }
  }

  /* ================== ЗВУКОВОЙ ДВИЖОК (Web Audio API) ================== */

  let audioCtx = null;

  function ctx() {
    if (!profile.sound) return null;
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type, gainVal, whenOffset) {
    const a = ctx();
    if (!a) return;
    const t0 = a.currentTime + (whenOffset || 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainVal || 0.08, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const Sfx = {
    click()  { tone(1800, 0.04, 'square', 0.05); },
    toggle() { tone(600, 0.05, 'square', 0.07); tone(1200, 0.06, 'square', 0.06, 0.05); },
    add()    { tone(880, 0.06, 'triangle', 0.09); },
    scan()   { tone(1400, 0.09, 'sine', 0.09); tone(1400, 0.09, 'sine', 0.09, 0.14); },
    inject() { tone(140, 0.16, 'sawtooth', 0.12); tone(90, 0.22, 'sine', 0.14, 0.1); },
    xp()     { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.1, 'triangle', 0.1, i * 0.07)); },
    deny()   { tone(220, 0.2, 'sawtooth', 0.1); tone(180, 0.3, 'sawtooth', 0.1, 0.15); },
    unlock() { [392, 523, 784, 1046, 1318].forEach((f, i) => tone(f, 0.14, 'square', 0.08, i * 0.09)); }
  };

  document.addEventListener('pointerdown', () => ctx(), { once: true });

  /* ================== СТАТУС-БАР ХРАЗ ================== */

  const STATUS_LINES = [
    'Нейросеть: стабильна',
    'Связь с Коллективом: 100%',
    'Полимер: проходит тест. Не нюхать,',
    'Робот-лучик: поливает цветы на 3-м этаже',
    'Физалис: паботайте, товарищи',
    'Модератор: следит за вами. Все под контролем.',
    'Кофемашина: заклинило. Опять.',
    'Мутация мух: +3 шт. за смену',
    'Балагур: поёт. Соседи жалуются.',
    'Геотермальный контур: в норме',
    'Элеонора: улыбается. Причина не установлена.',
    'Совет директоров: совещание перенесено в 25-й час',
    'Станция «Комплекс 3826»: эфир чист',
    'Плесень в столовой: подавлена огнемётом',
    'Тёплые носки: выданы, производительность +4%',
    'Архив ВЧД: пятничный урон учтён'
  ];

  function tickClock() {
    const d = new Date();
    $('clock').textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join(':');
  }

  let statusIdx = -1;
  function rotateStatus() {
    statusIdx = (statusIdx + 1) % STATUS_LINES.length;
    $('statusText').textContent = STATUS_LINES[statusIdx];
  }

  /* ================== РАНГИ И ПОЛИМЕРЫ ================== */

  const RANKS = [
    { at: 0,   name: 'Стажер 3826' },
    { at: 30,  name: 'Лаборант' },
    { at: 80,  name: 'Техник-полимерщик' },
    { at: 150, name: 'Инженер' },
    { at: 250, name: 'Старший инженер' },
    { at: 400, name: 'Начальник смены' },
    { at: 600, name: 'Главный конструктор' },
    { at: 900, name: 'Майор Нечаев' }
  ];

  function rankFor(pts) {
    let r = RANKS[0];
    for (const item of RANKS) if (pts >= item.at) r = item;
    return r;
  }

  function renderRank() {
    const pts = profile.polymer;
    const cur = rankFor(pts);
    const idx = RANKS.indexOf(cur);
    const next = RANKS[idx + 1];
    $('rankName').textContent = cur.name;
    $('rankLevel').textContent = 'УР. ' + (idx + 1);
    $('xpCount').textContent = pts + ' ⬢';
    if (next) {
      const span = next.at - cur.at;
      $('xpFill').style.width = Math.round(((pts - cur.at) / span) * 100) + '%';
    } else {
      $('xpFill').style.width = '100%';
    }
  }

  function grantPolymer(n, why) {
    const before = profile.polymer;
    profile.polymer += n;
    const crossed = RANKS.some((r) => before < r.at && profile.polymer >= r.at && r.at > 0);
    renderRank();
    persist();
    if (crossed) {
      Sfx.unlock();
      showToast('⬢ НОВЫЙ РАНГ: ' + rankFor(profile.polymer).name + ' — Завод гордится вами');
    } else {
      Sfx.xp();
      showToast('+' + n + ' ⬢' + (why ? ' — ' + why : ''));
    }
  }

  /* ================== ЕДА ================== */

  const BASE_FOODS = [
    { name: 'Шаурма', carbs: 60 },
    { name: 'Пельмени', carbs: 45 },
    { name: 'Пицца 2 куска', carbs: 60 },
    { name: 'Бутерброд', carbs: 30 },
    { name: 'Чипсы 40 г', carbs: 22 },
    { name: 'Кола Зеро', carbs: 0 },
    { name: 'Энергетик', carbs: 28 },
    { name: 'Бургер', carbs: 48 },
    { name: 'Макароны', carbs: 70 },
    { name: 'Шоколад', carbs: 50 },
    { name: 'Сахар 1 кусок', carbs: 4 },
    { name: 'Вафли 3 шт', carbs: 33 }
  ];

  function allFoods() {
    return BASE_FOODS.concat(profile.customFoods);
  }

  function renderFoods() {
    const grid = $('foodGrid');
    grid.innerHTML = '';
    allFoods().forEach((f, i) => {
      const isCustom = i >= BASE_FOODS.length;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'food-card' + (isCustom ? ' custom' : '');
      const name = document.createElement('span');
      name.className = 'f-name';
      name.textContent = f.name;
      const carbs = document.createElement('span');
      carbs.className = 'f-carbs';
      const num = document.createElement('b');
      num.textContent = f.carbs;
      const unit = document.createElement('small');
      unit.textContent = 'угл., г';
      carbs.append(num, unit);
      card.append(name, carbs);
      if (isCustom) {
        const del = document.createElement('span');
        del.className = 'f-del';
        del.title = 'Удалить';
        del.textContent = '✕';
        card.appendChild(del);
      }
      card.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('f-del')) {
          profile.customFoods.splice(i - BASE_FOODS.length, 1);
          persist();
          renderFoods();
          Sfx.deny();
          return;
        }
        addToCarbs(f.carbs);
        Sfx.add();
        showToast('В расчёт добавлено: ' + f.name + ' (' + f.carbs + ' г)');
      });
      grid.appendChild(card);
    });
  }

  function addToCarbs(g) {
    const cur = parseFloat($('carbInput').value) || 0;
    setCarbs(Math.round((cur + g) * 10) / 10);
  }

  function setCarbs(g) {
    $('carbInput').value = g || '';
    profile.calc.carbs = $('carbInput').value;
    syncHeFromCarbs();
    persist();
    calcDose(true);
  }

  function syncHeFromCarbs() {
    const g = parseFloat($('carbInput').value) || 0;
    const he = profile.heGrams > 0 ? Math.round((g / profile.heGrams) * 100) / 100 : 0;
    $('heInput').value = he || '';
    profile.calc.he = $('heInput').value;
  }

  /* ================== КАЛЬКУЛЯТОР ================== */

  const PERIOD_FIELD = { morning: 'ukMorning', day: 'ukDay', evening: 'ukEvening' };

  function currentPeriod() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'day';
    return 'evening';
  }

  function periodLabel(p) {
    return p === 'morning' ? 'УТРО' : p === 'day' ? 'ДЕНЬ' : 'ВЕЧЕР';
  }

  function calcDose(announce, fromTimeout) {
    const g = parseFloat($('carbInput').value) || 0;
    const he = profile.heGrams > 0 ? g / profile.heGrams : 0;
    const gluRaw = $('glucoseInput').value.trim();
    const glu = parseFloat(gluRaw);
    const period = currentPeriod();
    const uk = parseFloat(profile[PERIOD_FIELD[period]]) || 0;
    const ioB = iobTotal();

    if (fromTimeout !== true) updateGlucoseHint(glu, ioB);

    if (!g && !gluRaw) {
      $('verdictDose').textContent = '—.—';
      $('verdictBreakdown').innerHTML = 'Загрузите еду или введите сахар, товарищ';
      return;
    }

    if (gluRaw && !isNaN(glu) && glu < 3.9) {
      $('verdictDose').textContent = 'ХОЛОД';
      $('verdictBreakdown').innerHTML =
        '<b style="color:#ff6b5e">ГИПО: ' + glu.toFixed(1) + ' ммоль/л</b> — быстрый сахар НЕМЕДЛЕННО (правило 15/15: 15 г быстрых углеводов, через 15 мин контроль), потом пересчитать.';
      return;
    }

    const doseFood = he * uk;
    const doseCorr = gluRaw && !isNaN(glu) && glu > profile.target
      ? (glu - profile.target) / (profile.icf || 3)
      : 0;
    const total = Math.max(0, doseFood + doseCorr);
    const totalRounded = Math.round(total * 10) / 10;

    $('verdictDose').textContent = totalRounded.toFixed(1);
    $('verdictUnit').textContent = 'ЕД ИНСУЛИНА';

    const parts = [];
    parts.push('УК ' + periodLabel(period) + ': ' + uk.toFixed(2) + ' ЕД/ХЕ');
    if (doseFood > 0) parts.push('на еду: <b>' + doseFood.toFixed(2) + ' ЕД</b> (' + he.toFixed(2) + ' ХЕ)');
    if (doseCorr > 0) parts.push('на снижение: <b>+' + doseCorr.toFixed(2) + ' ЕД</b> (' + glu.toFixed(1) + ' → ' + profile.target + ')');
    if (ioB > 0.05) parts.push('уже активно: <b>' + ioB.toFixed(1) + ' ЕД</b>');
    $('verdictBreakdown').innerHTML = parts.join(' · ');

    if (announce && !fromTimeout) {
      const vd = $('verdictDose');
      vd.classList.remove('flash');
      void vd.offsetWidth;
      vd.classList.add('flash');
      Sfx.scan();
    }
  }

  function updateGlucoseHint(glu, ioB) {
    const hint = $('glucoseHint');
    hint.className = 'glucose-hint';
    if (isNaN(glu)) { hint.textContent = '—'; return; }
    if (glu < 3.9) { hint.textContent = 'Низкий сахар! Инсулин запрещён.'; hint.classList.add('hypo'); }
    else if (glu <= profile.target + 0.5) { hint.textContent = 'В целевом коридоре. Красота.'; hint.classList.add('ok'); }
    else if (glu < 10) { hint.textContent = 'Немного выше цели — будет коррекция по ФЧИ.'; hint.classList.add('high'); }
    else if (glu < 14) { hint.textContent = 'Высокий сахар. Терминал добавит коррекцию.'; hint.classList.add('hyper'); }
    else { hint.textContent = 'Очень высокий. Пей воду' + (ioB > 0.5 ? ', IOB уже активен!' : '!'); hint.classList.add('hyper'); }
  }

  /* ================== IOB ================== */

  function activeInjections() {
    const now = Date.now();
    const keep = profile.injections.filter((inj) => now - inj.t < DIA_HOURS * 3600000);
    if (keep.length !== profile.injections.length) {
      profile.injections = keep;
      persist();
    }
    return keep;
  }

  function iobTotal() {
    const now = Date.now();
    let total = 0;
    for (const inj of activeInjections()) {
      const elapsedH = (now - inj.t) / 3600000;
      total += inj.dose * Math.max(0, 1 - elapsedH / DIA_HOURS);
    }
    return total;
  }

  function renderIob() {
    const ioB = iobTotal();
    $('iobValue').textContent = ioB.toFixed(1) + ' ЕД';
    const inj = activeInjections();
    if (!inj.length) {
      $('iobTimer').textContent = 'инъекций нет';
      $('iobFill').style.width = '0%';
    } else {
      const end = inj[inj.length - 1].t + DIA_HOURS * 3600000;
      const left = end - Date.now();
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      $('iobTimer').textContent = 'выйдет через ' + h + ':' + String(m).padStart(2, '0');
      const maxDose = inj.reduce((a, i) => Math.max(a, i.dose), 4);
      $('iobFill').style.width = Math.min(100, (ioB / maxDose) * 100) + '%';
    }
    $('iobWarning').hidden = !(ioB > 0.5);
  }

  $('injectBtn').addEventListener('click', () => {
    const dose = parseFloat($('verdictDose').textContent);
    if (isNaN(dose) || dose <= 0) {
      Sfx.deny();
      showToast('Нечего вводить — сначала посчитайте дозу');
      return;
    }
    profile.injections.push({ dose, t: Date.now() });
    persist();
    Sfx.inject();
    showToast('Инъекция ' + dose.toFixed(1) + ' ЕД отмечена · таймер ' + DIA_HOURS + ' ч запущен');
    calcDose(false, true);
    renderIob();
  });

  /* ================== ПЛИТКИ ================== */

  const BASE_TILES = [
    { name: 'YouTube', url: 'https://youtube.com', glyph: '▶' },
    { name: 'Twitch', url: 'https://twitch.tv', glyph: '⬢' },
    { name: 'Discord Web', url: 'https://discord.com/app', glyph: '◆' },
    { name: 'Яндекс Музыка', url: 'https://music.yandex.ru', glyph: '♫' },
    { name: 'Гайды', url: 'https://www.google.com/search?q=прохождение+игр', glyph: '?' }
  ];

  function allTiles() {
    return profile.tiles || BASE_TILES;
  }

  function isCustomTile(t) {
    return !BASE_TILES.some((b) => b.name === t.name && b.url === t.url);
  }

  function renderTiles() {
    const grid = $('tilesGrid');
    grid.innerHTML = '';
    allTiles().forEach((t, i) => {
      const custom = isCustomTile(t);
      const a = document.createElement('a');
      a.className = 'tile' + (custom ? ' custom' : '');
      a.href = t.url;
      a.target = '_blank';
      a.rel = 'noopener';
      const icon = document.createElement('span');
      icon.className = 't-icon';
      icon.textContent = t.glyph || t.name.charAt(0).toUpperCase();
      const label = document.createElement('span');
      label.className = 't-name';
      label.textContent = t.name;
      a.append(icon, label);
      if (custom) {
        const del = document.createElement('span');
        del.className = 't-del';
        del.textContent = '✕';
        del.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          profile.tiles.splice(i, 1);
          persist();
          renderTiles();
          Sfx.deny();
        });
        a.appendChild(del);
      }
      a.addEventListener('click', () => Sfx.click());
      grid.appendChild(a);
    });
  }

  /* ================== ДИРЕКТИВЫ ================== */

  function renderDirectives() {
    const list = $('directiveList');
    list.innerHTML = '';
    let done = 0;
    profile.directives.forEach((d, i) => {
      if (d.done) done++;
      const li = document.createElement('li');
      li.className = 'directive-item' + (d.done ? ' done' : '');
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'd-check';
      check.textContent = '✓';
      const text = document.createElement('span');
      text.className = 'd-text';
      text.textContent = d.text;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'd-del';
      del.textContent = '✕';
      check.addEventListener('click', () => {
        d.done = !d.done;
        persist();
        if (d.done) {
          grantPolymer(10, 'директива выполнена');
        } else {
          Sfx.toggle();
          renderRank();
        }
        renderDirectives();
      });
      del.addEventListener('click', () => {
        profile.directives.splice(i, 1);
        persist();
        renderDirectives();
        Sfx.deny();
      });
      li.append(check, text, del);
      list.appendChild(li);
    });
    $('tasksBadge').textContent = done + ' из ' + profile.directives.length;
  }

  /* ================== СЕКРЕТНЫЙ ПРОТОКОЛ ================== */

  function openCertificate() {
    const name = ($('operatorName').value || 'Оператор').trim();
    $('certBody').innerHTML =
      'Приказываем товарищу <b>' + esc(name) + '</b>:\n\n' +
      '— считать ХЕ до еды, а не после;\n' +
      '— держать сахар ровнее, чем гвозди в тумбочке ХРАЗа;\n' +
      '— чипсы есть ложкой, а не пачкой (рекомендация, не приказ);\n' +
      '— апать ранг, побеждать боссов и не кормить мух.\n\n' +
      'Настоящий приказ даёт право на: торжественное поздравление, ' +
      'уважение Коллектива и <b>сертификат на лицензионную копию игры «ATOMIC HEART»</b> — 1 шт.\n\n' +
      'С праздником, товарищ! Полимер держит, мы — рядом. ★';
    $('archiveModal').hidden = false;
    Sfx.unlock();
  }

  $('archiveBtn').addEventListener('click', () => {
    $('pinInput').value = '';
    $('pinError').hidden = true;
    $('pinModal').hidden = false;
    setTimeout(() => $('pinInput').focus(), 50);
    Sfx.toggle();
  });

  function tryPin() {
    const val = $('pinInput').value.trim();
    const code = String($('archiveCode').value || '2111').trim();
    if (val && val === code) {
      $('pinModal').hidden = true;
      openCertificate();
    } else {
      $('pinError').hidden = false;
      Sfx.deny();
    }
  }

  $('pinSubmit').addEventListener('click', tryPin);
  $('pinInput').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') tryPin(); });
  $('pinCancel').addEventListener('click', () => { $('pinModal').hidden = true; Sfx.click(); });
  $('archiveClose').addEventListener('click', () => { $('archiveModal').hidden = true; Sfx.click(); });
  [$('archiveModal'), $('pinModal')].forEach((m) => m.addEventListener('click', (ev) => {
    if (ev.target === m) m.hidden = true;
  }));

  /* ================== НАСТРОЙКИ ================== */

  $('settingsToggle').addEventListener('click', () => {
    const pane = $('settingsPane');
    pane.hidden = !pane.hidden;
    Sfx.toggle();
  });

  const TEXT_FIELDS = {
    ukMorning: { id: 'ukMorning', num: true },
    ukDay: { id: 'ukDay', num: true },
    ukEvening: { id: 'ukEvening', num: true },
    icf: { id: 'icf', num: true },
    target: { id: 'target', num: true },
    heGrams: { id: 'heGrams', num: true },
    operatorName: { id: 'operatorName', num: false },
    archiveCode: { id: 'archiveCode', num: false }
  };

  function hydrateInputs() {
    for (const [key, cfg] of Object.entries(TEXT_FIELDS)) $(cfg.id).value = profile[key];
    $('carbInput').value = profile.calc.carbs || '';
    $('heInput').value = profile.calc.he || '';
    $('glucoseInput').value = profile.calc.glucose || '';
    syncHeLabel();
  }

  function syncHeLabel() {
    const period = currentPeriod();
    const uk = parseFloat(profile[PERIOD_FIELD[period]]) || 0;
    $('heSync').textContent = '1 ХЕ = ' + profile.heGrams + ' Г · время суток: ' +
      periodLabel(period) + ' · УК = ' + uk.toFixed(2) + ' ЕД/ХЕ';
  }

  $('settingsPane').addEventListener('input', () => {
    for (const [key, cfg] of Object.entries(TEXT_FIELDS)) {
      const v = $(cfg.id).value;
      profile[key] = cfg.num ? (parseFloat(v) || DEFAULTS[key]) : v;
    }
    syncHeFromCarbs();
    persist();
    syncHeLabel();
    calcDose(false, true);
  });

  /* ================== ЭКСПОРТ / ИМПОРТ ================== */

  $('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'predpriyatie-3826-profile.json';
    a.click();
    URL.revokeObjectURL(a.href);
    Sfx.add();
    showToast('Профиль экспортирован в JSON');
  });

  $('importInput').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        const p = Object.assign(structuredClone(DEFAULTS), imported);
        p.calc = Object.assign({}, DEFAULTS.calc, imported.calc || {});
        profile = p;
        persist();
        hydrateInputs();
        renderAll();
        Sfx.unlock();
        showToast('Профиль импортирован');
      } catch (e) {
        Sfx.deny();
        showToast('Ошибка импорта: файл повреждён');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  $('wipeBtn').addEventListener('click', () => {
    if (!confirm('ПОЛНЫЙ СБРОС ТЕРМИНАЛА: задачи, полимеры, коэффициенты, плитки. Огонь по готовности?')) return;
    localStorage.removeItem(LS_KEY);
    profile = structuredClone(DEFAULTS);
    hydrateInputs();
    renderAll();
    Sfx.deny();
    showToast('Терминал сброшен до заводских настроек');
  });

  /* ================== ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ ================== */

  $('carbInput').addEventListener('input', () => {
    profile.calc.carbs = $('carbInput').value;
    syncHeFromCarbs();
    persist();
    calcDose(true);
  });

  $('heInput').addEventListener('input', () => {
    profile.calc.he = $('heInput').value;
    const he = parseFloat($('heInput').value) || 0;
    const g = Math.round(he * profile.heGrams * 10) / 10;
    $('carbInput').value = g || '';
    profile.calc.carbs = $('carbInput').value;
    persist();
    calcDose(true);
  });

  $('glucoseInput').addEventListener('input', () => {
    profile.calc.glucose = $('glucoseInput').value;
    persist();
    calcDose(true);
  });

  $('foodAddForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = $('foodName').value.trim();
    const carbs = parseFloat($('foodCarbs').value);
    if (!name || isNaN(carbs)) return;
    profile.customFoods.push({ name, carbs });
    persist();
    renderFoods();
    $('foodName').value = '';
    $('foodCarbs').value = '';
    Sfx.add();
    showToast('«' + name + '» зачислен в базу продуктов');
  });

  $('tileAddForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = $('tileName').value.trim();
    let url = $('tileUrl').value.trim();
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!profile.tiles) profile.tiles = BASE_TILES.slice();
    profile.tiles.push({ name, url, glyph: name.charAt(0).toUpperCase() });
    persist();
    renderTiles();
    $('tileName').value = '';
    $('tileUrl').value = '';
    Sfx.add();
    showToast('Терминал «' + name + '» подключен');
  });

  $('directiveForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = $('directiveInput').value.trim();
    if (!text) return;
    profile.directives.push({ text, done: false });
    persist();
    renderDirectives();
    $('directiveInput').value = '';
    Sfx.add();
  });

  $('clearDoneBtn').addEventListener('click', () => {
    profile.directives = profile.directives.filter((d) => !d.done);
    persist();
    renderDirectives();
    Sfx.toggle();
    showToast('Выполненные директивы сданы в архив');
  });

  $('soundToggle').addEventListener('click', () => {
    profile.sound = !profile.sound;
    persist();
    renderSound();
    if (profile.sound) Sfx.unlock();
  });

  function renderSound() {
    $('soundToggle').classList.toggle('off', !profile.sound);
    $('soundState').textContent = profile.sound ? 'ЗВУК' : 'ТИХО';
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      $('archiveModal').hidden = true;
      $('pinModal').hidden = true;
    }
  });

  /* ================== УТИЛИТЫ ================== */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ================== ЗАПУСК ================== */

  renderAll();

  tickClock();
  setInterval(tickClock, 1000);
  rotateStatus();
  setInterval(rotateStatus, 8000);

  setInterval(() => {
    renderIob();
    syncHeLabel();
  }, 1000);

  function renderAll() {
    renderRank();
    renderFoods();
    renderTiles();
    renderDirectives();
    renderIob();
    renderSound();
    hydrateInputs();
    calcDose(false, true);
  }
})();
