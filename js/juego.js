// ============================================
// LÓGICA DEL JUEGO (turnos, tranca, rondas)
// ============================================

// Determina qué jugador debe salir en la primera ronda (el que tenga [6-6])
function jugadorInicial(manos, numJugadores) {
    for (let i = 1; i <= numJugadores; i++) {
        const mano = manos[i] || [];
        if (mano.some(f => f[0] === 6 && f[1] === 6)) return i;
    }
    // Si nadie tiene el doble seis, sale el que tenga la ficha más alta
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

// Calcula el ganador de la ronda por tranca (menor puntaje)
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

// Aplica la lógica al colocar una ficha (con validación de tranca)
async function colocarFicha(indexFicha, ficha, lado) {
    const { data: partida } = await supabaseClient
        .from('partidas')
        .select('*')
        .eq('sala_id', salaId)
        .single();

    if (!partida || partida.turno != jugadorNum) return;

    let manos = JSON.parse(JSON.stringify(partida.manos || {}));
    let tablero = partida.tablero || [];
    let fichaJugada = [...ficha];

    if (!manos[jugadorNum]) return;
    manos[jugadorNum].splice(indexFicha, 1);

    // Colocar la ficha en el extremo correcto
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

    // ¿El jugador se quedó sin fichas? → Gana la ronda
    let estado = partida.estado;
    let ganadorRonda = null;
    let nuevasPuntos = { ...(partida.puntos_acumulados || {}) };

    if (manos[jugadorNum].length === 0) {
        ganadorRonda = jugadorNum;
        estado = 'ronda_terminada';
        // Sumar puntos de los rivales al ganador
        let ptsGanados = 0;
        for (let i = 1; i <= partida.num_jugadores; i++) {
            if (i == jugadorNum) continue;
            ptsGanados += contarPuntos(manos[i] || []);
        }
        nuevasPuntos[jugadorNum] = (nuevasPuntos[jugadorNum] || 0) + ptsGanados;
    }

    // Verificar tranca (todos pasan y no hay pozo)
    let pasesSeguidos = partida.pases_seguidos || 0;
    let siguienteTurno = (partida.turno % partida.num_jugadores) + 1;

    await supabaseClient
        .from('partidas')
        .update({
            manos,
            tablero,
            turno: siguienteTurno,
            estado,
            pases_seguidos: 0,
            ganador_ronda: ganadorRonda,
            puntos_acumulados: nuevasPuntos,
            ultima_accion: `J${jugadorNum} jugó [${ficha[0]}|${ficha[1]}]`
        })
        .eq('sala_id', salaId);

    // Verificar si alguien alcanzó el objetivo de puntos
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

// Robar del pozo
async function robarDelPozo() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida || partida.turno != jugadorNum) return;
    if (!partida.pozo || partida.pozo.length === 0) {
        alert("El pozo está vacío.");
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
}

// Pasar turno (cuando no hay jugadas ni pozo)
async function pasarTurno() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida || partida.turno != jugadorNum) return;

    let pasesSeguidos = (partida.pases_seguidos || 0) + 1;
    let siguienteTurno = (partida.turno % partida.num_jugadores) + 1;
    let estado = partida.estado;
    let ganadorRonda = null;

    // Si todos los jugadores pasaron → TRACA
    if (pasesSeguidos >= partida.num_jugadores) {
        ganadorRonda = ganadorPorTranca(partida.manos, partida.num_jugadores);
        estado = 'ronda_terminada';

        // Sumar puntos de los rivales al ganador por tranca
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

        // Verificar partida terminada
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

// Inicia una nueva ronda conservando puntos acumulados
async function iniciarNuevaRonda() {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida) return;

    let nuevoPozo = generarFichas();
    let nuevasManos = {};
    for (let i = 1; i <= partida.num_jugadores; i++) {
        nuevasManos[i] = nuevoPozo.splice(0, 7);
    }
    const primerTurno = jugadorInicial(nuevasManos, partida.num_jugadores);

    await supabaseClient
        .from('partidas')
        .update({
            tablero: [],
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

// Reinicia la partida completa (borra puntos)
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
    const primerTurno = jugadorInicial(nuevasManos, partida.num_jugadores);

    await supabaseClient
        .from('partidas')
        .update({
            tablero: [],
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

// Guardar nombre del jugador
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

// Reparto inicial (solo si el jugador no tiene mano)
async function asegurarReparto(numJugador) {
    const { data: partida } = await supabaseClient
        .from('partidas').select('*').eq('sala_id', salaId).single();
    if (!partida) return null;

    let manos = partida.manos || {};
    let pozo = partida.pozo || [];
    let puntos = partida.puntos_acumulados || {};
    let nombres = partida.nombres || {};

    // Si este jugador aún no tiene mano, repartirle 7 fichas
    if (!manos[numJugador]) {
        // Refrescar por si otro jugador ya repartió en paralelo
        const { data: fresh } = await supabaseClient
            .from('partidas').select('*').eq('sala_id', salaId).single();

        if (fresh?.manos?.[numJugador]) {
            return fresh;
        }

        // Repartir 7 fichas del pozo
        if (pozo.length < 7) {
            console.warn('⚠️ Pozo insuficiente para repartir 7 fichas');
        }
        manos[numJugador] = pozo.splice(0, 7);

        // Inicializar puntos y nombre si no existen
        if (puntos[numJugador] === undefined) puntos[numJugador] = 0;
        if (!nombres[numJugador]) nombres[numJugador] = `Jugador ${numJugador}`;

        // Guardar
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