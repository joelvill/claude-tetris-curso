'use strict';

/*
 * Tabla de records local (top 5) + estadísticas globales, persistidas en localStorage.
 * Este fichero se carga DESPUÉS de game.js, así que en tiempo de ejecución puede leer
 * sus variables de estado (screen, score, lines, level) y llamar a showScreen().
 * Todo vive dentro de una función anónima autoejecutada para no pisar ningún
 * identificador declarado a top level por game.js. Único global expuesto: window.Records.
 */
(function () {
  const KEY_RECORDS = 'tetris.records';
  const KEY_STATS = 'tetris.stats';
  const MAX_RECORDS = 5;
  const MAX_NAME = 12;
  const DEFAULT_NAME = 'ANÓNIMO';

  // DOM: el markup es propiedad de la pantalla base, puede no estar presente.
  const startRecords = document.getElementById('start-records');
  const gameoverRecords = document.getElementById('gameover-records');
  const inputName = document.getElementById('input-player-name');
  const labelName = document.querySelector('label[for="input-player-name"]');
  const btnSave = document.getElementById('btn-save-score');
  const btnRestart = document.getElementById('restart-btn');
  const recordsList = document.getElementById('records-list');
  const recordsStats = document.getElementById('records-stats');
  const btnRecords = document.getElementById('btn-records');
  const btnBackRecords = document.getElementById('btn-back-records');
  const btnResetRecords = document.getElementById('btn-reset-records');

  // Pantalla desde la que se entró a 'records', para saber a dónde volver.
  let backScreen = 'start';
  // Partida recién terminada que entra en el top y espera nombre (o null).
  let pending = null;

  // ---------------------------------------------------------------- persistencia
  // Lectura y escritura siempre en try/catch: en modo privado o con el storage
  // bloqueado degradamos a lista vacía en vez de romper el juego.

  function loadRecords() {
    try {
      const raw = localStorage.getItem(KEY_RECORDS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(e => e && typeof e === 'object')
        .map(e => ({
          nombre: typeof e.nombre === 'string' && e.nombre ? e.nombre : DEFAULT_NAME,
          score: Number(e.score) || 0,
          lines: Number(e.lines) || 0,
          level: Number(e.level) || 1,
          fecha: typeof e.fecha === 'string' ? e.fecha : '',
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RECORDS);
    } catch (err) {
      return [];
    }
  }

  function saveRecords(list) {
    try {
      localStorage.setItem(KEY_RECORDS, JSON.stringify(list));
    } catch (err) {
      // storage no disponible: los records solo viven en esta sesión
    }
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(KEY_STATS);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return { bestCombo: 0, bestLines: 0 };
      return {
        bestCombo: Number(parsed.bestCombo) || 0,
        bestLines: Number(parsed.bestLines) || 0,
      };
    } catch (err) {
      return { bestCombo: 0, bestLines: 0 };
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(KEY_STATS, JSON.stringify(stats));
    } catch (err) {
      // ídem: se ignora en silencio
    }
  }

  // ---------------------------------------------------------------------- render

  // El nombre lo escribe el jugador: siempre por textContent, nunca innerHTML.
  function buildRow(entry, position, highlight) {
    const row = document.createElement('div');
    row.className = highlight ? 'record-row highlight' : 'record-row';
    const cells = [
      position + '.',
      entry.nombre,
      entry.score.toLocaleString(),
      entry.lines + ' líneas',
      'Nv ' + entry.level,
    ];
    for (const text of cells) {
      const span = document.createElement('span');
      span.textContent = text;
      row.appendChild(span);
    }
    return row;
  }

  function buildMessage(text, highlight) {
    const p = document.createElement('p');
    if (highlight) p.className = 'record-row highlight';
    p.textContent = text;
    return p;
  }

  // Pinta una lista de records en un contenedor; highlightIndex marca una fila.
  function renderRecords(container, list, highlightIndex) {
    if (!container) return;
    container.textContent = '';
    if (!list.length) {
      container.appendChild(buildMessage('Sin records todavía'));
      return;
    }
    list.forEach((entry, i) => {
      container.appendChild(buildRow(entry, i + 1, i === highlightIndex));
    });
  }

  function renderStats(stats) {
    if (!recordsStats) return;
    recordsStats.textContent = '';
    recordsStats.appendChild(buildMessage('Mejor combo: ' + stats.bestCombo));
    recordsStats.appendChild(buildMessage('Máximo de líneas: ' + stats.bestLines));
  }

  // Top 5 en la pantalla de game over, con un mensaje opcional encima.
  function renderGameOver(list, highlightIndex, message) {
    if (!gameoverRecords) return;
    renderRecords(gameoverRecords, list, highlightIndex);
    if (message) gameoverRecords.insertBefore(buildMessage(message, true), gameoverRecords.firstChild);
  }

  // Refresca los sitios "permanentes": inicio, pantalla de records y estadísticas.
  function renderAll() {
    const list = loadRecords();
    renderRecords(startRecords, list);
    renderRecords(recordsList, list);
    renderStats(loadStats());
  }

  // ----------------------------------------------------------------- lógica top 5

  function sanitizeName(raw) {
    const name = String(raw == null ? '' : raw).trim().slice(0, MAX_NAME).trim();
    return name || DEFAULT_NAME;
  }

  // Entra en el top si hay hueco o si supera a la última entrada.
  function qualifies(scoreValue, list) {
    if (scoreValue <= 0) return false;
    if (list.length < MAX_RECORDS) return true;
    return scoreValue > list[list.length - 1].score;
  }

  // Oculta/muestra un elemento: la clase 'hidden' por convención del proyecto y
  // display en línea como garantía (el CSS de .hidden no es necesariamente genérico).
  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
    el.style.display = hidden ? 'none' : '';
  }

  // Muestra u oculta el trío etiqueta + input + botón de guardado.
  function setPromptVisible(visible) {
    if (labelName) setHidden(labelName, !visible);
    if (inputName) {
      inputName.value = '';
      inputName.disabled = !visible;
      setHidden(inputName, !visible);
    }
    if (btnSave) {
      btnSave.disabled = !visible;
      setHidden(btnSave, !visible);
    }
  }

  function saveScore() {
    if (!pending) return;
    // El botón se deshabilita a sí mismo para evitar guardados dobles (y 'pending'
    // pasa a null justo después, que es la salvaguarda real).
    if (btnSave) btnSave.disabled = true;
    const nombre = sanitizeName(inputName ? inputName.value : '');
    const entry = {
      nombre: nombre,
      score: pending.score,
      lines: pending.lines,
      level: pending.level,
      fecha: new Date().toISOString(),
    };
    pending = null;
    const list = loadRecords();
    list.push(entry);
    // sort es estable: en caso de empate la entrada nueva queda detrás de la vieja.
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, MAX_RECORDS);
    saveRecords(top);
    renderGameOver(top, top.indexOf(entry), '¡Récord guardado!');
    // Ya no hay nada que pedir: se oculta el formulario de nombre.
    setPromptVisible(false);
    renderAll();
  }

  // Guarda la partida pendiente sin pasar por el botón (al reiniciar), para que
  // una puntuación de top 5 no se pierda en silencio si el jugador no la guarda.
  function flushPending() {
    if (pending) saveScore();
  }

  // Llamado desde endGame() en game.js. maxCombo lo aporta la unidad del combo.
  function onGameOver(data) {
    const info = data || {};
    const finalScore = Number(info.score) || 0;
    const finalLines = Number(info.lines) || 0;
    const finalLevel = Number(info.level) || 1;
    const finalCombo = Number(info.maxCombo) || 0;

    // endGame() puede llegar a llamarse más de una vez para la misma partida: si ya
    // estamos pidiendo el nombre de estos mismos datos, no repintamos ni borramos
    // lo que el jugador está escribiendo.
    if (pending && pending.score === finalScore && pending.lines === finalLines && pending.level === finalLevel) return;

    // Las estadísticas globales se actualizan tanto si la puntuación entra en el top como si no.
    const stats = loadStats();
    saveStats({
      bestCombo: Math.max(stats.bestCombo, finalCombo),
      bestLines: Math.max(stats.bestLines, finalLines),
    });

    const list = loadRecords();
    const entra = qualifies(finalScore, list);
    pending = entra ? { score: finalScore, lines: finalLines, level: finalLevel } : null;
    renderGameOver(list, -1, entra ? '¡Nuevo récord! Escribe tu nombre:' : null);
    setPromptVisible(entra);
    renderAll();
  }

  function resetRecords() {
    if (!window.confirm('¿Seguro que quieres borrar todos los records y estadísticas?')) return;
    try {
      localStorage.removeItem(KEY_RECORDS);
      localStorage.removeItem(KEY_STATS);
    } catch (err) {
      // nada que hacer: el storage no está disponible
    }
    renderAll();
    // La pantalla de game over puede estar detrás con una lista ya obsoleta.
    renderGameOver([], -1, pending ? '¡Nuevo récord! Escribe tu nombre:' : null);
  }

  // ---------------------------------------------------------------------- eventos

  if (btnSave) btnSave.addEventListener('click', saveScore);
  if (btnResetRecords) btnResetRecords.addEventListener('click', resetRecords);
  // game.js registra su init() antes que esto, así que al reiniciar el juego ya
  // se ha reseteado; flushPending trabaja sobre la copia guardada en 'pending'.
  if (btnRestart) btnRestart.addEventListener('click', flushPending);

  if (btnRecords) {
    btnRecords.addEventListener('click', () => {
      // 'screen' es la variable de estado de game.js; puede venir de 'start'.
      backScreen = typeof screen === 'string' ? screen : 'start';
      renderAll();
      if (typeof showScreen === 'function') showScreen('records');
    });
  }

  if (btnBackRecords) {
    btnBackRecords.addEventListener('click', () => {
      if (typeof showScreen === 'function') showScreen(backScreen || 'start');
    });
  }

  // Arranque: sin partida terminada todavía no se pide nombre.
  setPromptVisible(false);
  renderAll();

  window.Records = {
    onGameOver: onGameOver,
    render: renderAll,
    reset: resetRecords,
  };
})();
