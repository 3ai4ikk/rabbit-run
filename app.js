(() => {
  'use strict';
  const platforms = {
    twitch: { field: 'twitchPoints', name: 'Twitch', unit: 'б.' },
    donation: { field: 'donationRub', name: 'DonationAlerts', unit: '₽' },
    tiktok: { field: 'tiktokCoins', name: 'TikTok', unit: 'мон.' }
  };
  const events = window.RABBITRUN_EVENTS;
  const number = new Intl.NumberFormat('ru-RU');
  const collator = new Intl.Collator('ru');
  const params = new URLSearchParams(location.search);
  let platform = Object.hasOwn(platforms, params.get('platform')) ? params.get('platform') : 'donation';
  let descending = params.get('order') === 'desc';
  let query = (params.get('q') || '').slice(0, 200);
  const body = document.getElementById('events-body');
  const search = document.getElementById('search');
  const normalize = text => text.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
  const plural = (value, one, few, many) => value % 10 === 1 && value % 100 !== 11 ? one : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14) ? few : many;
  const duration = event => {
    if (event.durationSeconds) return event.durationSeconds % 60 === 0 ? `${event.durationSeconds / 60} мин` : `${event.durationSeconds} сек`;
    const id = event.action.replace('minecraft:', '');
    if (['minus_heart', 'plus_heart', 'no_debug'].includes(id)) return 'Навсегда';
    if (['boss', 'stomper'].includes(id)) return 'До победы';
    if (id === 'backrooms') return 'До выхода';
    if (['minesweeper', 'captcha'].includes(id)) return 'До решения';
    if (id === 'runaway_tools') return 'До поимки';
    return 'Разово';
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const row = event => {
    const tr = element('tr');
    tr.dataset.event = event.action;
    const cell = element('td', 'event');
    const title = element('div', 'event-title-line');
    title.append(element('span', 'event-title', event.title), element('span', 'duration', duration(event)));
    cell.append(title, element('p', 'event-description', event.description));
    tr.append(cell);
    for (const [key, config] of Object.entries(platforms)) {
      const price = element('td', `price${key === platform ? ' selected-price' : ''}`);
      price.dataset.label = config.name;
      price.dataset.platform = key;
      const value = element('span', 'price-value', number.format(event[config.field]));
      value.append(element('span', 'price-unit', config.unit));
      price.append(value);
      if (key === 'twitch' && platform === 'twitch' && event.twitchCooldownSeconds > 0) {
        const minutes = event.twitchCooldownSeconds / 60;
        price.append(element('span', 'cooldown', `откат ${Number.isInteger(minutes) ? `${minutes} мин` : `${event.twitchCooldownSeconds} сек`}`));
      }
      tr.append(price);
    }
    return tr;
  };
  function render() {
    document.body.dataset.platform = platform;
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const filtered = events.filter(event => words.every(word => normalize(`${event.title} ${event.description}`).includes(word)));
    const field = platforms[platform].field;
    filtered.sort((a, b) => (descending ? -1 : 1) * (a[field] - b[field]) || collator.compare(a.title, b.title));
    const fragment = document.createDocumentFragment();
    filtered.forEach(event => fragment.append(row(event)));
    body.replaceChildren(fragment);
    document.getElementById('empty').hidden = filtered.length !== 0;
    document.getElementById('events-table').hidden = filtered.length === 0;
    document.getElementById('result-count').textContent = `${filtered.length}${query ? ` из ${events.length}` : ''} ${plural(query ? events.length : filtered.length, 'событие', 'события', 'событий')}`;
    const text = `От ${descending ? 'большей' : 'меньшей'} цены ${platforms[platform].name} к ${descending ? 'меньшей' : 'большей'}`;
    const hint = document.getElementById('sort-hint');
    hint.replaceChildren(document.createTextNode(`${text} `), element('span', '', descending ? '↑' : '↓'));
    document.querySelectorAll('[data-platform].platform').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)));
    document.querySelectorAll('th[data-column]').forEach(header => {
      const selected = header.dataset.column === platform;
      header.setAttribute('aria-sort', selected ? descending ? 'descending' : 'ascending' : 'none');
      header.classList.toggle('selected-price', selected);
      header.querySelector('.sort-arrow').textContent = selected ? descending ? '↑' : '↓' : '↕';
      header.querySelector('button').setAttribute('aria-label', `Сортировать по цене ${platforms[header.dataset.column].name}${selected && !descending ? ' от большей к меньшей' : ' от меньшей к большей'}`);
    });
    document.getElementById('announcement').textContent = `${filtered.length} ${plural(filtered.length, 'событие', 'события', 'событий')}. ${text}.`;
    const url = new URL(location.href);
    url.searchParams.set('platform', platform);
    if (descending) url.searchParams.set('order', 'desc'); else url.searchParams.delete('order');
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    // Local file previews can disallow history updates. Catalog controls still work.
    try { history.replaceState(null, '', url); } catch { /* file:// browser restriction */ }
  }
  if (!Array.isArray(events) || events.length === 0 || events.some(event => !event.title || !event.description || Object.values(platforms).some(config => !Number.isSafeInteger(event[config.field]) || event[config.field] <= 0))) {
    document.getElementById('empty').hidden = false;
    document.querySelector('#empty h3').textContent = 'Каталог не загрузился';
    document.querySelector('#empty p').textContent = 'Обновите страницу. Если ошибка повторится, сообщите стримеру.';
    document.getElementById('reset-search').hidden = true;
    document.getElementById('events-table').hidden = true;
    search.disabled = true;
    document.querySelectorAll('.platform').forEach(button => { button.disabled = true; });
    return;
  }
  search.value = query;
  search.addEventListener('input', () => { query = search.value; render(); });
  document.getElementById('reset-search').addEventListener('click', () => { search.value = ''; query = ''; render(); search.focus(); });
  document.querySelectorAll('.platform').forEach(button => button.addEventListener('click', () => { platform = button.dataset.platform; descending = false; render(); }));
  document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => { descending = platform === button.dataset.sort ? !descending : false; platform = button.dataset.sort; render(); }));
  if ('ResizeObserver' in window) new ResizeObserver(entries => document.documentElement.style.setProperty('--toolbar-height', `${entries[0].target.getBoundingClientRect().height}px`)).observe(document.querySelector('.toolbar'));
  render();
})();
