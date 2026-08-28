'use strict';

/* =========================================================
   AaryanOS — Core Script
   Sections: App Registry | Window Manager | Taskbar/Start
             | Clock | Apps (Explorer, Terminal, Settings,
             Calculator, Editor, Browser)
   ========================================================= */

/* ---------- App Registry ---------- */
const APPS = {
  explorer:   { name: 'File Explorer', icon: 'fa-regular fa-folder-open', accent: 'explorer',   pinned: true  },
  terminal:   { name: 'Terminal',      icon: 'fa-solid fa-terminal',      accent: 'terminal',    pinned: true  },
  browser:    { name: 'Browser',       icon: 'fa-solid fa-compass',       accent: 'browser',     pinned: true  },
  settings:   { name: 'Settings',      icon: 'fa-solid fa-sliders',       accent: 'settings',    pinned: true  },
  calculator: { name: 'Calculator',    icon: 'fa-solid fa-calculator',    accent: 'calculator',  pinned: false },
  editor:     { name: 'Text Editor',   icon: 'fa-regular fa-file-lines',  accent: 'editor',      pinned: false },
};

/* ---------- Window Manager ---------- */
const WindowManager = (() => {
  const layer = document.getElementById('window-layer');
  const runningApps = document.getElementById('running-apps');
  let zTop = 100;
  let openWindows = {};   // appId -> window element
  let offsetStep = 0;

  function createTaskbarTab(appId){
    const btn = document.createElement('button');
    btn.className = 'taskbar-app running active';
    btn.dataset.app = appId;
    btn.innerHTML = `<i class="${APPS[appId].icon}"></i><span class="app-label">${APPS[appId].name}</span>`;
    btn.addEventListener('click', () => {
      const win = openWindows[appId];
      if (!win) return;
      if (win.classList.contains('minimized')) {
        restoreWindow(appId);
      } else if (win.dataset.focused === 'true') {
        minimizeWindow(appId);
      } else {
        focusWindow(appId);
      }
    });
    runningApps.appendChild(btn);
    return btn;
  }

  function setActiveTab(appId){
    runningApps.querySelectorAll('.taskbar-app').forEach(el => {
      el.classList.toggle('active', el.dataset.app === appId);
    });
  }

  function focusWindow(appId){
    const win = openWindows[appId];
    if (!win) return;
    zTop += 1;
    win.style.zIndex = zTop;
    document.querySelectorAll('.os-window').forEach(w => w.dataset.focused = 'false');
    win.dataset.focused = 'true';
    setActiveTab(appId);
  }

  function minimizeWindow(appId){
    const win = openWindows[appId];
    if (!win) return;
    win.classList.add('minimized');
    win.dataset.focused = 'false';
    setActiveTab(null);
  }

  function restoreWindow(appId){
    const win = openWindows[appId];
    if (!win) return;
    win.classList.remove('minimized');
    focusWindow(appId);
  }

  function toggleMaximize(appId){
    const win = openWindows[appId];
    if (!win) return;
    win.classList.toggle('maximized');
    focusWindow(appId);
  }

  function closeWindow(appId){
    const win = openWindows[appId];
    if (!win) return;
    win.classList.add('closing');
    setTimeout(() => {
      win.remove();
      delete openWindows[appId];
      const tab = runningApps.querySelector(`.taskbar-app[data-app="${appId}"]`);
      if (tab) tab.remove();
    }, 160);
  }

  function makeDraggable(win, handle){
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-btn')) return;
      if (win.classList.contains('maximized')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = win.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      focusWindowByEl(win);
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = Math.max(0, startTop + dy);
      win.style.left = newLeft + 'px';
      win.style.top = newTop + 'px';
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      document.body.style.userSelect = '';
    });
  }

  function focusWindowByEl(win){
    const appId = win.dataset.app;
    focusWindow(appId);
  }

  function openApp(appId){
    if (openWindows[appId]) {
      restoreWindow(appId);
      return openWindows[appId];
    }

    const app = APPS[appId];
    const win = document.createElement('div');
    win.className = 'os-window';
    win.dataset.app = appId;
    offsetStep = (offsetStep + 1) % 6;
    const baseLeft = 120 + offsetStep * 28;
    const baseTop = 70 + offsetStep * 24;
    win.style.left = baseLeft + 'px';
    win.style.top = baseTop + 'px';
    win.style.width = (appId === 'calculator') ? '320px' : '620px';
    win.style.height = (appId === 'calculator') ? '460px' : '440px';

    win.innerHTML = `
      <div class="win-titlebar">
        <div class="win-title"><i class="${app.icon}"></i><span>${app.name}</span></div>
        <div class="win-controls">
          <button class="win-btn win-min" title="Minimize"><i class="fa-solid fa-minus"></i></button>
          <button class="win-btn win-max" title="Maximize"><i class="fa-regular fa-square"></i></button>
          <button class="win-btn win-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="win-accent accent-${app.accent}"></div>
      <div class="win-body"></div>
    `;

    layer.appendChild(win);
    openWindows[appId] = win;

    const body = win.querySelector('.win-body');
    AppBuilders[appId] && AppBuilders[appId](body);

    win.querySelector('.win-min').addEventListener('click', () => minimizeWindow(appId));
    win.querySelector('.win-max').addEventListener('click', () => toggleMaximize(appId));
    win.querySelector('.win-close').addEventListener('click', () => closeWindow(appId));
    win.querySelector('.win-titlebar').addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-btn')) return;
      toggleMaximize(appId);
    });
    win.addEventListener('mousedown', () => focusWindow(appId));
    makeDraggable(win, win.querySelector('.win-titlebar'));

    createTaskbarTab(appId);
    focusWindow(appId);
    return win;
  }

  return { openApp, closeWindow, minimizeWindow, restoreWindow, focusWindow, toggleMaximize };
})();

/* ---------- Desktop Icons ---------- */
document.querySelectorAll('.desktop-icon').forEach(icon => {
  const openIt = () => WindowManager.openApp(icon.dataset.app);
  icon.addEventListener('dblclick', openIt);
  icon.addEventListener('keydown', (e) => { if (e.key === 'Enter') openIt(); });
});

/* ---------- Taskbar: Pinned Apps ---------- */
(function buildPinnedApps(){
  const container = document.getElementById('pinned-apps');
  Object.entries(APPS).forEach(([id, app]) => {
    if (!app.pinned) return;
    const btn = document.createElement('button');
    btn.className = 'taskbar-btn';
    btn.title = app.name;
    btn.innerHTML = `<i class="${app.icon}"></i>`;
    btn.addEventListener('click', () => WindowManager.openApp(id));
    container.appendChild(btn);
  });
})();

/* ---------- Start Menu ---------- */
(function initStartMenu(){
  const startMenu = document.getElementById('start-menu');
  const startBtn = document.getElementById('start-btn');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('start-search-input');
  const grid = document.getElementById('start-app-grid');
  const powerBtn = document.getElementById('power-btn');

  Object.entries(APPS).forEach(([id, app]) => {
    const el = document.createElement('div');
    el.className = 'start-app';
    el.dataset.app = id;
    el.innerHTML = `<div class="icon-glyph"><i class="${app.icon}"></i></div><span>${app.name}</span>`;
    el.addEventListener('click', () => {
      WindowManager.openApp(id);
      closeMenu();
    });
    grid.appendChild(el);
  });

  function openMenu(){
    startMenu.classList.remove('hidden');
    searchInput.value = '';
    filterApps('');
    searchInput.focus();
  }
  function closeMenu(){ startMenu.classList.add('hidden'); }
  function toggleMenu(){ startMenu.classList.contains('hidden') ? openMenu() : closeMenu(); }

  function filterApps(query){
    const q = query.trim().toLowerCase();
    grid.querySelectorAll('.start-app').forEach(el => {
      const name = el.querySelector('span').textContent.toLowerCase();
      el.classList.toggle('hidden-by-search', q && !name.includes(q));
    });
  }

  startBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
  searchBtn.addEventListener('click', (e) => { e.stopPropagation(); openMenu(); });
  searchInput.addEventListener('input', () => filterApps(searchInput.value));
  document.addEventListener('click', (e) => {
    if (!startMenu.classList.contains('hidden') && !startMenu.contains(e.target) && e.target !== startBtn) {
      closeMenu();
    }
  });
  powerBtn.addEventListener('click', () => {
    document.getElementById('boot-screen').style.animation = 'none';
    document.getElementById('boot-screen').style.opacity = '1';
    document.getElementById('boot-screen').style.visibility = 'visible';
    setTimeout(() => location.reload(), 700);
  });
})();

/* ---------- Clock ---------- */
(function initClock(){
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  function tick(){
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    timeEl.textContent = `${h}:${m} ${ampm}`;
    dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  tick();
  setInterval(tick, 1000 * 10);
})();

/* =========================================================
   APP BUILDERS
   ========================================================= */
const AppBuilders = {};

/* ---------- File Explorer ---------- */
const FILE_SYSTEM = {
  home: [
    { name: 'Desktop', type: 'folder', target: 'desktop' },
    { name: 'Documents', type: 'folder', target: 'documents' },
    { name: 'Downloads', type: 'folder', target: 'downloads' },
    { name: 'readme.txt', type: 'file' },
  ],
  desktop: [
    { name: 'File Explorer.lnk', type: 'file' },
    { name: 'Terminal.lnk', type: 'file' },
  ],
  documents: [
    { name: 'Project Notes.txt', type: 'file' },
    { name: 'Budget.xlsx', type: 'file' },
    { name: 'Resume.docx', type: 'file' },
  ],
  downloads: [
    { name: 'aaryanos-wallpaper.png', type: 'file' },
    { name: 'setup.exe', type: 'file' },
  ],
};

AppBuilders.explorer = function(body){
  body.innerHTML = document.getElementById('tpl-explorer').innerHTML;
  const navItems = body.querySelectorAll('.explorer-nav-item');
  const grid = body.querySelector('.explorer-grid');
  const pathEl = body.querySelector('.explorer-path');
  const backBtn = body.querySelector('.explorer-back');
  let history = ['home'];

  function render(folder){
    grid.innerHTML = '';
    (FILE_SYSTEM[folder] || []).forEach(item => {
      const el = document.createElement('div');
      el.className = 'explorer-item';
      const icon = item.type === 'folder' ? 'fa-solid fa-folder' : fileIcon(item.name);
      el.innerHTML = `<div class="icon-glyph"><i class="${icon}"></i></div><span>${item.name}</span>`;
      if (item.type === 'folder') {
        el.addEventListener('dblclick', () => navigate(item.target));
      }
      grid.appendChild(el);
    });
    pathEl.textContent = 'This PC > ' + folder.charAt(0).toUpperCase() + folder.slice(1);
    navItems.forEach(n => n.classList.toggle('active', n.dataset.folder === folder));
  }

  function fileIcon(name){
    if (name.endsWith('.txt')) return 'fa-regular fa-file-lines';
    if (name.endsWith('.xlsx')) return 'fa-regular fa-file-excel';
    if (name.endsWith('.docx')) return 'fa-regular fa-file-word';
    if (name.endsWith('.png')) return 'fa-regular fa-file-image';
    if (name.endsWith('.exe')) return 'fa-solid fa-gear';
    if (name.endsWith('.lnk')) return 'fa-solid fa-arrow-up-right-from-square';
    return 'fa-regular fa-file';
  }

  function navigate(folder){
    history.push(folder);
    render(folder);
  }

  navItems.forEach(n => n.addEventListener('click', () => navigate(n.dataset.folder)));
  backBtn.addEventListener('click', () => {
    if (history.length > 1) { history.pop(); render(history[history.length - 1]); }
  });

  render('home');
};

/* ---------- Terminal ---------- */
AppBuilders.terminal = function(body){
  body.innerHTML = document.getElementById('tpl-terminal').innerHTML;
  const output = body.querySelector('.terminal-output');
  const input = body.querySelector('.terminal-input');

  function println(text, cls){
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  println('AaryanOS Terminal');
  println('Type "help" for available commands.');
  println('');

  const commands = {
    help: () => [
      'Available commands:',
      '  help      Show this help message',
      '  clear     Clear the terminal',
      '  about     About AaryanOS',
      '  version   Show OS version',
      '  date      Show current date',
      '  time      Show current time',
      '  ls        List files in current directory',
      '  whoami    Show current user',
      '  echo ...  Print text',
    ].join('\n'),
    clear: () => { output.innerHTML = ''; return null; },
    about: () => 'AaryanOS — a premium web-based operating system simulation, built with HTML, CSS and vanilla JavaScript.',
    version: () => 'AaryanOS v0.1 (Alpha) — Simulation Build',
    date: () => new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: () => new Date().toLocaleTimeString(),
    ls: () => (FILE_SYSTEM.home || []).map(f => f.name).join('   '),
    whoami: () => 'aaryan',
  };

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const raw = input.value;
    const trimmed = raw.trim();
    println('aaryan@aaryanos:~$ ' + raw, 't-cmd');
    input.value = '';
    if (!trimmed) return;

    const [cmd, ...rest] = trimmed.split(' ');
    if (cmd === 'echo') {
      println(rest.join(' '));
    } else if (commands[cmd]) {
      const result = commands[cmd](rest);
      if (result) println(result);
    } else {
      println(`Command not found: ${cmd}. Type "help" for available commands.`, 't-err');
    }
  });

  body.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 50);
};

/* ---------- Settings ---------- */
const WALLPAPERS = ['aurora', 'ember', 'mono', 'citrus'];

AppBuilders.settings = function(body){
  body.innerHTML = document.getElementById('tpl-settings').innerHTML;
  const navItems = body.querySelectorAll('.settings-nav-item');
  const panes = body.querySelectorAll('.settings-pane');
  const themeOpts = body.querySelectorAll('.theme-opt');
  const wpGrid = body.querySelector('.wallpaper-grid');

  navItems.forEach(nav => nav.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    nav.classList.add('active');
    panes.forEach(p => p.classList.toggle('hidden', p.dataset.pane !== nav.dataset.pane));
  }));

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  themeOpts.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    btn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', btn.dataset.theme);
      themeOpts.forEach(b => b.classList.toggle('active', b === btn));
      localStorage.setItem('aaryanos-theme', btn.dataset.theme);
    });
  });

  const wallpaperEl = document.getElementById('wallpaper');
  const currentWp = localStorage.getItem('aaryanos-wallpaper') || 'aurora';
  WALLPAPERS.forEach(wp => {
    const sw = document.createElement('div');
    sw.className = 'wp-swatch wp-' + wp;
    sw.classList.toggle('active', wp === currentWp);
    sw.title = wp.charAt(0).toUpperCase() + wp.slice(1);
    sw.addEventListener('click', () => {
      wallpaperEl.className = 'wp-' + wp;
      localStorage.setItem('aaryanos-wallpaper', wp);
      wpGrid.querySelectorAll('.wp-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
    wpGrid.appendChild(sw);
  });
};

/* Apply saved theme & wallpaper at boot */
(function applySavedPrefs(){
  const theme = localStorage.getItem('aaryanos-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const wp = localStorage.getItem('aaryanos-wallpaper') || 'aurora';
  document.getElementById('wallpaper').className = 'wp-' + wp;
})();

/* ---------- Calculator ---------- */
AppBuilders.calculator = function(body){
  body.innerHTML = document.getElementById('tpl-calculator').innerHTML;
  const exprEl = body.querySelector('#calc-expr');
  const resultEl = body.querySelector('#calc-result');
  const buttons = body.querySelectorAll('.calc-btn');

  let current = '0';
  let previous = null;
  let operator = null;
  let justEvaluated = false;

  function updateDisplay(){
    resultEl.textContent = current;
    exprEl.textContent = previous !== null ? `${previous} ${operatorSymbol(operator)}` : '';
  }
  function operatorSymbol(op){
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || '';
  }
  function inputDigit(d){
    if (justEvaluated) { current = '0'; justEvaluated = false; }
    if (current === '0' && d !== '.') current = d;
    else if (d === '.' && current.includes('.')) return;
    else current += d;
  }
  function chooseOperator(op){
    if (operator && previous !== null && !justEvaluated) evaluate();
    previous = current;
    operator = op;
    justEvaluated = false;
    current = '0';
  }
  function evaluate(){
    if (operator === null || previous === null) return;
    const a = parseFloat(previous);
    const b = parseFloat(current);
    let result = 0;
    switch (operator) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? NaN : a / b; break;
    }
    current = Number.isNaN(result) ? 'Error' : trimNumber(result);
    previous = null;
    operator = null;
    justEvaluated = true;
  }
  function trimNumber(n){
    return parseFloat(n.toFixed(10)).toString();
  }

  buttons.forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    if (/^[0-9]$/.test(key) || key === '.') { inputDigit(key); }
    else if (['+', '-', '*', '/'].includes(key)) { chooseOperator(key); }
    else if (key === '=') { evaluate(); }
    else if (key === 'clear') { current = '0'; previous = null; operator = null; justEvaluated = false; }
    else if (key === 'sign') { current = trimNumber(parseFloat(current) * -1); }
    else if (key === 'percent') { current = trimNumber(parseFloat(current) / 100); }
    updateDisplay();
  }));

  body.tabIndex = 0;
  body.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
    else if (e.key === '.') inputDigit('.');
    else if (['+', '-', '*', '/'].includes(e.key)) chooseOperator(e.key);
    else if (e.key === 'Enter' || e.key === '=') evaluate();
    else if (e.key === 'Backspace') current = current.length > 1 ? current.slice(0, -1) : '0';
    else if (e.key === 'Escape') { current = '0'; previous = null; operator = null; }
    updateDisplay();
  });

  updateDisplay();
};

/* ---------- Text Editor ---------- */
AppBuilders.editor = function(body){
  body.innerHTML = document.getElementById('tpl-editor').innerHTML;
  const textarea = body.querySelector('.editor-textarea');
  const status = body.querySelector('[data-status]');
  const STORAGE_KEY = 'aaryanos-editor-content';

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { textarea.value = saved; status.textContent = 'Loaded saved file'; }

  body.querySelectorAll('.editor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'new' || action === 'clear') {
        textarea.value = '';
        status.textContent = action === 'new' ? 'New file' : 'Cleared';
        textarea.focus();
      } else if (action === 'save') {
        localStorage.setItem(STORAGE_KEY, textarea.value);
        status.textContent = 'Saved';
      } else if (action === 'open') {
        const content = localStorage.getItem(STORAGE_KEY);
        textarea.value = content || '';
        status.textContent = content ? 'Opened saved file' : 'No saved file found';
      }
      setTimeout(() => { if (status.textContent !== '') status.textContent = ''; }, 2500);
    });
  });
};

/* ---------- Browser ---------- */
const BROWSER_PAGES = {
  'aaryan://start': {
    title: 'AaryanOS Start Page',
    html: `<h1>AaryanOS Browser</h1><p>A simulated browser for demo pages within AaryanOS.</p>
           <p>Try visiting: <b>aaryan://about</b> or <b>aaryan://apps</b></p>`,
  },
  'aaryan://about': {
    title: 'About',
    html: `<h1>About AaryanOS</h1><p>AaryanOS is a browser-based desktop operating system simulation built entirely with HTML, CSS and vanilla JavaScript. It is not a real, bootable operating system.</p>`,
  },
  'aaryan://apps': {
    title: 'Apps',
    html: `<h1>Built-in Apps</h1><p>File Explorer, Terminal, Settings, Calculator, Text Editor, and this Browser — all running inside draggable, resizable windows.</p>`,
  },
};

AppBuilders.browser = function(body){
  body.innerHTML = document.getElementById('tpl-browser').innerHTML;
  const page = body.querySelector('.browser-page');
  const addressInput = body.querySelector('.browser-address-input');
  const backBtn = body.querySelector('[data-action="back"]');
  const fwdBtn = body.querySelector('[data-action="forward"]');
  const refreshBtn = body.querySelector('[data-action="refresh"]');

  let history = ['aaryan://start'];
  let index = 0;

  function render(){
    const url = history[index];
    const pageData = BROWSER_PAGES[url] || {
      title: 'Not Found',
      html: `<h1>Page not available</h1><p>"${url}" cannot be reached in this simulation. Try aaryan://start.</p>`,
    };
    page.innerHTML = pageData.html;
    addressInput.value = url;
    backBtn.disabled = index === 0;
    fwdBtn.disabled = index === history.length - 1;
  }

  function go(url){
    history = history.slice(0, index + 1);
    history.push(url);
    index = history.length - 1;
    render();
  }

  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go(addressInput.value.trim());
  });
  backBtn.addEventListener('click', () => { if (index > 0) { index--; render(); } });
  fwdBtn.addEventListener('click', () => { if (index < history.length - 1) { index++; render(); } });
  refreshBtn.addEventListener('click', render);

  render();
};