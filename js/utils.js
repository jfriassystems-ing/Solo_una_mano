// ============================================
// UTILIDADES GENERALES v3 (tablero camino)
// ============================================

// Genera las 28 fichas del dominó estándar (doble-6), mezcladas
function generarFichas() {
    let fichas = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            fichas.push([i, j]);
        }
    }
    return fichas.sort(() => Math.random() - 0.5);
}

// Suma los puntos (pips) de una mano
function contarPuntos(mano) {
    if (!mano || !Array.isArray(mano)) return 0;
    return mano.reduce((sum, f) => sum + f[0] + f[1], 0);
}

// Dibuja los puntos de un valor (0-6) en cuadrícula 3x3
function pintarPuntos(valor) {
    const posiciones = {
        0: [],
        1: [[1,1]],
        2: [[0,0],[2,2]],
        3: [[0,0],[1,1],[2,2]],
        4: [[0,0],[0,2],[2,0],[2,2]],
        5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
        6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]]
    };
    const pips = posiciones[valor] || [];
    let html = '<div class="pip-grid">';
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const activo = pips.some(p => p[0] === r && p[1] === c);
            html += `<div class="pip ${activo ? '' : 'pip-empty'}"></div>`;
        }
    }
    html += '</div>';
    return html;
}

// Genera el HTML de una ficha (dentro de una celda)
function fichaHTML(ficha, orientacion = 'v') {
    if (orientacion === 'v') {
        return `
            <div class="domino-tile domino-v">
                <div class="half">${pintarPuntos(ficha[0])}</div>
                <div class="divider"></div>
                <div class="half">${pintarPuntos(ficha[1])}</div>
            </div>
        `;
    }
    return `
        <div class="domino-tile domino-h">
            <div class="half">${pintarPuntos(ficha[0])}</div>
            <div class="divider"></div>
            <div class="half">${pintarPuntos(ficha[1])}</div>
        </div>
    `;
}

// Detección de fichas válidas según tablero
function fichasValidas(mano, tablero) {
    if (!mano) return [];
    if (!tablero || tablero.length === 0) return mano.map((_, i) => i);
    const izq = tablero[0][0];
    const der = tablero[tablero.length - 1][1];
    return mano
        .map((f, i) => (f[0] === izq || f[1] === izq || f[0] === der || f[1] === der) ? i : -1)
        .filter(i => i !== -1);
}

// Genera un ID de sala aleatorio
function nuevoSalaId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============================================
// CAMINO DEL TABLERO (serpentina)
// ============================================
// Coordenadas tipo Excel. La primera ficha va en el CENTRO (índice 13 = E8).
// Cuando alguien juega a la izquierda → índice -1
// Cuando alguien juega a la derecha → índice +1
const CAMINO = [
    // Brazo izquierdo arriba (6 celdas) - índices 0-5
    { col: 2, fila: 4, orient: 'v' },  // B4
    { col: 2, fila: 3, orient: 'v' },  // B3
    { col: 2, fila: 2, orient: 'v' },  // B2
    { col: 2, fila: 1, orient: 'v' },  // B1
    { col: 3, fila: 1, orient: 'h' },  // C1
    { col: 4, fila: 1, orient: 'h' },  // D1
    // Columna central (15 celdas) - índices 6-20
    { col: 5, fila: 1,  orient: 'v' }, // E1
    { col: 5, fila: 2,  orient: 'v' }, // E2
    { col: 5, fila: 3,  orient: 'v' }, // E3
    { col: 5, fila: 4,  orient: 'v' }, // E4
    { col: 5, fila: 5,  orient: 'v' }, // E5
    { col: 5, fila: 6,  orient: 'v' }, // E6
    { col: 5, fila: 7,  orient: 'v' }, // E7
    { col: 5, fila: 8,  orient: 'v' }, // E8 ← CENTRO (índice 13)
    { col: 5, fila: 9,  orient: 'v' }, // E9
    { col: 5, fila: 10, orient: 'v' }, // E10
    { col: 5, fila: 11, orient: 'v' }, // E11
    { col: 5, fila: 12, orient: 'v' }, // E12
    { col: 5, fila: 13, orient: 'v' }, // E13
    { col: 5, fila: 14, orient: 'v' }, // E14
    { col: 5, fila: 15, orient: 'v' }, // E15
    // Brazo derecho abajo (7 celdas) - índices 21-27
    { col: 6, fila: 15, orient: 'h' }, // F15
    { col: 7, fila: 15, orient: 'h' }, // G15
    { col: 8, fila: 15, orient: 'h' }, // H15
    { col: 8, fila: 14, orient: 'v' }, // H14
    { col: 8, fila: 13, orient: 'v' }, // H13
    { col: 8, fila: 12, orient: 'v' }, // H12
    { col: 8, fila: 11, orient: 'v' }  // H11
];

const CELDA_CENTRO = 13; // índice de E8 en CAMINO

// Coloca una ficha en la posición indicada del camino
function celdaEnPosicion(index, ficha) {
    if (index < 0 || index >= CAMINO.length) return '';
    const c = CAMINO[index];
    return `
        <div class="celda-ficha" style="grid-column:${c.col}; grid-row:${c.fila};">
            ${fichaHTML(ficha, c.orient)}
        </div>
    `;
}

// Renderiza todas las celdas del camino (vacías o con fichas)
function renderMesaCamino(tableroPos, tableroViejo, ultimaJugada) {
    // tableroPos: array de { celda: index, ficha: [a,b] }
    const posiciones = tableroPos || [];

    let html = '<div class="mesa-camino">';

    // 1. Pintar todas las celdas del camino (fondo)
    CAMINO.forEach((c, i) => {
        const tieneFicha = posiciones.find(p => p.celda === i);
        const esUltima = ultimaJugada === i;
        html += `<div class="celda ${tieneFicha ? 'ocupada' : ''} ${esUltima ? 'nueva' : ''}"
                      style="grid-column:${c.col}; grid-row:${c.fila};"
                      data-celda="${i}"></div>`;
    });

    // 2. Pintar las fichas encima
    posiciones.forEach(p => {
        const c = CAMINO[p.celda];
        if (!c) return;
        html += `
            <div class="celda-ficha" style="grid-column:${c.col}; grid-row:${c.fila};">
                ${fichaHTML(p.ficha, c.orient)}
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// ============================================
// SONIDOS con Howler.js
// ============================================
let sonidosCargados = false;
const sonidos = {};

function inicializarSonidos() {
    if (sonidosCargados || typeof Howl === 'undefined') return;
    ['colocar','robar','turno','ganar','tranca','error','actualizar'].forEach(n => {
        sonidos[n] = new Howl({
            src: [`sounds/${n}.mp3`],
            volume: 0.5,
            preload: true,
            onloaderror: () => console.warn(`⚠️ No se pudo cargar sounds/${n}.mp3`)
        });
    });
    sonidosCargados = true;
}

function sonar(nombre) {
    try {
        if (!sonidosCargados) inicializarSonidos();
        if (sonidos[nombre]) sonidos[nombre].play();
    } catch (e) {}
}

// ============================================
// VIBRACIÓN MÓVIL
// ============================================
function vibrar(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

// ============================================
// WAKE LOCK
// ============================================
let wakeLock = null;
async function activarWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) {}
}
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        activarWakeLock();
    }
});