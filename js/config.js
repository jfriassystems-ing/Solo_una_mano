// ============================================
// CONFIGURACIÓN GLOBAL v2
// ============================================

const SUPABASE_URL = 'https://drbvvooxdopszhbagvsd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OxHHD8-VSE68giA7ULsFpg_NnEBzld6';

let supabaseClient = null;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    console.log('✅ Cliente Supabase inicializado');
} catch (e) {
    console.error("Error al iniciar Supabase:", e);
    alert("Error de conexión con la base de datos.");
}

// Parámetros de URL
const urlParams = new URLSearchParams(window.location.search);
const salaId = urlParams.get('sala');
const rol = urlParams.get('rol');
const jugadorNum = urlParams.get('jugador');
const conMesa = urlParams.get('mesa') === '1';

// Estado global compartido
window.estadoGlobal = null;
window.fichaPendiente = { index: null, valor: null };
window.tableroAnterior = null; // Para detectar fichas nuevas

// ============================================
// GESTIÓN DE TEMA
// ============================================
const TEMAS = ['clasico', 'nocturno', 'madera', 'moderno'];

function aplicarTema(tema) {
    if (!TEMAS.includes(tema)) tema = 'clasico';
    document.body.setAttribute('data-tema', tema);
    localStorage.setItem('domino-tema', tema);
    // Marcar botón activo si existe
    document.querySelectorAll('.tema-btn').forEach(btn => {
        btn.classList.toggle('activo', btn.dataset.tema === tema);
    });
}

function cambiarTema(tema) {
    aplicarTema(tema);
}

// Aplicar al cargar
(function initTema() {
    const guardado = localStorage.getItem('domino-tema') || 'clasico';
    // Esperar a que el body exista
    if (document.body) {
        aplicarTema(guardado);
    } else {
        document.addEventListener('DOMContentLoaded', () => aplicarTema(guardado));
    }
})();