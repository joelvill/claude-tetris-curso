'use strict';

// ============================================================
//  Temas visuales (skins)
//  Se carga DESPUÉS de game.js, así que puede leer sus variables
//  (COLORS, board, next...) y llamar a sus funciones (draw, drawNext).
//  Expone un único global: window.Skins
// ============================================================

const SKIN_KEY = 'tetris.skin';

// Cada paleta es 1-based con null en el índice 0: el índice de tipo de pieza
// es también el índice de color (invariante del juego).
// La skin Retro reutiliza la paleta original de game.js.
const SKINS = [
  {
    id: 'retro',
    label: 'Retro',
    palette: COLORS,
    grid: '#22222e',
    gridWidth: 0.5,
    drawBlock: drawBlockRetro,
  },
  {
    id: 'neon',
    label: 'Neon',
    palette: [
      null,
      '#00f0ff', // I
      '#ffe600', // O
      '#ff00e6', // T
      '#00ff85', // S
      '#ff2d55', // Z
      '#4d5dff', // J
      '#ff9100', // L
    ],
    grid: 'rgba(0,240,255,0.10)',
    gridWidth: 0.5,
    drawBlock: drawBlockNeon,
  },
  {
    id: 'pastel',
    label: 'Pastel',
    palette: [
      null,
      '#a8e6ef', // I
      '#fbe7a1', // O
      '#dcb8ec', // T
      '#bde8c4', // S
      '#f6bcbc', // Z
      '#bcc6f0', // J
      '#f8d6ad', // L
    ],
    grid: 'rgba(255,255,255,0.07)',
    gridWidth: 0.5,
    drawBlock: drawBlockPastel,
  },
  {
    id: 'pixel',
    label: 'Pixel art',
    palette: [
      null,
      '#3cbcfc', // I
      '#f8d878', // O
      '#b8a0f8', // T
      '#58d854', // S
      '#f87858', // Z
      '#6888fc', // J
      '#fca044', // L
    ],
    grid: '#2b2b3d',
    gridWidth: 1,
    drawBlock: drawBlockPixel,
  },
];

let activeSkin = SKINS[0];
// Pantalla desde la que se abrió el selector ('start' o 'pause').
let skinsReturnScreen = 'start';

// ---- Funciones de dibujo de bloque -------------------------
// Firma común: (context, x, y, color, size, alpha) con el color ya resuelto.

// Retro: cuadrado plano con banda de highlight — el aspecto original.
function drawBlockRetro(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Neon: contorno brillante con glow y núcleo oscuro.
function drawBlockNeon(context, x, y, color, size, alpha) {
  const inset = Math.max(1, Math.round(size * 0.07));
  const core = Math.max(inset + 1, Math.round(size * 0.17));
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = Math.max(4, Math.round(size * 0.35));
  context.fillStyle = color;
  context.fillRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2);
  // Se resetea el glow para no contaminar el resto del dibujado.
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.fillStyle = 'rgba(8,8,16,0.55)';
  context.fillRect(x * size + core, y * size + core, size - core * 2, size - core * 2);
  context.globalAlpha = 1;
}

// Pastel: bordes redondeados con roundRect y fallback a esquinas recortadas.
function drawBlockPastel(context, x, y, color, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const r = Math.max(2, Math.round(size * 0.22));
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(px, py, s, s, r);
    context.fill();
  } else {
    // Fallback: dos rectángulos cruzados dejan las esquinas recortadas.
    context.fillRect(px + r, py, s - r * 2, s);
    context.fillRect(px, py + r, s, s - r * 2);
  }
  // brillo suave superior
  context.fillStyle = 'rgba(255,255,255,0.28)';
  context.fillRect(px + r, py + 2, s - r * 2, Math.max(2, Math.round(size * 0.1)));
  context.globalAlpha = 1;
}

// Pixel art: relleno plano + textura de puntos y bordes duros de 3px.
// Deja 1px de margen como las demás skins, para que la rejilla siga viéndose.
function drawBlockPixel(context, x, y, color, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const step = Math.max(2, Math.round(size / 10)); // 3px con BLOCK = 30
  const cell = s / 5;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  // textura: puntos oscuros y claros alternados en una rejilla 5x5
  context.fillStyle = 'rgba(0,0,0,0.20)';
  for (let i = 1; i < 5; i += 2)
    for (let j = 1; j < 5; j += 2)
      context.fillRect(px + i * cell, py + j * cell, step, step);
  context.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 5; i += 2)
    for (let j = 0; j < 5; j += 2)
      context.fillRect(px + i * cell, py + j * cell, step, step);
  // bordes pixelados: luz arriba/izquierda, sombra abajo/derecha
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fillRect(px, py, s, step);
  context.fillRect(px, py, step, s);
  context.fillStyle = 'rgba(0,0,0,0.35)';
  context.fillRect(px, py + s - step, s, step);
  context.fillRect(px + s - step, py, step, s);
  context.globalAlpha = 1;
}

// ---- Persistencia ------------------------------------------

function findSkin(id) {
  for (const skin of SKINS) if (skin.id === id) return skin;
  return null;
}

// Degrada a 'retro' si el storage está bloqueado (modo privado) o el valor no vale.
function loadSkinId() {
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    if (raw && findSkin(raw)) return raw;
  } catch (e) {
    /* storage no disponible */
  }
  return 'retro';
}

function saveSkinId(id) {
  try {
    localStorage.setItem(SKIN_KEY, id);
  } catch (e) {
    /* storage no disponible: la skin solo dura la sesión */
  }
}

// ---- Aplicación de la skin ---------------------------------

// Aplica paleta + función de dibujo + cromo de la página. Con repaint = true
// repinta en caliente, sin recargar y sin tocar el loop de animación.
function applySkin(id, repaint) {
  activeSkin = findSkin(id) || SKINS[0];
  document.documentElement.dataset.skin = activeSkin.id;
  renderSkinList();
  if (!repaint) return;
  // Al cargar la página la partida puede no estar inicializada todavía.
  if (typeof draw === 'function' && board && current) draw();
  if (typeof drawNext === 'function' && next) drawNext();
}

function setSkin(id) {
  if (!findSkin(id)) return;
  saveSkinId(id);
  applySkin(id, true);
  // El listado se reconstruye al aplicar: devuelve el foco al botón elegido
  // para no perderlo al navegar con teclado.
  const btn = document.querySelector('#skins-list .skin-btn[data-skin="' + id + '"]');
  if (btn) btn.focus();
}

// ---- Selector ----------------------------------------------

// Pinta un botón por skin en #skins-list y marca la activa.
function renderSkinList() {
  const list = document.getElementById('skins-list');
  if (!list) return;
  list.innerHTML = '';
  for (const skin of SKINS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn skin-btn' + (skin === activeSkin ? ' active' : '');
    btn.dataset.skin = skin.id;
    btn.setAttribute('aria-pressed', skin === activeSkin ? 'true' : 'false');

    const name = document.createElement('span');
    name.textContent = skin === activeSkin ? skin.label + ' ✓' : skin.label;

    const swatches = document.createElement('span');
    swatches.className = 'skin-swatches';
    for (let i = 1; i < skin.palette.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'skin-swatch';
      dot.style.background = skin.palette[i];
      swatches.appendChild(dot);
    }

    btn.appendChild(name);
    btn.appendChild(swatches);
    btn.addEventListener('click', () => setSkin(skin.id));
    list.appendChild(btn);
  }
}

// Guarda la pantalla de origen ANTES de navegar, para que "Volver" acierte.
// El origen llega explícito desde cada botón: no se deduce de ningún global.
function openSkinsScreen(from) {
  skinsReturnScreen = from === 'pause' ? 'pause' : 'start';
  renderSkinList();
  if (typeof showScreen === 'function') showScreen('skins');
}

function closeSkinsScreen() {
  if (typeof showScreen === 'function') showScreen(skinsReturnScreen);
}

function bindSkinButton(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', handler);
}

bindSkinButton('btn-skins', () => openSkinsScreen('start'));
bindSkinButton('btn-skins-pause', () => openSkinsScreen('pause'));
bindSkinButton('btn-back-skins', closeSkinsScreen);

// ---- API pública -------------------------------------------

window.Skins = {
  // Dibuja un bloque con la skin activa. Firma equivalente a drawBlock().
  drawBlock(context, x, y, colorIndex, size, alpha) {
    // Si una paleta se queda corta, se cae a la de game.js antes que no pintar.
    const color = activeSkin.palette[colorIndex] || COLORS[colorIndex];
    if (!color) return;
    activeSkin.drawBlock(context, x, y, color, size, alpha);
  },
  // Dibuja la rejilla con el color de la skin activa. Devuelve true si la pintó.
  drawGrid(context, cols, rows, block) {
    context.strokeStyle = activeSkin.grid;
    context.lineWidth = activeSkin.gridWidth;
    for (let c = 1; c < cols; c++) {
      context.beginPath();
      context.moveTo(c * block, 0);
      context.lineTo(c * block, rows * block);
      context.stroke();
    }
    for (let r = 1; r < rows; r++) {
      context.beginPath();
      context.moveTo(0, r * block);
      context.lineTo(cols * block, r * block);
      context.stroke();
    }
    return true;
  },
  color(colorIndex) {
    return activeSkin.palette[colorIndex] || COLORS[colorIndex] || null;
  },
  current() {
    return activeSkin.id;
  },
  list() {
    return SKINS.map(skin => ({ id: skin.id, label: skin.label }));
  },
  set: setSkin,
  render: renderSkinList,
};

// Skin persistida aplicada al cargar la página.
applySkin(loadSkinId(), true);
