// ============================================
// UTILIDADES GENERALES
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

// Genera el HTML de una ficha con orientación y tamaño
function fichaHTML(ficha, orientacion = 'v', tamaño = 'md') {
    const sizesV = { 
    sm: 'w-[28px] h-[56px]',    // ← antes 36x72
    md: 'w-[48px] h-[96px]', 
    lg: 'w-[60px] h-[120px]' 
};
const sizesH = { 
    sm: 'w-[56px] h-[28px]',    // ← antes 72x36
    md: 'w-[96px] h-[48px]', 
    lg: 'w-[120px] h-[60px]' 
};

    if (orientacion === 'v') {
        return `
            <div class="domino-tile domino-v ${sizesV[tamaño]} flex-shrink-0">
                <div class="flex-1 w-full flex items-center justify-center">${pintarPuntos(ficha[0])}</div>
                <div class="divider"></div>
                <div class="flex-1 w-full flex items-center justify-center">${pintarPuntos(ficha[1])}</div>
            </div>
        `;
    }
    return `
        <div class="domino-tile domino-h ${sizesH[tamaño]} flex-shrink-0">
            <div class="flex-1 h-full flex items-center justify-center">${pintarPuntos(ficha[0])}</div>
            <div class="divider"></div>
            <div class="flex-1 h-full flex items-center justify-center">${pintarPuntos(ficha[1])}</div>
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

// Reproduce un sonido (los archivos deben existir en /sounds/)
function sonar(nombre) {
    try {
        const audio = new Audio(`sounds/${nombre}.mp3`);
        audio.volume = 0.4;
        audio.play().catch(() => {});
    } catch (e) {}
}

// Genera un ID de sala aleatorio
function nuevoSalaId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}