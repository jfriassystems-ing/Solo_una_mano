// ============================================
// LÓGICA DEL JUEGO v3 (tablero camino)
// ============================================

// Determina qué jugador sale (primera ronda = [6|6], después rota)
function jugadorInicial(manos, numJugadores, numRonda = 1, ganadorAnterior = null) {
    if (numRonda > 1 && ganadorAnterior) {
        return ganadorAnterior;
    }
    for (let i = 1; i <= numJugadores; i++) {
        const mano = manos[i] || [];
        if (mano.some(f => f[0] === 6 && f[1] === 6)) return i;
    }
    let mejorJugador = 1;
    let mejorPuntaje = -1;
    for (let i = 1; i <= numJugadores; i++) {
        const mano = manos[i] || [];
        const maxFicha = Math.max(...mano.map(f => f[0] + f[1]), 0);
        if (maxFicha > mejorPuntaje) {
            mejorPuntaje = maxFicha;
            mejorJugador = i;
        }
    }
    return mejorJugador;
}

// Ganador por tranca (menor puntaje)
function ganadorPorTranca(manos, numJugadores) {
    let menorPuntaje = Infinity;
    let ganador = null;
    for (let i = 1; i <= numJugadores; i++) {
        const pts = contarPuntos(manos[i] || []);
        if (pts < menorPuntaje) {
            menorPuntaje = pts;
            ganador = i;
        }
    }
    return ganador;
}

// Calcula el índice de la celda donde va la nueva ficha
// En función del lado elegido y de las posiciones actuales
function calcularIndiceCelda(tableroPos, lado) {
    if (!tableroPos || tableroPos.length === 0) {
        return CELDA_CENTRO; // Primera ficha → centro
    }

    const indices = tableroPos.map(p => p.celda);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    if (lado === 'izq') {
        return minIdx - 1;
    } else {
        return maxIdx + 1;
    }
}

// Coloca una ficha
async function colocarFicha(indexFicha, ficha, lado) {
    const { data: partida } = await supabaseClient
        .from('partidas')
        .select('*')
        .eq('sala_id', salaId)
        .single();

    if (!partida || partida.turno != jugadorNum) return;

    let manos = JSON.parse(JSON.stringify(partida.manos || {}));
    let tablero = partida.tablero || [];
    let tableroPos = partida.tablero_pos || [];
    let fichaJugada = [...ficha];

    if (!manos[jugadorNum]) return;
    manos[jugadorNum].splice(indexFicha, 1);

    // Calcular índice de celda
    const indiceCelda = calcularIndiceCelda(tableroPos, lado);

    // Validar que el índice esté dentro del camino
    if (indiceCelda < 0 || indiceCelda >= CAMINO.length) {
        console.error('Celda fuera del camino:', indiceCelda);
        alert('No hay más espacio en el tablero por ese lado.');
        return;
    }

    // Colocar en el tablero lógico (mantener orden visual)
    if (tablero.length === 0) {
        tablero.push(fichaJugada);
    } else {
        const izq = tablero[0][0];
        const der = tablero[tablero.length - 1][1];

        if (lado === 'izq') {
            if (fichaJugada[1] === izq) { /* ok */ }
            else if (fichaJugada[0] === izq) fichaJugada.reverse();
            tablero.unshift(fichaJugada);
        } else {
            if (fichaJugada[0] === der) { /* ok */ }
            else if (fichaJugada[1] === der) fichaJugada.reverse();
            tablero.push(fichaJugada);
        }
    }

    // Añadir la posición al array de posiciones
    tableroPos.push({ celda: indiceCelda, ficha: fichaJugada });

    // ¿El jugador se quedó sin fichas? → Gana la ronda
    let estado = partida.estado;
    let ganadorRonda = null;
    let nuevasPuntos = { ...(partida.puntos_acumulados || {}) };

    if (manos[jugadorNum].length === 0) {
        ganadorRonda = jugadorNum;
        estado = 'ronda_terminada';
        let ptsGanados = 0;
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == jugadorNum) continue;
            ptsGanados += contarPuntos(manos[i] || []);
        }
        nuevasPuntos[jugadorNum] = (nuevasPuntos[jugadorNum] || 0) + ptsGanados;
    }

    let siguienteTurno = (partida.turno % partida.num_jugadores) + 1;

    await supabaseClient
        .from('partidas')
        .update({
            manos,
            tablero,
            tablero_pos: tableroPos,
            turno: siguienteTurno,
            estado,
            pases_seguidos: 0,
            ganador_ronda: ganadorRonda,
            puntos_acumulados: nuevasPuntos,
            ultima_accion: `J${jugadorNum} jugó [${ficha[0]}|${ficha[1]}]`
        })
        .eq('sala_id', salaId);

    if (ganadorRonda) {
        const alcanzo = Object.entries(nuevasPuntos).some(([j, p]) => p >= partida.objetivo_puntos);
        if (alcanzo) {
            const ganadorPartida = Object.entries(nuevasPuntos)
                .filter(([_, p]) => p >= partida.objetivo_puntos)
                .sort((a, b) => b[1] - a[1])[0][0];
            await supabaseClient
                .from('partidas')
                .update({ estado: 'partida_terminada', ganador_partida: parseInt(ganadorPartida) })
                .eq('sala_id', salaId);
        }
    }
}

// Robar del pozo (solo si no hay jugadas válidas)
async function robarDelPozo() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida || partida.turno != jugadorNum) return;
    if (!partida.pozo || partida.pozo.length === 0) {
        alert("El pozo está vacío.");
        return;
    }

    // Validar que el jugador realmente no pueda jugar
    const misFichas = partida.manos?.[jugadorNum] || [];
    const validas = fichasValidas(misFichas, partida.tablero || []);
    if (validas.length > 0) {
        alert("Tienes fichas válidas. Debes jugar o pasar.");
        return;
    }

    let pozo = [...partida.pozo];
    let manos = JSON.parse(JSON.stringify(partida.manos || {}));
    const nueva = pozo.shift();
    if (!manos[jugadorNum]) manos[jugadorNum] = [];
    manos[jugadorNum].push(nueva);

    await supabaseClient
        .from('partidas')
        .update({
            pozo,
            manos,
            pases_seguidos: 0,
            ultima_accion: `J${jugadorNum} robó del pozo`
        })
        .eq('sala_id', salaId);

    sonar('robar');
    vibrar(20);
}

// Pasar turno
async function pasarTurno() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida || partida.turno != jugadorNum) return;

    let pasesSeguidos = (partida.pases_seguidos || 0) + 1;
    let siguienteTurno = (partida.turno % partida.num_jugadores) + 1;
    let estado = partida.estado;
    let ganadorRonda = null;

    if (pasesSeguidos >= partida.num_jugadores) {
        ganadorRonda = ganadorPorTranca(partida.manos, partida.num_jugadores);
        estado = 'ronda_terminada';

        let nuevasPuntos = { ...(partida.puntos_acumulados || {}) };
        let ptsGanados = 0;
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == ganadorRonda) continue;
            ptsGanados += contarPuntos(partida.manos[i] || []);
        }
        nuevasPuntos[ganadorRonda] = (nuevasPuntos[ganadorRonda] || 0) + ptsGanados;

        await supabaseClient
            .from('partidas')
            .update({
                estado,
                ganador_ronda: ganadorRonda,
                puntos_acumulados: nuevasPuntos,
                pases_seguidos: 0,
                ultima_accion: `¡TRACA! Gana J${ganadorRonda} por menos puntos`
            })
            .eq('sala_id', salaId);

        sonar('tranca');

        const alcanzo = Object.entries(nuevasPuntos).some(([j, p]) => p >= partida.objetivo_puntos);
        if (alcanzo) {
            const ganadorPartida = Object.entries(nuevasPuntos)
                .filter(([_, p]) => p >= partida.objetivo_puntos)
                .sort((a, b) => b[1] - a[1])[0][0];
            await supabaseClient
                .from('partidas')
                .update({ estado: 'partida_terminada', ganador_partida: parseInt(ganadorPartida) })
                .eq('sala_id', salaId);
        }
        return;
    }

    await supabaseClient
        .from('partidas')
        .update({
            turno: siguienteTurno,
            pases_seguidos: pasesSeguidos,
            ultima_accion: `J${jugadorNum} pasó turno`
        })
        .eq('sala_id', salaId);
}

// Inicia nueva ronda
async function iniciarNuevaRonda() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida) return;

    let nuevoPozo = generarFichas();
    let nuevasManos = {};
    for (let i = 1; i <= partida.num_jugadores; i++) {
        nuevasManos[i] = nuevoPozo.splice(0, 7);
    }
    const ganadorAnterior = partida.ganador_ronda;
    const primerTurno = jugadorInicial(nuevasManos, partida.num_jugadores, (partida.num_ronda || 1) + 1, ganadorAnterior);

    await supabaseClient
        .from('partidas')
        .update({
            tablero: [],
            tablero_pos: [],
            pozo: nuevoPozo,
            manos: nuevasManos,
            turno: primerTurno,
            estado: 'jugando',
            ganador_ronda: null,
            pases_seguidos: 0,
            num_ronda: (partida.num_ronda || 1) + 1,
            ultima_accion: `Nueva ronda. Sale J${primerTurno}`
        })
        .eq('sala_id', salaId);
}

// Reinicia partida
async function reiniciarPartida() {
    if (!confirm("¿Reiniciar TODA la partida y borrar puntos acumulados?")) return;

    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida) return;

    let nuevoPozo = generarFichas();
    let nuevasManos = {};
    let nuevosPuntos = {};
    for (let i = 1; i <= partida.num_jugadores; i++) {
        nuevasManos[i] = nuevoPozo.splice(0, 7);
        nuevosPuntos[i] = 0;
    }
    const primerTurno = jugadorInicial(nuevasManos, partida.num_jugadores, 1);

    await supabaseClient
        .from('partidas')
        .update({
            tablero: [],
            tablero_pos: [],
            pozo: nuevoPozo,
            manos: nuevasManos,
            turno: primerTurno,
            estado: 'jugando',
            ganador_ronda: null,
            ganador_partida: null,
            puntos_acumulados: nuevosPuntos,
            pases_seguidos: 0,
            num_ronda: 1,
            ultima_accion: `Partida reiniciada. Sale J${primerTurno}`
        })
        .eq('sala_id', salaId);
}

// Guardar nombre
async function guardarNombre(nombre) {
    const { data: partida } = await supabaseClient
        .from('partidas').select('nombres').eq('sala_id', salaId).single();
    let nombres = partida?.nombres || {};
    nombres[jugadorNum] = nombre.trim().substring(0, 12) || `J${jugadorNum}`;
    await supabaseClient
        .from('partidas')
        .update({ nombres })
        .eq('sala_id', salaId);
}

// Reparto inicial
async function asegurarReparto(numJugador) {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida) return null;

    let manos = partida.manos || {};
    let pozo = partida.pozo || [];
    let puntos = partida.puntos_acumulados || {};
    let nombres = partida.nombres || {};

    if (!manos[numJugador]) {
        const { data: fresh } = await supabaseClient
            .from('partidas').select('*').eq('sala_id', salaId).single();

        if (fresh?.manos?.[numJugador]) {
            return fresh;
        }

        if (pozo.length < 7) {
            console.warn('⚠️ Pozo insuficiente');
        }
        manos[numJugador] = pozo.splice(0, 7);

        if (puntos[numJugador] === undefined) puntos[numJugador] = 0;
        if (!nombres[numJugador]) nombres[numJugador] = `Jugador ${numJugador}`;

        await supabaseClient
            .from('partidas')
            .update({
                manos,
                pozo,
                puntos_acumulados: puntos,
                nombres,
                ultima_accion: `${nombres[numJugador]} se unió a la partida`
            })
            .eq('sala_id', salaId);

        return { ...partida, manos, pozo, puntos_acumulados: puntos, nombres };
    }
    return partida;
}