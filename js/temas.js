// ============================================
// SELECTOR DE TEMAS (componente reutilizable)
// ============================================

function renderSelectorTemas(containerId = 'tema-selector') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="tema-selector">
            <button class="tema-btn" data-tema="clasico"  onclick="cambiarTema('clasico')"  title="Clásico"></button>
            <button class="tema-btn" data-tema="nocturno" onclick="cambiarTema('nocturno')" title="Nocturno"></button>
            <button class="tema-btn" data-tema="madera"   onclick="cambiarTema('madera')"   title="Madera"></button>
            <button class="tema-btn" data-tema="moderno"  onclick="cambiarTema('moderno')"  title="Moderno"></button>
        </div>
    `;

    // Marcar el activo
    const actual = localStorage.getItem('domino-tema') || 'clasico';
    container.querySelectorAll('.tema-btn').forEach(btn => {
        btn.classList.toggle('activo', btn.dataset.tema === actual);
    });
}