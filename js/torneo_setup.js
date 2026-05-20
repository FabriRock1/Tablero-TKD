// =========================================================================
// SETUP DE TORNEO, LLAVES AUTOMÁTICAS Y PRUEBA DE MANDOS (COMPLETO)
// =========================================================================

const paisesDisponibles = [
    { code: "ar", name: "🇦🇷 Argentina" }, { code: "br", name: "🇧🇷 Brasil" }, { code: "cl", name: "🇨🇱 Chile" },
    { code: "co", name: "🇨🇴 Colombia" }, { code: "pe", name: "🇵🇪 Perú" }, { code: "uy", name: "🇺🇾 Uruguay" }, 
    { code: "mx", name: "🇲🇽 México" }, { code: "us", name: "🇺🇸 Estados Unidos" }, { code: "kr", name: "🇰🇷 Corea del Sur" }
];

let poolCompetidores = JSON.parse(localStorage.getItem('smtkd_competidores')) || [];

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. INICIALIZACIÓN DE SETUP.HTML ---
    const selRojo = document.getElementById("cfg-pais-rojo");
    const selAzul = document.getElementById("cfg-pais-azul");
    
    if(selRojo && selAzul) {
        // Cargar lista de países
        paisesDisponibles.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
            let oR = new Option(p.name, p.code); 
            let oA = new Option(p.name, p.code);
            if(p.code === "ar") oR.selected = true; 
            if(p.code === "br") oA.selected = true;
            selRojo.add(oR); 
            selAzul.add(oA);
        });

        // Autocompletar si venimos de la pantalla de llaves
        const precarga = JSON.parse(sessionStorage.getItem('smtkd_preload_match'));
        if(precarga) {
            if(document.getElementById('cfg-nombre-rojo')) document.getElementById('cfg-nombre-rojo').value = precarga.rojo || "";
            if(document.getElementById('cfg-subtexto-rojo')) document.getElementById('cfg-subtexto-rojo').value = precarga.clubRojo || "";
            if(document.getElementById('cfg-nombre-azul')) document.getElementById('cfg-nombre-azul').value = precarga.azul || "";
            if(document.getElementById('cfg-subtexto-azul')) document.getElementById('cfg-subtexto-azul').value = precarga.clubAzul || "";
            sessionStorage.removeItem('smtkd_preload_match'); 
        }
    }

    // --- 2. INICIALIZACIÓN DE TORNEO.HTML ---
    if(document.getElementById('bracket-render-box')) {
        let lblTotal = document.getElementById('total-inscriptos-lbl');
        if(lblTotal) lblTotal.innerText = `Atletas: ${poolCompetidores.length}`;
        renderizarLlaveAutomatica();
        requestAnimationFrame(loopTestMandos);
    }
});

// ================= LÓGICA DE SETUP.HTML =================
window.guardarYComenzar = function() {
    let reglas = {};

    reglas.nombreRojo = document.getElementById('cfg-nombre-rojo')?.value.trim() || "HONG";
    reglas.clubRojo = document.getElementById('cfg-subtexto-rojo')?.value.trim() || "";
    reglas.rankRojo = document.getElementById('cfg-rank-rojo')?.value.trim() || "";
    reglas.paisRojo = document.getElementById('cfg-pais-rojo')?.value || "ar";

    reglas.nombreAzul = document.getElementById('cfg-nombre-azul')?.value.trim() || "CHONG";
    reglas.clubAzul = document.getElementById('cfg-subtexto-azul')?.value.trim() || "";
    reglas.rankAzul = document.getElementById('cfg-rank-azul')?.value.trim() || "";
    reglas.paisAzul = document.getElementById('cfg-pais-azul')?.value || "br";

    reglas.categoria = document.getElementById('cfg-categoria-combate')?.value.trim() || "DIVISIÓN OFICIAL WT";

    // Obtener configuración de tiempos en segundos
    let tMin = parseInt(document.getElementById('cfg-min')?.value) || 1;
    let tSeg = parseInt(document.getElementById('cfg-seg')?.value) || 30;
    reglas.tiempoRound = (tMin * 60) + tSeg;

    let dMin = parseInt(document.getElementById('cfg-desc-min')?.value) || 1;
    let dSeg = parseInt(document.getElementById('cfg-desc-seg')?.value) || 0;
    reglas.tiempoDescanso = (dMin * 60) + dSeg;

    let mMin = parseInt(document.getElementById('cfg-med-min')?.value) || 1;
    let mSeg = parseInt(document.getElementById('cfg-med-seg')?.value) || 0;
    reglas.tiempoMedico = (mMin * 60) + mSeg;

    reglas.sistema = document.getElementById('cfg-sistema')?.value || 'best3';

    let configMandos = document.getElementById('cfg-jueces')?.value.split('_') || ["1", "1"];
    reglas.mandosActivos = parseInt(configMandos[0]);
    reglas.coincidenciasRequeridas = parseInt(configMandos[1]);

    reglas.gamjeomLimiteActivo = document.getElementById('cfg-gj-act')?.checked ?? true;
    reglas.gamjeomMax = parseInt(document.getElementById('cfg-gj-max')?.value) || 5;
    reglas.pointGapActivo = document.getElementById('cfg-pg-act')?.checked ?? true;
    reglas.pointGapPts = parseInt(document.getElementById('cfg-pg-pts')?.value) || 12;

    sessionStorage.setItem('smtkd_active_match_rules', JSON.stringify(reglas));
    window.location.href = 'combate.html';
};

window.abrirPantallaPublico = function() { window.open('vista-publico.html', 'SMTKD_Estadio', 'width=1280,height=720'); };

// ================= LÓGICA DE TORNEO.HTML (LLAVES Y OFFLINE) =================
window.guardarAtletaNuevo = function() {
    let nom = document.getElementById('torn-nombre').value.trim().toUpperCase();
    let clb = document.getElementById('torn-club').value.trim().toUpperCase();
    if(!nom) return alert("Falta el nombre del atleta");
    
    poolCompetidores.push({ nombre: nom, club: clb });
    localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
    
    document.getElementById('torn-nombre').value = "";
    document.getElementById('torn-club').value = "";
    
    let lblTotal = document.getElementById('total-inscriptos-lbl');
    if(lblTotal) lblTotal.innerText = `Atletas: ${poolCompetidores.length}`;
    renderizarLlaveAutomatica();
};

window.exportarBaseAtletas = function() {
    if (poolCompetidores.length === 0) return alert("Base vacía.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(poolCompetidores));
    const dl = document.createElement('a'); 
    dl.setAttribute("href", dataStr); dl.setAttribute("download", "Torneo_SMTKD.json");
    document.body.appendChild(dl); dl.click(); dl.remove();
};

window.importarBaseAtletas = function(e) {
    const archivo = e.target.files[0]; if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(evt) {
        try {
            const importados = JSON.parse(evt.target.result);
            if (Array.isArray(importados)) {
                poolCompetidores = importados; 
                localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
                let lblTotal = document.getElementById('total-inscriptos-lbl');
                if(lblTotal) lblTotal.innerText = `Atletas: ${poolCompetidores.length}`;
                renderizarLlaveAutomatica();
            }
        } catch(err) { alert("Error leyendo JSON."); }
    };
    lector.readAsText(archivo);
};

window.renderizarLlaveAutomatica = function() {
    const box = document.getElementById('bracket-render-box');
    if(!box) return;
    if(poolCompetidores.length === 0) { 
        box.innerHTML = "<p style='color:#666;'>No hay competidores para generar la llave.</p>"; 
        return; 
    }
    
    let html = `<div class="torneo-bracket-container"><div class="bracket-esports-layout"><div class="bracket-columna">`;
    html += `<div class="bracket-titulo-ronda">CUARTOS DE FINAL</div>`;
    
    for(let i=0; i<poolCompetidores.length; i+=2) {
        let rj = poolCompetidores[i]; let az = poolCompetidores[i+1];
        let idR = rj ? rj.nombre : 'BYE'; let clubR = rj ? rj.club : '';
        let idA = az ? az.nombre : 'BYE'; let clubA = az ? az.club : '';
        
        let classR = !rj ? 'atleta-vacante' : '';
        let classA = !az ? 'atleta-vacante' : '';
        let disBtn = (!rj || !az) ? 'disabled' : '';
        
        html += `
        <div class="cruce-match-box">
            <div class="fila-atleta-llave b-rojo ${classR}">
                <div><span class="nombre-llave">${idR}</span><span class="club-atleta-llave">${clubR}</span></div>
            </div>
            <div class="fila-atleta-llave b-azul ${classA}">
                <div><span class="nombre-llave">${idA}</span><span class="club-atleta-llave">${clubA}</span></div>
            </div>
            <button class="btn-lanzar-match" onclick="lanzarMatchSetup('${idR}', '${clubR}', '${idA}', '${clubA}')" ${disBtn}>
                FIGHT MATCH
            </button>
        </div>`;
    }
    html += `</div></div></div>`;
    box.innerHTML = html;
};

window.lanzarMatchSetup = function(rojo, clRojo, azul, clAzul) {
    sessionStorage.setItem('smtkd_preload_match', JSON.stringify({ rojo, clubRojo: clRojo, azul, clubAzul: clAzul }));
    window.location.href = 'setup.html';
};

window.cerrarPantallaTest = function() { document.getElementById('pagina-test').classList.remove('activa'); };

// ================= LÓGICA DE TEST DE MANDOS =================
function loopTestMandos() {
    if(!document.getElementById('pagina-test')?.classList.contains('activa')) {
        requestAnimationFrame(loopTestMandos); return;
    }
    const gps = navigator.getGamepads();
    for(let i=0; i<2; i++) {
        let gp = gps[i]; let slot = document.getElementById(`ps-slot-${i}`);
        if(!gp) { if(slot) slot.classList.remove('conectado'); continue; }
        if(slot) slot.classList.add('conectado');
        
        // Flechas
        document.getElementById(`btn-${i}-up`)?.classList.toggle('prendido', gp.buttons[12]?.pressed);
        document.getElementById(`btn-${i}-down`)?.classList.toggle('prendido', gp.buttons[13]?.pressed);
        document.getElementById(`btn-${i}-left`)?.classList.toggle('prendido', gp.buttons[14]?.pressed);
        document.getElementById(`btn-${i}-right`)?.classList.toggle('prendido', gp.buttons[15]?.pressed);
        
        // Figuras
        document.getElementById(`btn-${i}-cr`)?.classList.toggle('prendido', gp.buttons[0]?.pressed); 
        document.getElementById(`btn-${i}-ci`)?.classList.toggle('prendido', gp.buttons[1]?.pressed); 
        document.getElementById(`btn-${i}-sq`)?.classList.toggle('prendido', gp.buttons[2]?.pressed); 
        document.getElementById(`btn-${i}-tr`)?.classList.toggle('prendido', gp.buttons[3]?.pressed); 
    }
    requestAnimationFrame(loopTestMandos);
}