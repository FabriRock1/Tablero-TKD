const paisesDisponibles = [
    { code: "ar", name: "🇦🇷 Argentina" }, { code: "br", name: "🇧🇷 Brasil" }, { code: "cl", name: "🇨🇱 Chile" },
    { code: "co", name: "🇨🇴 Colombia" }, { code: "pe", name: "🇵🇪 Perú" }, { code: "uy", name: "🇺🇾 Uruguay" }, 
    { code: "mx", name: "🇲🇽 México" }, { code: "us", name: "🇺🇸 Estados Unidos" }, { code: "kr", name: "🇰🇷 Corea del Sur" }
];

document.addEventListener("DOMContentLoaded", () => {
    const selRojo = document.getElementById("cfg-pais-rojo");
    const selAzul = document.getElementById("cfg-pais-azul");
    
    if(selRojo && selAzul) {
        paisesDisponibles.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
            let oR = new Option(p.name, p.code); let oA = new Option(p.name, p.code);
            if(p.code === "ar") oR.selected = true; if(p.code === "br") oA.selected = true;
            selRojo.add(oR); selAzul.add(oA);
        });

        const precarga = JSON.parse(sessionStorage.getItem('smtkd_preload_match'));
        if(precarga) {
            document.getElementById('cfg-nombre-rojo').value = precarga.nomRojo;
            document.getElementById('cfg-subtexto-rojo').value = precarga.clubRojo;
            document.getElementById('cfg-nombre-azul').value = precarga.nomAzul;
            document.getElementById('cfg-subtexto-azul').value = precarga.clubAzul;
            document.getElementById('cfg-categoria-combate').value = precarga.categoria;
            document.getElementById('cfg-rank-rojo').value = "CLASIFICADO";
            document.getElementById('cfg-rank-azul').value = "CLASIFICADO";
            sessionStorage.removeItem('smtkd_preload_match');
        }
    }
    if(typeof renderizarLlaveAutomatica === 'function') renderizarLlaveAutomatica();
});

window.guardarYComenzar = function() {
    let rawJueces = document.getElementById('cfg-jueces')?.value || "1_1";
    let mActivos = parseInt(rawJueces.split('_')[0]);
    let coincReq = parseInt(rawJueces.split('_')[1]);
    
    const configExportable = {
        tiempoRound: (parseInt(document.getElementById('cfg-min').value)||0)*60 + (parseInt(document.getElementById('cfg-seg').value)||0),
        tiempoDescanso: (parseInt(document.getElementById('cfg-desc-min').value)||0)*60 + (parseInt(document.getElementById('cfg-desc-seg').value)||0),
        tiempoMedico: (parseInt(document.getElementById('cfg-med-min').value)||0)*60 + (parseInt(document.getElementById('cfg-med-seg').value)||0),
        sistema: document.getElementById('cfg-sistema').value,
        mandosActivos: mActivos,
        coincidenciasRequeridas: coincReq,
        gamjeomLimiteActivo: document.getElementById('cfg-gj-act').checked,
        gamjeomMax: parseInt(document.getElementById('cfg-gj-max').value) || 5,
        pointGapActivo: document.getElementById('cfg-pg-act').checked,
        pointGapPts: parseInt(document.getElementById('cfg-pg-pts').value) || 12,
        
        nombreRojo: document.getElementById('cfg-nombre-rojo').value, clubRojo: document.getElementById('cfg-subtexto-rojo').value, rankRojo: document.getElementById('cfg-rank-rojo').value, paisRojo: document.getElementById('cfg-pais-rojo').value,
        nombreAzul: document.getElementById('cfg-nombre-azul').value, clubAzul: document.getElementById('cfg-subtexto-azul').value, rankAzul: document.getElementById('cfg-rank-azul').value, paisAzul: document.getElementById('cfg-pais-azul').value,
        categoria: document.getElementById('cfg-categoria-combate').value
    };
    sessionStorage.setItem('smtkd_active_match_rules', JSON.stringify(configExportable));
    window.location.href = 'combate.html';
};

window.abrirPantallaTest = function() { document.getElementById('pagina-test').classList.add('activa'); loopTestMandos(); };
window.cerrarPantallaTest = function() { document.getElementById('pagina-test').classList.remove('activa'); };

// ================= TORNEO OFFLINE =================
let poolCompetidores = JSON.parse(localStorage.getItem('smtkd_competidores')) || [];

window.guardarAtletaNuevo = function() {
    let nom = document.getElementById('torn-nombre').value.trim().toUpperCase();
    let clb = document.getElementById('torn-club').value.trim().toUpperCase();
    let cin = document.getElementById('torn-cinturon').value;
    let pes = document.getElementById('torn-peso').value;
    if(!nom || !clb) { alert("Complete Nombre y Club."); return; }
    poolCompetidores.push({ nombre: nom, club: clb, cinturon: cin, peso: pes });
    localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
    document.getElementById('torn-nombre').value = ""; document.getElementById('torn-club').value = "";
    renderizarLlaveAutomatica();
};

window.renderizarLlaveAutomatica = function() {
    let cF = document.getElementById('filtro-cinturon').value; let pF = document.getElementById('filtro-peso').value;
    let box = document.getElementById('bracket-render-box'); if(!box) return; box.innerHTML = "";
    
    let f = poolCompetidores.filter(a => a.cinturon === cF && a.peso === pF);
    document.getElementById('total-inscriptos-lbl').innerText = `Atletas inscriptos: ${f.length}`;
    if(f.length < 2) { box.innerHTML = "<div style='color:#555; font-family:Orbitron; padding:20px; text-align:center;'>FALTAN ATLETAS EN ESTA CATEGORÍA</div>"; return; }

    let a1 = f[0] || {nombre:"- VACANTE BYE -", club:"--"}; let a2 = f[1] || {nombre:"- VACANTE BYE -", club:"--"};
    let a3 = f[2] || {nombre:"- VACANTE BYE -", club:"--"}; let a4 = f[3] || {nombre:"- VACANTE BYE -", club:"--"};
    let c1=a1.nombre.includes("VACANTE")?"atleta-vacante":""; let c2=a2.nombre.includes("VACANTE")?"atleta-vacante":"";
    let c3=a3.nombre.includes("VACANTE")?"atleta-vacante":""; let c4=a4.nombre.includes("VACANTE")?"atleta-vacante":"";

    box.innerHTML = `<div class="bracket-esports-layout">
        <div class="bracket-columna"><div class="bracket-titulo-ronda">SEMIFINALES</div>
            <div class="nodo-match nodo-semifinal nodo-semifinal-top"><div class="cruce-match-box"><div class="fila-atleta-llave b-rojo ${c1}"><div><span class="nombre-llave">${a1.nombre}</span><span class="club-atleta-llave">${a1.club}</span></div></div><div class="fila-atleta-llave b-azul ${c2}"><div><span class="nombre-llave">${a2.nombre}</span><span class="club-atleta-llave">${a2.club}</span></div></div><button class="btn-lanzar-match" onclick="cargarPeleaDesdeLlave('${a1.nombre}','${a1.club}','${a2.nombre}','${a2.club}','${pF}')">⚡ FIGHT MATCH 1</button></div></div>
            ${f.length>=3?`<div class="nodo-match nodo-semifinal nodo-semifinal-bottom"><div class="cruce-match-box"><div class="fila-atleta-llave b-rojo ${c3}"><div><span class="nombre-llave">${a3.nombre}</span><span class="club-atleta-llave">${a3.club}</span></div></div><div class="fila-atleta-llave b-azul ${c4}"><div><span class="nombre-llave">${a4.nombre}</span><span class="club-atleta-llave">${a4.club}</span></div></div><button class="btn-lanzar-match" onclick="cargarPeleaDesdeLlave('${a3.nombre}','${a3.club}','${a4.nombre}','${a4.club}','${pF}')">⚡ FIGHT MATCH 2</button></div></div>`:''}
        </div>
        <div class="bracket-columna"><div class="bracket-titulo-ronda">GRAN FINAL</div>
            <div class="nodo-match nodo-final"><div class="cruce-match-box" style="border-color:#ffd600;"><div class="fila-atleta-llave b-rojo atleta-vacante"><div><span class="nombre-llave">GANADOR 1</span></div></div><div class="fila-atleta-llave b-azul atleta-vacante"><div><span class="nombre-llave">GANADOR 2</span></div></div><button class="btn-lanzar-match" style="background:#222; color:#555;" disabled>ESPERANDO</button></div></div>
        </div>
    </div>`;
};

window.cargarPeleaDesdeLlave = function(nomRojo, clubRojo, nomAzul, clubAzul, categoria) {
    if(nomRojo.includes("VACANTE") || nomAzul.includes("VACANTE")) return;
    sessionStorage.setItem('smtkd_preload_match', JSON.stringify({nomRojo, clubRojo, nomAzul, clubAzul, categoria}));
    window.location.href = 'setup.html';
};

window.exportarBaseAtletas = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(poolCompetidores));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "Base_SMTKD.json"); a.click();
};
window.importarBaseAtletas = function(e) {
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader(); r.onload = function(evt) {
        poolCompetidores = JSON.parse(evt.target.result); localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores)); renderizarLlaveAutomatica();
    }; r.readAsText(file);
};

// LOOP DIAGNÓSTICO
function loopTestMandos() {
    if(!document.getElementById('pagina-test').classList.contains('activa')) return;
    const gps = navigator.getGamepads();
    for(let i=0; i<2; i++) {
        let gp = gps[i]; let slot = document.getElementById(`ps-slot-${i}`);
        if(!gp) { if(slot) slot.classList.remove('conectado'); continue; }
        if(slot) slot.classList.add('conectado');
        document.getElementById(`btn-${i}-down`)?.classList.toggle('prendido', gp.buttons[13]?.pressed);
        document.getElementById(`btn-${i}-right`)?.classList.toggle('prendido', gp.buttons[15]?.pressed);
        document.getElementById(`btn-${i}-up`)?.classList.toggle('prendido', gp.buttons[12]?.pressed);
        document.getElementById(`btn-${i}-left`)?.classList.toggle('prendido', gp.buttons[14]?.pressed);
        document.getElementById(`btn-${i}-cr`)?.classList.toggle('prendido', gp.buttons[0]?.pressed);
        document.getElementById(`btn-${i}-sq`)?.classList.toggle('prendido', gp.buttons[2]?.pressed);
        document.getElementById(`btn-${i}-tr`)?.classList.toggle('prendido', gp.buttons[3]?.pressed);
        document.getElementById(`btn-${i}-ci`)?.classList.toggle('prendido', gp.buttons[1]?.pressed);
    }
    requestAnimationFrame(loopTestMandos);
}
window.addEventListener("gamepadconnected", () => { let c = navigator.getGamepads().filter(g => g !== null).length; let s = document.getElementById('gamepad-status'); if(s) { s.innerText = `🎮 ${c} MANDO(S) CONECTADO(S) OK`; s.className = 'con-mando'; } });