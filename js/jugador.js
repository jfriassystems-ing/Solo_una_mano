// ============================================
// VISTA JUGADOR (celular)
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    if (!salaId || !jugadorNum) { window.location.href = 'index.html'; return; }
    renderVistaJugador();
});

async function renderVistaJugador() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex flex-col min-h-screen py-4 max-w-md mx-auto w-full px-2">
            <div class="text-center mb-2">
                <span id="nombre-badge" class="bg-emerald-800 text-emerald-200 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider cursor-pointer" onclick="editarNombre()">
                    Jugador ${jugadorNum} ✏️
                </span>
                <h2 id="estado-turno" class="text-base font-medium text-slate-300 mt-2">Sincronizando...</h2>
                <div id="mesa-extremos" class="text-xs text-emerald-400 mt-1 font-semibold"></div>
                <div id="contador-pozo" class="text-xs text-slate-400 mt-1"></div>
                <div id="ultima-accion" class="text-[10px] text-slate-500 mt-1 italic"></div>

                ${conMesa ? `
                    <div class="mt-2 mb-1">
                        <button onclick="mostrarQRCel()" class="bg-purple-600 hover:bg-purple-500 text-[11px] font-bold py-1.5 px-4 rounded-lg transition shadow">
                            📱 Compartir con otros jugadores
                        </button>
                    </div>
                ` : ''}
            </div>

            <div id="panel-mesa" class="${conMesa ? '' : 'hidden'} mb-3 bg-black/40 rounded-xl border border-white/10 p-2">
                <div class="text-[10px] text-slate-400 mb-1 text-center uppercase tracking-wider">Mesa</div>
                <div id="tablero-mini" class="board-scroll flex items-center justify-center overflow-x-auto min-h-[70px] gap-1 py-1">
                    <span class="text-slate-500 text-xs italic">Esperando...</span>
                </div>
            </div>

            <div class="my-2">
                <h3 class="text-xs text-slate-400 mb-2 text-center uppercase tracking-wider">
                    Tus Fichas · <span id="mis-puntos" class="text-emerald-400 font-bold">0 pts</span>
                </h3>
                <div id="mano-jugador" class="flex flex-wrap justify-center gap-2 px-1"></div>
            </div>

            <div class="mt-3 space-y-2 px-1 pb-4">
                <div id="acciones-container" class="flex gap-2 justify-center flex-wrap"></div>
                <div id="contadores-otros" class="text-center text-xs text-slate-400"></div>
            </div>
        </div>

        <!-- Modal QRs (solo modo con mesa) -->
        <div id="modal-qr-cel" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
            <div class="bg-slate-800 border border-slate-700 p-5 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 class="text-base font-bold mb-1 text-emerald-400 text-center">📱 Compartir con otros jugadores</h3>
                <p class="text-[10px] text-slate-400 mb-4 text-center">Cada uno escanea su QR. Verán la mesa + su mano.</p>
                <div id="qr-container-cel" class="flex flex-wrap justify-center gap-3 mb-4"></div>
                <button onclick="cerrarQRCel()" class="w-full text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 py-2 rounded-lg">Cerrar</button>
            </div>
        </div>

        <!-- Modal elección de lado -->
        <div id="modal-lado" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
            <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-xs w-full text-center shadow-2xl">
                <h3 class="text-lg font-bold mb-3 text-emerald-400">¿Dónde jugar la ficha?</h3>
                <p id="modal-ficha-txt" class="text-sm text-slate-300 mb-4 font-mono"></p>
                <div class="flex gap-3">
                    <button onclick="ejecutarJugadaLado('izq')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold py-2.5 rounded-xl">Izquierda</button>
                    <button onclick="ejecutarJugadaLado('der')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold py-2.5 rounded-xl">Derecha</button>
                </div>
                <button onclick="cerrarModalLado()" class="mt-3 text-xs text-slate-400 hover:text-white">Cancelar</button>
            </div>
        </div>

        <!-- Modal fin de ronda -->
        <div id="modal-fin" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
            <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                <h3 id="fin-titulo-cel" class="text-xl font-bold mb-3"></h3>
                <div id="fin-detalle-cel" class="text-sm text-slate-300 mb-4"></div>
                <div id="fin-marcador-cel" class="bg-slate-900 rounded-xl p-3 mb-4 text-xs"></div>
                <button onclick="iniciarNuevaRonda()" id="btn-fin-cel" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-xl text-sm">
                    Siguiente Ronda
                </button>
            </div>
        </div>
    `;

    const partida = await asegurarReparto(jugadorNum);
    if (!partida) { alert("Sala no encontrada"); return; }
    actualizarInterfazJugador(partida);

    supabaseClient
        .channel('room-jugador-' + jugadorNum + '-' + salaId)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'partidas',
            filter: `sala_id=eq.${salaId}`
        }, payload => {
            actualizarInterfazJugador(payload.new);
        })
        .subscribe();
}

async function editarNombre() {
    const { data } = await supabaseClient.from('partidas').select('nombres').eq('sala_id', salaId).single();
    const actual = data?.nombres?.[jugadorNum] || `J${jugadorNum}`;
    const nombre = prompt("Tu nombre (máx. 12 caracteres):", actual);
    if (nombre) {
        await guardarNombre(nombre);
        document.getElementById('nombre-badge').innerHTML = `${nombre} ✏️`;
    }
}

function actualizarInterfazJugador(partida) {
    window.estadoGlobal = partida;
    const nombres = partida.nombres || {};
    const esTuTurno = partida.turno == jugadorNum && partida.estado === 'jugando';
    const estadoTurno = document.getElementById('estado-turno');
    const mesaExtremos = document.getElementById('mesa-extremos');
    const contadorPozo = document.getElementById('contador-pozo');
    const manoEl = document.getElementById('mano-jugador');
    const accionesEl = document.getElementById('acciones-container');
    const contadoresOtros = document.getElementById('contadores-otros');
    const ultimaAccion = document.getElementById('ultima-accion');

    document.getElementById('nombre-badge').innerHTML = `${nombres[jugadorNum] || 'J' + jugadorNum} ✏️`;

    if (ultimaAccion) ultimaAccion.innerText = partida.ultima_accion || '';

    // Estados de fin
    const modalFin = document.getElementById('modal-fin');
    if (partida.estado === 'ronda_terminada' || partida.estado === 'partida_terminada') {
        mostrarFinJugador(partida);
        modalFin.style.display = 'flex';
        return;
    } else {
        modalFin.style.display = 'none';
    }

    // Turno
    if (esTuTurno) {
        estadoTurno.innerHTML = "🟢 ¡Es tu turno!";
        estadoTurno.className = "text-base font-bold text-emerald-400 mt-2 animate-pulse";
    } else {
        estadoTurno.innerHTML = `⏳ Turno de ${nombres[partida.turno] || 'J' + partida.turno}`;
        estadoTurno.className = "text-base font-medium text-slate-400 mt-2";
    }

    // Extremos
    const tablero = partida.tablero || [];
    let izq = null, der = null;
    if (tablero.length > 0) {
        izq = tablero[0][0];
        der = tablero[tablero.length - 1][1];
        mesaExtremos.innerHTML = `Extremos: [${izq}] ↔ [${der}]`;
    } else {
        mesaExtremos.innerHTML = `Mesa vacía`;
    }
    if (contadorPozo) contadorPozo.innerHTML = `Pozo: ${(partida.pozo || []).length} fichas`;

    // Contadores de rivales
    if (contadoresOtros) {
        let html = '<div class="flex justify-center gap-2 flex-wrap">';
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == jugadorNum) continue;
            const mano = (partida.manos && partida.manos[i]) ? partida.manos[i] : [];
            const nombre = nombres[i] || `J${i}`;
            const esTurno = partida.turno == i;
            const unido = partida.manos && partida.manos[i];
            html += `<span class="px-2 py-0.5 rounded ${esTurno ? 'bg-emerald-700 font-bold' : 'bg-slate-800'} ${!unido ? 'opacity-40' : ''}">
                ${nombre}: ${unido ? `${mano.length}🁢 · ${contarPuntos(mano)}pts` : 'sin unir'}
            </span>`;
        }
        html += '</div>';
        contadoresOtros.innerHTML = html;
    }

    // Mini tablero (visible cuando conMesa=1)
    const tableroMini = document.getElementById('tablero-mini');
    if (tableroMini && conMesa) {
        if (tablero.length > 0) {
            let html = '<div class="flex items-center gap-0.5">';
            tablero.forEach((f, idx) => {
                const esDoble = f[0] === f[1];
                if (idx === 0 || esDoble) {
                    html += fichaHTML(f, 'v', 'sm');
                } else {
                    html += fichaHTML(f, 'h', 'sm');
                }
            });
            html += '</div>';
            tableroMini.innerHTML = html;
        } else {
            tableroMini.innerHTML = `<span class="text-slate-500 text-xs italic">Mesa limpia</span>`;
        }
    }

    // Mano propia
    const misFichas = (partida.manos && partida.manos[jugadorNum]) ? partida.manos[jugadorNum] : [];
    const misPuntos = document.getElementById('mis-puntos');
    if (misPuntos) misPuntos.innerText = `${contarPuntos(misFichas)} pts`;

    const validasSet = new Set(fichasValidas(misFichas, tablero));

    manoEl.innerHTML = misFichas.map((f, index) => {
        const valida = validasSet.has(index);
        return `
            <button onclick='intentarJugarFicha(${index}, ${JSON.stringify(f)})'
                ${!esTuTurno ? 'disabled' : ''}
                class="domino-tile p-1 text-slate-800 font-bold flex flex-col items-center justify-center w-[50px] h-[92px] shadow-xl relative
                ${!esTuTurno ? 'opacity-40 cursor-not-allowed' : (valida ? 'border-emerald-500 hover:scale-105 ring-2 ring-emerald-500/50' : 'opacity-70 border-slate-400')}">
                <div class="flex-1 w-full flex items-center justify-center">${pintarPuntos(f[0])}</div>
                <div class="w-full h-[2px] bg-slate-300 my-0.5"></div>
                <div class="flex-1 w-full flex items-center justify-center">${pintarPuntos(f[1])}</div>
            </button>
        `;
    }).join('');

    // Acciones
    accionesEl.innerHTML = '';
    if (esTuTurno) {
        const tieneValidas = validasSet.size > 0;
        const pozoRestante = (partida.pozo || []).length;

        if (pozoRestante > 0 && !tieneValidas) {
            accionesEl.innerHTML += `
                <button onclick="robarDelPozo()" class="bg-blue-600 hover:bg-blue-500 font-bold py-2.5 px-4 rounded-xl shadow-lg text-sm flex-1">
                    🎴 Robar del pozo (${pozoRestante})
                </button>
            `;
        } else if (!tieneValidas && pozoRestante === 0) {
            accionesEl.innerHTML += `
                <button onclick="pasarTurno()" class="bg-amber-600 hover:bg-amber-500 font-bold py-2.5 px-4 rounded-xl shadow-lg text-sm flex-1">
                    ⏭️ Pasar Turno
                </button>
            `;
        }
    }
}

function mostrarFinJugador(partida) {
    const nombres = partida.nombres || {};
    const puntos = partida.puntos_acumulados || {};
    const titulo = document.getElementById('fin-titulo-cel');
    const detalle = document.getElementById('fin-detalle-cel');
    const marcador = document.getElementById('fin-marcador-cel');
    const btn = document.getElementById('btn-fin-cel');

    if (partida.estado === 'partida_terminada') {
        const gano = partida.ganador_partida == jugadorNum;
        titulo.innerHTML = gano ? '🏆 ¡GANASTE LA PARTIDA! 🏆' : `🏆 Ganó ${nombres[partida.ganador_partida] || 'J' + partida.ganador_partida}`;
        detalle.innerHTML = `Alcanzó los ${partida.objetivo_puntos} puntos.`;
        btn.innerText = 'Nueva Partida';
        btn.onclick = reiniciarPartida;
    } else {
        const gano = partida.ganador_ronda == jugadorNum;
        titulo.innerHTML = gano ? '🎉 ¡Ganaste la ronda!' : `🎉 Ganó ${nombres[partida.ganador_ronda] || 'J' + partida.ganador_ronda}`;
        let ptsGanados = 0;
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == partida.ganador_ronda) continue;
            ptsGanados += contarPuntos(partida.manos[i] || []);
        }
        detalle.innerHTML = gano ? `Sumaste <strong class="text-emerald-400">+${ptsGanados} puntos</strong>` : `Sumó <strong>+${ptsGanados} puntos</strong>`;
        btn.innerText = 'Siguiente Ronda';
        btn.onclick = iniciarNuevaRonda;
    }

    let html = '';
    const ordenados = Object.entries(puntos).sort((a, b) => b[1] - a[1]);
    ordenados.forEach(([j, p]) => {
        const esYo = j == jugadorNum;
        const esGanador = j == partida.ganador_ronda || j == partida.ganador_partida;
        html += `
            <div class="flex justify-between items-center px-3 py-1.5 rounded-lg mb-1 ${esGanador ? 'bg-emerald-700/50 border border-emerald-500' : 'bg-slate-800'}">
                <span class="${esYo ? 'font-bold text-emerald-300' : ''}">${esYo ? '👤 ' : ''}${nombres[j] || 'J' + j}</span>
                <span class="font-bold">${p} pts</span>
            </div>
        `;
    });
    marcador.innerHTML = html;
}

// ============ ACCIONES DE JUEGO ============

async function intentarJugarFicha(indexFicha, ficha) {
    const partida = window.estadoGlobal;
    if (!partida || partida.turno != jugadorNum) return;

    const tablero = partida.tablero || [];
    if (tablero.length === 0) {
        colocarFicha(indexFicha, ficha, 'der');
        sonar('colocar');
        return;
    }

    const izq = tablero[0][0];
    const der = tablero[tablero.length - 1][1];
    const coincideIzq = (ficha[0] === izq || ficha[1] === izq);
    const coincideDer = (ficha[0] === der || ficha[1] === der);

    if (!coincideIzq && !coincideDer) {
        alert("Esta ficha no empareja con ningún extremo.");
        return;
    }

    if (coincideIzq && coincideDer && izq !== der) {
        window.fichaPendiente = { index: indexFicha, valor: ficha };
        document.getElementById('modal-ficha-txt').innerText = `Ficha [${ficha[0]} | ${ficha[1]}] coincide en ambos extremos.`;
        document.getElementById('modal-lado').style.display = 'flex';
    } else if (coincideIzq) {
        colocarFicha(indexFicha, ficha, 'izq');
        sonar('colocar');
    } else {
        colocarFicha(indexFicha, ficha, 'der');
        sonar('colocar');
    }
}

function ejecutarJugadaLado(lado) {
    document.getElementById('modal-lado').style.display = 'none';
    colocarFicha(window.fichaPendiente.index, window.fichaPendiente.valor, lado);
    sonar('colocar');
}

function cerrarModalLado() {
    document.getElementById('modal-lado').style.display = 'none';
}

// ============ COMPARTIR QRs (modo con mesa) ============

function mostrarQRCel() {
    const modal = document.getElementById('modal-qr-cel');
    if (!modal) {
        alert("Este modo no permite compartir QRs.");
        return;
    }
    generarQRCel();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function cerrarQRCel() {
    const modal = document.getElementById('modal-qr-cel');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function generarQRCel() {
    const container = document.getElementById('qr-container-cel');
    if (!container) return;
    container.innerHTML = '';

    const numJugadores = window.estadoGlobal?.num_jugadores || 4;
    const baseUrl = window.location.origin + window.location.pathname;

    for (let i = 1; i <= numJugadores; i++) {
        const esYo = (i == jugadorNum);
        const wrapper = document.createElement('div');

        if (esYo) {
            wrapper.className = 'bg-emerald-900/60 border border-emerald-600 p-3 rounded-lg flex flex-col items-center';
            wrapper.innerHTML = `
                <span class="text-emerald-300 font-bold text-[10px] mb-1">Tú (J${i})</span>
                <div class="w-[90px] h-[90px] flex items-center justify-center text-3xl">👤</div>
            `;
        } else {
            wrapper.className = 'bg-white p-3 rounded-lg flex flex-col items-center shadow-lg';
            wrapper.innerHTML = `
                <span class="text-slate-800 font-bold text-[10px] mb-1">Jugador ${i}</span>
                <div id="qr-cel-${i}"></div>
                <a href="${baseUrl}?sala=${salaId}&jugador=${i}&mesa=1"
                   class="mt-1 text-[9px] text-emerald-700 font-bold underline">Abrir aquí</a>
            `;
        }
        container.appendChild(wrapper);

        if (!esYo) {
            const url = `${baseUrl}?sala=${salaId}&jugador=${i}&mesa=1`;
            new QRCode(document.getElementById(`qr-cel-${i}`), {
                text: url,
                width: 90,
                height: 90
            });
        }
    }
}