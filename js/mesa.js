// ============================================
// VISTA MESA (iPad)
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    if (!salaId) { window.location.href = 'index.html'; return; }
    renderVistaMesa();
});

async function renderVistaMesa() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="wood-table min-h-screen p-3 md:p-6 flex flex-col rounded-none md:rounded-3xl shadow-2xl">
            <div class="flex flex-wrap justify-between items-center gap-3 bg-black/40 backdrop-blur p-3 rounded-2xl border border-white/10">
                <div>
                    <h2 class="text-lg md:text-xl font-bold text-emerald-300">🁣 Mesa Central</h2>
                    <p class="text-xs text-slate-300">
                        Sala: <span class="font-mono font-bold text-white">${salaId}</span>
                        · Ronda <span id="num-ronda" class="font-bold">1</span>
                        · A <span id="objetivo-txt" class="font-bold">100</span> pts
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <div id="contadores-jugadores" class="flex gap-1.5 flex-wrap"></div>
                    <button onclick="reiniciarPartida()" class="bg-amber-600 hover:bg-amber-500 text-xs font-bold py-2 px-3 rounded-xl transition shadow cursor-pointer" title="Reiniciar partida completa">
                        🔄
                    </button>
                    <button onclick="toggleQRs()" class="bg-slate-600 hover:bg-slate-500 text-xs font-bold py-2 px-3 rounded-xl transition shadow cursor-pointer" title="Mostrar/ocultar QRs">
                        📱
                    </button>
                    <div id="turno-info" class="text-xs md:text-sm bg-emerald-900/80 px-3 py-2 rounded-xl border border-emerald-500/50">
                        Cargando...
                    </div>
                </div>
            </div>

            <div class="my-3 flex justify-center gap-2 flex-wrap">
                <div class="inline-block bg-black/40 px-4 py-2 rounded-xl border border-white/10 text-xs md:text-sm text-emerald-300 font-semibold" id="extremos-info">
                    Extremos: -- ↔ --
                </div>
                <div class="inline-block bg-black/40 px-4 py-2 rounded-xl border border-white/10 text-xs md:text-sm text-slate-300" id="accion-info">
                    Esperando...
                </div>
            </div>

            <!-- Superficie de la mesa (con textura tipo fieltro) -->
            <div id="tablero-central" class="mesa-superficie flex-1 my-2 overflow-auto min-h-[220px] flex items-center justify-center">
                <span class="text-slate-300 italic">Esperando que los jugadores escaneen sus QRs...</span>
            </div>

            <div id="panel-qr" class="bg-black/50 backdrop-blur p-3 rounded-2xl border border-white/10">
                <h3 class="text-xs md:text-sm font-semibold text-slate-300 mb-3 text-center">📱 Escanea con cada celular para unirte (verás la mesa + tu mano):</h3>
                <div id="qr-container" class="flex flex-wrap justify-center gap-4"></div>
            </div>

            <div id="panel-fin-ronda" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm items-center justify-center p-4 z-50">
                <div class="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
                    <h3 id="fin-titulo" class="text-2xl font-bold mb-4 text-emerald-400"></h3>
                    <div id="fin-detalle" class="text-sm text-slate-300 mb-6"></div>
                    <div id="fin-marcador" class="bg-slate-900 rounded-xl p-4 mb-4"></div>
                    <button onclick="iniciarNuevaRonda()" id="btn-nueva-ronda" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-xl">
                        Siguiente Ronda
                    </button>
                </div>
            </div>
        </div>
    `;

    const { data } = await supabaseClient.from('partidas').select('*').eq('sala_id', salaId).single();
    if (!data) { alert("Sala no encontrada"); return; }

    // Generar QRs — apuntan a jugador.html con &mesa=1
    const baseUrl = window.location.origin + window.location.pathname.replace('mesa.html', '');
    const qrContainer = document.getElementById('qr-container');
    for (let i = 1; i <= data.num_jugadores; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'bg-white p-3 rounded-xl flex flex-col items-center shadow-lg';
        wrapper.innerHTML = `
            <span class="text-slate-800 font-bold text-xs mb-2">Jugador ${i}</span>
            <div id="qr-${i}"></div>
            <a href="${baseUrl}jugador.html?sala=${salaId}&jugador=${i}&mesa=1" class="mt-2 text-[10px] text-emerald-700 font-bold underline">Abrir aquí</a>
        `;
        qrContainer.appendChild(wrapper);
        const jugadorUrl = `${baseUrl}jugador.html?sala=${salaId}&jugador=${i}&mesa=1`;
        new QRCode(document.getElementById(`qr-${i}`), { text: jugadorUrl, width: 90, height: 90 });
    }

    document.getElementById('objetivo-txt').innerText = data.objetivo_puntos || 100;
    actualizarInterfazMesa(data);
    suscripcionMesa();
}

function actualizarInterfazMesa(partida) {
    window.estadoGlobal = partida;
    const turnoInfo = document.getElementById('turno-info');
    const extremosInfo = document.getElementById('extremos-info');
    const accionInfo = document.getElementById('accion-info');
    const contadores = document.getElementById('contadores-jugadores');
    const numRondaEl = document.getElementById('num-ronda');

    if (numRondaEl) numRondaEl.innerText = partida.num_ronda || 1;
    if (accionInfo) accionInfo.innerText = partida.ultima_accion || '—';

    const nombres = partida.nombres || {};
    const puntos = partida.puntos_acumulados || {};

    if (contadores) {
        let html = '';
        for (let i = 1; i <= partida.num_jugadores; i++) {
            const mano = (partida.manos && partida.manos[i]) ? partida.manos[i] : [];
            const nombre = nombres[i] || `J${i}`;
            const esTurno = partida.turno == i && partida.estado === 'jugando';
            const unido = partida.manos && partida.manos[i];
            html += `
                <div class="text-[10px] md:text-xs px-2 py-1 rounded-lg border ${esTurno ? 'bg-emerald-600 border-emerald-400 font-bold' : 'bg-slate-800/60 border-slate-600'} ${!unido ? 'opacity-50' : ''}">
                    <div>${nombre}</div>
                    <div class="text-[10px] opacity-80">${unido ? `${mano.length}🁢 · ${puntos[i] || 0}pts` : 'sin unir'}</div>
                </div>
            `;
        }
        contadores.innerHTML = html;
    }

    if (partida.estado === 'jugando') {
        turnoInfo.innerHTML = `Turno: <strong class="text-white">${nombres[partida.turno] || 'J' + partida.turno}</strong>`;
    } else if (partida.estado === 'ronda_terminada') {
        turnoInfo.innerHTML = `<strong class="text-yellow-400">🏁 Fin de ronda</strong>`;
    } else if (partida.estado === 'partida_terminada') {
        turnoInfo.innerHTML = `<strong class="text-yellow-400">🏆 ¡Partida terminada!</strong>`;
    }

    const tablero = partida.tablero || [];
    if (tablero.length > 0) {
        const izq = tablero[0][0];
        const der = tablero[tablero.length - 1][1];
        extremosInfo.innerHTML = `Extremos: <span class="text-white font-bold">[${izq}]</span> ↔ <span class="text-white font-bold">[${der}]</span> · Pozo: ${(partida.pozo || []).length}`;
    } else {
        extremosInfo.innerHTML = `Mesa vacía · Pozo: ${(partida.pozo || []).length}`;
    }

    // Renderizar tablero como mesa REAL (serpenteante con dobles perpendiculares)
    const tableroEl = document.getElementById('tablero-central');
    if (tableroEl) {
        tableroEl.innerHTML = renderMesaReal(tablero, 'md');
    }

    // Ocultar QRs si todos los jugadores ya se unieron
    const panelQR = document.getElementById('panel-qr');
    if (panelQR) {
        const todosUnidos = Object.keys(partida.manos || {}).length >= partida.num_jugadores;
        if (todosUnidos && partida.estado === 'jugando') {
            panelQR.style.display = 'none';
        } else {
            panelQR.style.display = 'block';
        }
    }

    const panel = document.getElementById('panel-fin-ronda');
    if (partida.estado === 'ronda_terminada' || partida.estado === 'partida_terminada') {
        mostrarPanelFin(partida);
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

function mostrarPanelFin(partida) {
    const nombres = partida.nombres || {};
    const puntos = partida.puntos_acumulados || {};
    const titulo = document.getElementById('fin-titulo');
    const detalle = document.getElementById('fin-detalle');
    const marcador = document.getElementById('fin-marcador');
    const btn = document.getElementById('btn-nueva-ronda');

    if (partida.estado === 'partida_terminada') {
        titulo.innerHTML = `🏆 ¡${nombres[partida.ganador_partida] || 'J' + partida.ganador_partida} ganó la partida! 🏆`;
        detalle.innerHTML = `Alcanzó los ${partida.objetivo_puntos} puntos.`;
        btn.innerText = 'Nueva Partida';
        btn.onclick = reiniciarPartida;
    } else {
        titulo.innerHTML = `🎉 ${nombres[partida.ganador_ronda] || 'J' + partida.ganador_ronda} ganó la ronda`;
        let ptsGanados = 0;
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == partida.ganador_ronda) continue;
            ptsGanados += contarPuntos(partida.manos[i] || []);
        }
        detalle.innerHTML = `Sumó <strong class="text-emerald-400">+${ptsGanados} puntos</strong> de los rivales.`;
        btn.innerText = 'Siguiente Ronda';
        btn.onclick = iniciarNuevaRonda;
    }

    let html = '<div class="space-y-2">';
    const ordenados = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    ordenados.forEach(([j, p]) => {
        const esGanador = j == partida.ganador_ronda || j == partida.ganador_partida;
        html += `
            <div class="flex justify-between items-center px-3 py-2 rounded-lg ${esGanador ? 'bg-emerald-700/50 border border-emerald-500' : 'bg-slate-800'}">
                <span class="font-semibold">${nombres[j] || 'J' + j}</span>
                <span class="font-bold text-emerald-300">${p} pts</span>
            </div>
        `;
    });
    html += '</div>';
    marcador.innerHTML = html;
}

function suscripcionMesa() {
    supabaseClient
        .channel('room-mesa-' + salaId)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'partidas',
            filter: `sala_id=eq.${salaId}`
        }, payload => {
            actualizarInterfazMesa(payload.new);
            sonar('actualizar');
        })
        .subscribe();
}

function toggleQRs() {
    const panel = document.getElementById('panel-qr');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}