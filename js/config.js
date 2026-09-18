// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const SUPABASE_URL = 'https://drbvvooxdopszhbagvsd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OxHHD8-VSE68giA7ULsFpg_NnEBzld6';

let supabaseClient = null;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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