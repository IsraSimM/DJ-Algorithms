const monoImages = ['mono1.png', 'mono2.png', 'mono3.png', 'mono4.png'];

const state = {
  time: 0,
  running: null,
  queue: [],
  incoming: [],
  completed: [],
  timeline: [],
  algorithm: 'rr',
  quantum: 2,
  multilevelQuantum: { high: 2, mid: 3, low: 4 },
  slice: 0,
  speed: 1,
  timer: null,
  cpuBusy: 0,
  library: [],
  isRunning: false,
  isPaused: false,
  isFinished: false,
  preemptive: false,
  songLimit: 0,
  songLimitEnabled: false,
};

const algoContent = {
  fcfs: {
    title: 'FIFO / FCFS',
    description:
      'Política: primero en llegar, primero en sonar. El DJ atiende estrictamente por orden de llegada.',
    notes: [
      'Estructura que usa: cola FIFO simple.',
      'Decisión: no hay reordenamiento ni interrupciones.',
      'Ventaja: muy fácil de entender y justo en orden de llegada.',
      'Desventaja: una canción larga puede bloquear a las demás (efecto convoy).',
    ],
  },
  sjf: {
    title: 'SJF (Shortest Job First)',
    description:
      'Política: siempre elige la canción con menor duración restante.',
    notes: [
      'Estructura que usa: cola ordenada por duración restante.',
      'Decisión: la más corta va primero; puede reordenarse en cada llegada.',
      'Ventaja: minimiza el tiempo promedio de espera.',
      'Desventaja: canciones largas pueden quedarse “castigadas”.',
      'Preemptivo: se vuelve SRTF; si llega una más corta, la que suena se pausa.',
    ],
  },
  rr: {
    title: 'Round Robin',
    description:
      'Política: turnos iguales usando un quantum fijo.',
    notes: [
      'Estructura que usa: cola circular (FIFO) con reencolado.',
      'Decisión: cada canción suena hasta el quantum y vuelve al final si no termina.',
      'Ventaja: muy justo, nadie se queda esperando demasiado.',
      'Desventaja: quantum muy pequeño genera demasiados cambios.',
    ],
  },
  priority: {
    title: 'Prioridades',
    description:
      'Política: la prioridad manda. Mayor prioridad, pasa primero.',
    notes: [
      'Estructura que usa: cola ordenada por prioridad.',
      'Decisión: la prioridad más alta se selecciona primero.',
      'Preemptivo: si llega alguien con mayor prioridad, puede interrumpir.',
      'Prioridad 5: es el dueño de la disco, la chica guapa, o el tipo que se ve agresivo.',
      'Prioridad 4: el VIP que llegó con mesa.',
      'Prioridad 3: trae flow, pero no manda.',
      'Prioridad 2: invitado conocido, pero sin prisa.',
      'Prioridad 1: tipo chill, ni está consumiendo.',
    ],
  },
  multilevel: {
    title: 'Multilevel Queue',
    description:
      'Política: varias colas por nivel de prioridad, cada una con su propia regla.',
    notes: [
      'Estructura que usa: 3 colas (alta, media, baja).',
      'Decisión: siempre se atiende primero la cola más alta disponible.',
      'Dentro de cada cola se usa Round Robin con su quantum.',
      'Preemptivo: si aparece algo de un nivel superior, interrumpe.',
      'Puedes imaginarlo como salas con reglas distintas.',
    ],
  },
};

const el = {
  algoSelect: document.getElementById('algoSelect'),
  quantumInput: document.getElementById('quantumInput'),
  quantumHigh: document.getElementById('quantumHigh'),
  quantumMid: document.getElementById('quantumMid'),
  quantumLow: document.getElementById('quantumLow'),
  preemptiveToggle: document.getElementById('preemptiveToggle'),
  songLimitInput: document.getElementById('songLimitInput'),
  songLimitToggle: document.getElementById('songLimitToggle'),
  rrOnlyControls: Array.from(document.querySelectorAll('.rr-only')),
  multilevelOnlyControls: Array.from(document.querySelectorAll('.multilevel-only')),
  preemptiveOnlyControls: Array.from(document.querySelectorAll('.preemptive-only')),
  speedRange: document.getElementById('speedRange'),
  speedButtons: Array.from(document.querySelectorAll('.speed-btn')),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resetBtn: document.getElementById('resetBtn'),
  fillQueueBtn: document.getElementById('fillQueueBtn'),
  addSongBtn: document.getElementById('addSongBtn'),
  randomSongBtn: document.getElementById('randomSongBtn'),
  interruptBtn: document.getElementById('interruptBtn'),
  compareBtn: document.getElementById('compareBtn'),
  queueList: document.getElementById('queueList'),
  queueCount: document.getElementById('queueCount'),
  completedList: document.getElementById('completedList'),
  doneCount: document.getElementById('doneCount'),
  nowPlayingName: document.getElementById('nowPlayingName'),
  nowPlayingBar: document.getElementById('nowPlayingBar'),
  nowPlayingRemaining: document.getElementById('nowPlayingRemaining'),
  nowPlayingTime: document.getElementById('nowPlayingTime'),
  nowPlayingPriority: document.getElementById('nowPlayingPriority'),
  algoTitle: document.getElementById('algoTitle'),
  algoDescription: document.getElementById('algoDescription'),
  algoNotes: document.getElementById('algoNotes'),
  songTable: document.getElementById('songTable'),
  timeline: document.getElementById('timeline'),
  avgWait: document.getElementById('avgWait'),
  avgResponse: document.getElementById('avgResponse'),
  avgTurnaround: document.getElementById('avgTurnaround'),
  cpuUsage: document.getElementById('cpuUsage'),
  compareTable: document.getElementById('compareTable'),
  songName: document.getElementById('songName'),
  songDuration: document.getElementById('songDuration'),
  songPriority: document.getElementById('songPriority'),
  songArrival: document.getElementById('songArrival'),
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getLevel(priority) {
  if (priority >= 4) return 3;
  if (priority >= 2) return 2;
  return 1;
}

function getQuantumForSong(song) {
  const level = getLevel(song.prioridad);
  if (level === 3) return state.multilevelQuantum.high;
  if (level === 2) return state.multilevelQuantum.mid;
  return state.multilevelQuantum.low;
}

function remainingSlots() {
  if (!state.songLimitEnabled || state.songLimit <= 0) return Infinity;
  const inProcess = state.running ? 1 : 0;
  return Math.max(0, state.songLimit - (state.completed.length + state.queue.length + inProcess));
}

function isLimitReached() {
  return state.songLimitEnabled && state.songLimit > 0 && state.completed.length >= state.songLimit;
}

function sortQueueForAlgorithm() {
  if (state.queue.length === 0) return;
  if (state.algorithm === 'sjf') {
    state.queue.sort((a, b) => a.duracion_restante - b.duracion_restante);
    return;
  }
  if (state.algorithm === 'priority') {
    state.queue.sort((a, b) => b.prioridad - a.prioridad);
    return;
  }
  if (state.algorithm === 'multilevel') {
    const high = [];
    const mid = [];
    const low = [];
    state.queue.forEach((song) => {
      const level = getLevel(song.prioridad);
      if (level === 3) high.push(song);
      else if (level === 2) mid.push(song);
      else low.push(song);
    });
    state.queue.length = 0;
    state.queue.push(...high, ...mid, ...low);
  }
}

function cloneSong(song) {
  return {
    ...song,
    duracion_restante: song.duracion_total,
    estado: 'waiting',
    avatar: pickRandom(monoImages),
    start_time: null,
    finish_time: null,
    response_time: null,
    wait_time: null,
    turnaround_time: null,
  };
}

function loadLibrary() {
  return fetch('songs.json')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('No songs.json'))))
    .catch(() => [
      { id: 1, nombre: 'Rock', duracion_total: 6, duracion_restante: 6, prioridad: 2, tiempo_llegada: 0 },
      { id: 2, nombre: 'Salsa', duracion_total: 3, duracion_restante: 3, prioridad: 3, tiempo_llegada: 1 },
      { id: 3, nombre: 'Jazz', duracion_total: 5, duracion_restante: 5, prioridad: 4, tiempo_llegada: 2 },
      { id: 4, nombre: 'Pop', duracion_total: 4, duracion_restante: 4, prioridad: 1, tiempo_llegada: 3 },
    ]);
}

function resetSimulation() {
  stopSimulation();
  state.time = 0;
  state.running = null;
  state.queue = [];
  state.completed = [];
  state.timeline = [];
  state.isFinished = false;
  state.incoming = state.library.map(cloneSong).sort((a, b) => a.tiempo_llegada - b.tiempo_llegada);
  if (state.songLimit > 0 && state.incoming.length > state.songLimit) {
    state.incoming = state.incoming.slice(0, state.songLimit);
  }
  state.slice = 0;
  state.cpuBusy = 0;
  render();
}

function startSimulation() {
  if (state.isRunning) return;
  state.isRunning = true;
  state.isPaused = false;
  state.isFinished = false;
  runTimer();
  updateButtons();
}

function stopSimulation(paused = false, finished = false) {
  state.isRunning = false;
  state.isPaused = paused;
  state.isFinished = finished;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  updateButtons();
}

function pauseSimulation() {
  if (!state.isRunning) return;
  stopSimulation(true);
}

function runTimer() {
  if (state.timer) clearInterval(state.timer);
  const interval = Math.max(50, 1000 / state.speed);
  state.timer = setInterval(tick, interval);
}

function updateButtons() {
  if (state.isRunning) {
    el.startBtn.textContent = 'Reiniciar';
  } else if (state.isPaused) {
    el.startBtn.textContent = 'Continuar';
  } else {
    el.startBtn.textContent = 'Iniciar';
  }
  el.startBtn.classList.toggle('primary', state.isRunning);
  el.pauseBtn.disabled = !state.isRunning;
}

function addArrivals() {
  let slots = remainingSlots();
  while (slots > 0 && state.incoming.length > 0 && state.incoming[0].tiempo_llegada <= state.time) {
    const song = state.incoming.shift();
    state.queue.push(song);
    slots -= 1;
  }
  sortQueueForAlgorithm();
}

function shouldPreempt() {
  if (!state.preemptive || !state.running) return false;
  if (state.algorithm === 'priority') {
    const maxPriority = state.queue.reduce((max, song) => Math.max(max, song.prioridad), -Infinity);
    return maxPriority > state.running.prioridad;
  }
  if (state.algorithm === 'sjf') {
    const minRemaining = state.queue.reduce(
      (min, song) => Math.min(min, song.duracion_restante),
      Infinity
    );
    return minRemaining < state.running.duracion_restante;
  }
  if (state.algorithm === 'multilevel') {
    const maxLevel = state.queue.reduce((max, song) => Math.max(max, getLevel(song.prioridad)), -Infinity);
    return maxLevel > getLevel(state.running.prioridad);
  }
  return false;
}

function preemptIfNeeded() {
  if (!shouldPreempt()) return;
  state.running.estado = 'waiting';
  state.queue.push(state.running);
  state.running = null;
  state.slice = 0;
}

function pickNextSong() {
  if (isLimitReached()) return null;
  if (state.queue.length === 0) return null;
  if (state.algorithm === 'fcfs' || state.algorithm === 'rr') {
    return state.queue.shift();
  }
  if (state.algorithm === 'sjf') {
    state.queue.sort((a, b) => a.duracion_restante - b.duracion_restante);
    return state.queue.shift();
  }
  if (state.algorithm === 'priority') {
    state.queue.sort((a, b) => b.prioridad - a.prioridad);
    return state.queue.shift();
  }
  if (state.algorithm === 'multilevel') {
    const idx = state.queue.findIndex((song) => song.prioridad >= 4);
    if (idx >= 0) return state.queue.splice(idx, 1)[0];
    const midIdx = state.queue.findIndex((song) => song.prioridad >= 2);
    if (midIdx >= 0) return state.queue.splice(midIdx, 1)[0];
    return state.queue.shift();
  }
  return state.queue.shift();
}

function startSong(song) {
  song.estado = 'playing';
  song.start_time = song.start_time ?? state.time;
  song.response_time = song.response_time ?? state.time - song.tiempo_llegada;
  state.slice = 0;
}

function finishSong(song) {
  song.estado = 'done';
  song.finish_time = state.time + 1;
  song.turnaround_time = song.finish_time - song.tiempo_llegada;
  song.wait_time = song.turnaround_time - song.duracion_total;
  state.completed.unshift(song);
}

function tick() {
  if (isLimitReached()) {
    stopSimulation(false, true);
    render();
    return;
  }
  addArrivals();
  preemptIfNeeded();

  if (!state.running) {
    const next = pickNextSong();
    if (next) {
      state.running = next;
      startSong(next);
    }
  }

  if (state.running) {
    state.running.duracion_restante -= 1;
    state.slice += 1;
    state.cpuBusy += 1;
    state.timeline.push(state.running.nombre);

    if (state.running.duracion_restante <= 0) {
      finishSong(state.running);
      state.running = null;
      state.slice = 0;
      if (state.songLimit > 0 && state.completed.length >= state.songLimit) {
        stopSimulation(false, true);
        render();
        return;
      }
    } else if (state.algorithm === 'rr' && state.slice >= state.quantum) {
      state.running.estado = 'waiting';
      state.queue.push(state.running);
      state.running = null;
      state.slice = 0;
    } else if (state.algorithm === 'multilevel' && state.slice >= getQuantumForSong(state.running)) {
      state.running.estado = 'waiting';
      state.queue.push(state.running);
      state.running = null;
      state.slice = 0;
    }
  }

  state.time += 1;
  if (!state.running && state.queue.length === 0 && state.incoming.length === 0) {
    stopSimulation(false, true);
  }

  render();
}

function formatSeconds(value) {
  return `${value}s`;
}

function priorityClass(priority) {
  if (priority >= 4) return 'priority-high';
  if (priority >= 2) return 'priority-mid';
  return 'priority-low';
}

function renderQueue() {
  el.queueList.innerHTML = '';
  state.queue.forEach((song) => {
    const card = document.createElement('div');
    card.className = 'queue-card';
    const played = song.duracion_total - song.duracion_restante;
    const progress = song.duracion_total > 0 ? Math.round((played / song.duracion_total) * 100) : 0;
    const rrProgress = `
      <div class="queue-progress">
        <div class="mini-bar"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>
        <small>avance ${played}s / ${song.duracion_total}s (${Math.max(0, Math.min(100, progress))}%)</small>
      </div>
    `;
    card.innerHTML = `
      <img src="${song.avatar}" alt="mono" />
      <div class="meta">
        <strong>${song.nombre}</strong>
        <span>${song.duracion_restante}s restante · prio ${song.prioridad}</span>
        ${rrProgress}
      </div>
      <span class="status waiting">esperando</span>
    `;
    el.queueList.appendChild(card);
  });
  el.queueCount.textContent = `${state.queue.length} esperando`;
}

function renderCompleted() {
  el.completedList.innerHTML = '';
  state.completed.slice(0, 10).forEach((song) => {
    const card = document.createElement('div');
    card.className = 'queue-card';
    card.innerHTML = `
      <img src="${song.avatar}" alt="mono" />
      <div class="meta">
        <strong>${song.nombre}</strong>
        <span>${song.duracion_total}s · turnaround ${song.turnaround_time ?? '--'}s</span>
      </div>
      <span class="status done">lista</span>
    `;
    el.completedList.appendChild(card);
  });
  el.doneCount.textContent = `${state.completed.length} terminadas`;
}

function renderCpu() {
  if (!state.running) {
    el.nowPlayingName.textContent = 'Sin canción';
    el.nowPlayingBar.style.width = '0%';
    el.nowPlayingRemaining.textContent = '--';
    el.nowPlayingTime.textContent = `${state.time}s`;
    el.nowPlayingPriority.textContent = '--';
    return;
  }

  const song = state.running;
  el.nowPlayingName.textContent = song.nombre;
  const progress = ((song.duracion_total - song.duracion_restante) / song.duracion_total) * 100;
  el.nowPlayingBar.style.width = `${progress}%`;
  el.nowPlayingRemaining.textContent = `${song.duracion_restante}s`;
  el.nowPlayingTime.textContent = `${state.time}s`;
  el.nowPlayingPriority.textContent = `P${song.prioridad}`;
}

function renderTimeline() {
  const windowSize = 40;
  const slice = state.timeline.slice(-windowSize);
  if (slice.length === 0) {
    el.timeline.innerHTML = '<p class="eyebrow">Sin ejecuciones aún</p>';
    return;
  }

  const segments = [];
  let current = slice[0];
  let count = 1;
  for (let i = 1; i < slice.length; i += 1) {
    if (slice[i] === current) {
      count += 1;
    } else {
      segments.push({ name: current, duration: count });
      current = slice[i];
      count = 1;
    }
  }
  segments.push({ name: current, duration: count });

  const colors = new Map();
  function colorForName(name) {
    if (colors.has(name)) return colors.get(name);
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    const color = `hsl(${hash}, 70%, 60%)`;
    colors.set(name, color);
    return color;
  }

  const total = segments.reduce((acc, seg) => acc + seg.duration, 0);
  const track = `
    <div class="gantt-track">
      ${segments
        .map(
          (seg) => `
        <div class="gantt-seg" style="flex:${seg.duration}; background:${colorForName(seg.name)}">
          ${seg.name}
        </div>
      `
        )
        .join('')}
    </div>
  `;

  const legendItems = Array.from(colors.entries())
    .map(([name, color]) => `<span><i style="background:${color}"></i>${name}</span>`)
    .join('');

  el.timeline.innerHTML = `
    ${track}
    <div class="gantt-legend">Ventana: últimos ${total}s · ${legendItems}</div>
  `;
}

function renderTable() {
  const ordered = [
    ...(state.running ? [state.running] : []),
    ...state.queue,
    ...state.completed,
    ...state.incoming,
  ];

  const unique = new Map();
  ordered.forEach((song) => {
    if (!unique.has(song.id)) unique.set(song.id, song);
  });

  el.songTable.innerHTML = '';
  Array.from(unique.values()).forEach((song) => {
      const tr = document.createElement('tr');
      const status = song === state.running ? 'Sonando' : song.estado === 'done' ? 'Finalizado' : 'Esperando';
      const stateClass = song === state.running ? 'state-playing' : song.estado === 'done' ? 'state-done' : 'state-waiting';
      let progress = song.duracion_total > 0
        ? Math.round(((song.duracion_total - song.duracion_restante) / song.duracion_total) * 100)
        : 0;
      progress = Math.max(0, Math.min(100, progress));
      const priorityCell = song.estado === 'done'
        ? `<span class="priority-chip ${priorityClass(song.prioridad)}">P${song.prioridad}</span>`
        : `
          <select class="priority-select ${priorityClass(song.prioridad)}" data-id="${song.id}">
            ${[1, 2, 3, 4, 5]
              .map((value) => `<option value="${value}" ${value === song.prioridad ? 'selected' : ''}>P${value}</option>`)
              .join('')}
          </select>
        `;

      tr.innerHTML = `
        <td><img src="${song.avatar}" alt="mono" /></td>
        <td>${song.nombre}</td>
        <td>${song.duracion_total}s</td>
        <td>${priorityCell}</td>
        <td><span class="state-pill ${stateClass}">${status}</span></td>
        <td>${progress}%</td>
      `;
      el.songTable.appendChild(tr);
    });
}

function renderMetrics() {
  const done = state.completed.filter((song) => song.turnaround_time != null);
  if (done.length === 0) {
    el.avgWait.textContent = '--';
    el.avgResponse.textContent = '--';
    el.avgTurnaround.textContent = '--';
    el.cpuUsage.textContent = '--';
    return;
  }

  const totals = done.reduce(
    (acc, song) => {
      acc.wait += song.wait_time;
      acc.response += song.response_time;
      acc.turnaround += song.turnaround_time;
      return acc;
    },
    { wait: 0, response: 0, turnaround: 0 }
  );

  el.avgWait.textContent = `${(totals.wait / done.length).toFixed(1)}s`;
  el.avgResponse.textContent = `${(totals.response / done.length).toFixed(1)}s`;
  el.avgTurnaround.textContent = `${(totals.turnaround / done.length).toFixed(1)}s`;
  const usage = state.time > 0 ? (state.cpuBusy / state.time) * 100 : 0;
  el.cpuUsage.textContent = `${usage.toFixed(1)}%`;
}

function render() {
  renderQueue();
  renderCompleted();
  renderCpu();
  renderTimeline();
  renderTable();
  renderMetrics();
}

function addSongFromForm(useRandom) {
  const template = useRandom ? pickRandom(state.library) : null;

  const nombre = el.songName.value.trim() || (template ? template.nombre : `Track ${Date.now() % 1000}`);
  const duracion_total = Number(el.songDuration.value) || (template ? template.duracion_total : 4);
  const prioridad = Number(el.songPriority.value) || (template ? template.prioridad : 3);
  const tiempo_llegada = Number(el.songArrival.value) || 0;

  const baseSong = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    nombre,
    duracion_total,
    duracion_restante: duracion_total,
    prioridad: Math.max(1, Math.min(5, prioridad)),
    tiempo_llegada: state.time + Math.max(0, tiempo_llegada),
  };

  state.library.push({ ...baseSong });
  const song = cloneSong(baseSong);

  if (song.tiempo_llegada <= state.time) {
    if (remainingSlots() > 0) {
      state.queue.push(song);
      sortQueueForAlgorithm();
    } else {
      render();
      return;
    }
  } else {
    if (remainingSlots() > 0) {
      state.incoming.push(song);
      state.incoming.sort((a, b) => a.tiempo_llegada - b.tiempo_llegada);
    } else {
      render();
      return;
    }
  }
  render();
}

function interruptSong() {
  if (!state.running) return;
  state.running.estado = 'waiting';
  state.queue.unshift(state.running);
  state.running = null;
  state.slice = 0;
  render();
}

function updateMultilevelQuantums() {
  state.multilevelQuantum = {
    high: Math.max(1, Number(el.quantumHigh.value) || 2),
    mid: Math.max(1, Number(el.quantumMid.value) || 3),
    low: Math.max(1, Number(el.quantumLow.value) || 4),
  };
}

function updateAlgorithmSettings() {
  state.algorithm = el.algoSelect.value;
  state.quantum = Math.max(1, Number(el.quantumInput.value) || 2);
  updateMultilevelQuantums();
  const isRR = state.algorithm === 'rr';
  const isMultilevel = state.algorithm === 'multilevel';
  const isPreemptiveAlgo = state.algorithm === 'priority' || state.algorithm === 'multilevel' || state.algorithm === 'sjf';

  el.rrOnlyControls.forEach((node) => node.classList.toggle('hidden', !isRR));
  el.multilevelOnlyControls.forEach((node) => node.classList.toggle('hidden', !isMultilevel));
  el.preemptiveOnlyControls.forEach((node) => node.classList.toggle('hidden', !isPreemptiveAlgo));

  el.quantumInput.disabled = !isRR;
  el.quantumHigh.disabled = !isMultilevel;
  el.quantumMid.disabled = !isMultilevel;
  el.quantumLow.disabled = !isMultilevel;
  sortQueueForAlgorithm();
  renderAlgoInfo();
  render();
}

function handleAlgorithmChange() {
  updateAlgorithmSettings();
  resetSimulation();
}

function updateSpeed(speed) {
  state.speed = speed;
  el.speedRange.value = speed;
  el.speedButtons.forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.speed) === speed);
  });
  if (state.isRunning) runTimer();
}

function updateSongLimit() {
  state.songLimitEnabled = !!el.songLimitToggle.checked;
  state.songLimit = state.songLimitEnabled ? Math.max(1, Number(el.songLimitInput.value) || 1) : 0;
  el.songLimitInput.disabled = !state.songLimitEnabled;
  el.songLimitInput.classList.toggle('hidden', !state.songLimitEnabled);
  if (!state.songLimitEnabled) {
    const existingIds = new Set();
    if (state.running) existingIds.add(state.running.id);
    state.queue.forEach((song) => existingIds.add(song.id));
    state.completed.forEach((song) => existingIds.add(song.id));
    state.incoming.forEach((song) => existingIds.add(song.id));

    const missing = state.library
      .filter((song) => !existingIds.has(song.id))
      .map(cloneSong);
    state.incoming.push(...missing);
    state.incoming.sort((a, b) => a.tiempo_llegada - b.tiempo_llegada);
    return;
  }

  if (isLimitReached()) {
    stopSimulation(false, true);
  }

  const inProcess = state.running ? 1 : 0;
  let remaining = Math.max(0, state.songLimit - state.completed.length - inProcess);

  if (remaining === 0) {
    state.queue = [];
    state.incoming = [];
    return;
  }

  if (state.queue.length > remaining) {
    state.queue = state.queue.slice(0, remaining);
    state.incoming = [];
    return;
  }

  remaining -= state.queue.length;
  state.incoming = state.incoming.slice(0, remaining);
}

function fillQueueNow() {
  let slots = remainingSlots();
  while (slots > 0 && state.incoming.length > 0) {
    const song = state.incoming.shift();
    song.tiempo_llegada = state.time;
    state.queue.push(song);
    slots -= 1;
  }
  sortQueueForAlgorithm();
  preemptIfNeeded();
  render();
}

function renderAlgoInfo() {
  const info = algoContent[state.algorithm] ?? algoContent.fcfs;
  el.algoTitle.textContent = info.title;
  el.algoDescription.textContent = info.description;
  el.algoNotes.innerHTML = info.notes.map((note) => `<li>${note}</li>`).join('');
}

function handleStartButton() {
  if (state.isRunning) {
    resetSimulation();
    startSimulation();
    return;
  }
  if (state.isPaused) {
    startSimulation();
    return;
  }
  if (state.isFinished) {
    resetSimulation();
    startSimulation();
    return;
  }
  startSimulation();
}

function compareAlgorithms() {
  const baseSongs = state.library.map((song) => ({ ...song }));
  const algorithms = [
    { key: 'fcfs', label: 'FCFS' },
    { key: 'sjf', label: 'SJF' },
    { key: 'rr', label: 'Round Robin' },
    { key: 'priority', label: 'Prioridades' },
    { key: 'multilevel', label: 'Multilevel' },
  ];

  const rows = algorithms.map((algo) =>
    simulate(algo.key, baseSongs, state.quantum, state.multilevelQuantum, state.preemptive)
  );
  renderCompare(rows);
}

function simulate(algorithm, baseSongs, quantum, multilevelQuantum, preemptive) {
  const simState = {
    time: 0,
    running: null,
    queue: [],
    incoming: baseSongs.map((song) => cloneSong(song)).sort((a, b) => a.tiempo_llegada - b.tiempo_llegada),
    completed: [],
    cpuBusy: 0,
    slice: 0,
  };

  function simGetQuantumForSong(song) {
    const level = getLevel(song.prioridad);
    if (level === 3) return multilevelQuantum.high;
    if (level === 2) return multilevelQuantum.mid;
    return multilevelQuantum.low;
  }

  function simStartSong(song) {
    song.estado = 'playing';
    song.start_time = song.start_time ?? simState.time;
    song.response_time = song.response_time ?? simState.time - song.tiempo_llegada;
    simState.slice = 0;
  }

  function simFinishSong(song) {
    song.estado = 'done';
    song.finish_time = simState.time + 1;
    song.turnaround_time = song.finish_time - song.tiempo_llegada;
    song.wait_time = song.turnaround_time - song.duracion_total;
  }

  function simPickNext() {
    if (simState.queue.length === 0) return null;
    if (algorithm === 'fcfs' || algorithm === 'rr') return simState.queue.shift();
    if (algorithm === 'sjf') {
      simState.queue.sort((a, b) => a.duracion_restante - b.duracion_restante);
      return simState.queue.shift();
    }
    if (algorithm === 'priority') {
      simState.queue.sort((a, b) => b.prioridad - a.prioridad);
      return simState.queue.shift();
    }
    if (algorithm === 'multilevel') {
      const idx = simState.queue.findIndex((song) => song.prioridad >= 4);
      if (idx >= 0) return simState.queue.splice(idx, 1)[0];
      const midIdx = simState.queue.findIndex((song) => song.prioridad >= 2);
      if (midIdx >= 0) return simState.queue.splice(midIdx, 1)[0];
      return simState.queue.shift();
    }
    return simState.queue.shift();
  }

  while (simState.completed.length < baseSongs.length && simState.time < 1000) {
    while (simState.incoming.length > 0 && simState.incoming[0].tiempo_llegada <= simState.time) {
      simState.queue.push(simState.incoming.shift());
    }

    if (preemptive && simState.running) {
      if (algorithm === 'priority') {
        const maxPriority = simState.queue.reduce((max, song) => Math.max(max, song.prioridad), -Infinity);
        if (maxPriority > simState.running.prioridad) {
          simState.running.estado = 'waiting';
          simState.queue.push(simState.running);
          simState.running = null;
          simState.slice = 0;
        }
      }
      if (algorithm === 'sjf') {
        const minRemaining = simState.queue.reduce(
          (min, song) => Math.min(min, song.duracion_restante),
          Infinity
        );
        if (minRemaining < simState.running.duracion_restante) {
          simState.running.estado = 'waiting';
          simState.queue.push(simState.running);
          simState.running = null;
          simState.slice = 0;
        }
      }
      if (algorithm === 'multilevel') {
        const maxLevel = simState.queue.reduce((max, song) => Math.max(max, getLevel(song.prioridad)), -Infinity);
        if (maxLevel > getLevel(simState.running.prioridad)) {
          simState.running.estado = 'waiting';
          simState.queue.push(simState.running);
          simState.running = null;
          simState.slice = 0;
        }
      }
    }

    if (!simState.running) {
      const next = simPickNext();
      if (next) {
        simState.running = next;
        simStartSong(next);
      }
    }

    if (simState.running) {
      simState.running.duracion_restante -= 1;
      simState.slice += 1;
      simState.cpuBusy += 1;

      if (simState.running.duracion_restante <= 0) {
        simFinishSong(simState.running);
        simState.completed.push(simState.running);
        simState.running = null;
        simState.slice = 0;
      } else if (algorithm === 'rr' && simState.slice >= quantum) {
        simState.running.estado = 'waiting';
        simState.queue.push(simState.running);
        simState.running = null;
        simState.slice = 0;
      } else if (algorithm === 'multilevel' && simState.slice >= simGetQuantumForSong(simState.running)) {
        simState.running.estado = 'waiting';
        simState.queue.push(simState.running);
        simState.running = null;
        simState.slice = 0;
      }
    }

    simState.time += 1;
  }

  const done = simState.completed;
  const totals = done.reduce(
    (acc, song) => {
      acc.wait += song.wait_time;
      acc.response += song.response_time;
      acc.turnaround += song.turnaround_time;
      return acc;
    },
    { wait: 0, response: 0, turnaround: 0 }
  );

  const avgWait = totals.wait / done.length;
  const avgResponse = totals.response / done.length;
  const avgTurnaround = totals.turnaround / done.length;
  const usage = simState.time > 0 ? (simState.cpuBusy / simState.time) * 100 : 0;

  return {
    algorithm,
    avgWait,
    avgResponse,
    avgTurnaround,
    usage,
  };
}

function renderCompare(rows) {
  const table = `
    <table>
      <thead>
        <tr>
          <th>Algoritmo</th>
          <th>Espera</th>
          <th>Respuesta</th>
          <th>Turnaround</th>
          <th>CPU</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            <td>${row.algorithm.toUpperCase()}</td>
            <td>${row.avgWait.toFixed(1)}s</td>
            <td>${row.avgResponse.toFixed(1)}s</td>
            <td>${row.avgTurnaround.toFixed(1)}s</td>
            <td>${row.usage.toFixed(1)}%</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
  el.compareTable.innerHTML = table;
}

function initEvents() {
  el.algoSelect.addEventListener('change', handleAlgorithmChange);
  el.quantumInput.addEventListener('input', updateAlgorithmSettings);
  el.quantumHigh.addEventListener('input', updateAlgorithmSettings);
  el.quantumMid.addEventListener('input', updateAlgorithmSettings);
  el.quantumLow.addEventListener('input', updateAlgorithmSettings);
  el.preemptiveToggle.addEventListener('change', (event) => {
    state.preemptive = event.target.checked;
    preemptIfNeeded();
    render();
  });
  el.songLimitToggle.addEventListener('change', updateSongLimit);
  el.songLimitInput.addEventListener('input', updateSongLimit);
  el.fillQueueBtn.addEventListener('click', fillQueueNow);

  el.speedRange.addEventListener('input', (event) => {
    updateSpeed(Number(event.target.value));
  });
  el.speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => updateSpeed(Number(btn.dataset.speed)));
  });

  el.startBtn.addEventListener('click', handleStartButton);
  el.pauseBtn.addEventListener('click', pauseSimulation);
  el.resetBtn.addEventListener('click', resetSimulation);

  el.addSongBtn.addEventListener('click', () => addSongFromForm(false));
  el.randomSongBtn.addEventListener('click', () => addSongFromForm(true));
  el.interruptBtn.addEventListener('click', interruptSong);
  el.compareBtn.addEventListener('click', compareAlgorithms);

  el.songTable.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.classList.contains('priority-select')) return;
    const songId = Number(target.dataset.id);
    const newPriority = Math.max(1, Math.min(5, Number(target.value)));

    const allLists = [state.queue, state.incoming, state.completed];
    if (state.running && state.running.id === songId) {
      state.running.prioridad = newPriority;
    }
    allLists.forEach((list) => {
      list.forEach((song) => {
        if (song.id === songId) {
          song.prioridad = newPriority;
        }
      });
    });
    target.className = `priority-select ${priorityClass(newPriority)}`;
    sortQueueForAlgorithm();
    preemptIfNeeded();
    render();
  });
}

async function init() {
  state.library = await loadLibrary();
  updateAlgorithmSettings();
  updateSpeed(1);
  initEvents();
  state.preemptive = el.preemptiveToggle.checked;
  updateSongLimit();
  renderAlgoInfo();
  resetSimulation();
}

init();
