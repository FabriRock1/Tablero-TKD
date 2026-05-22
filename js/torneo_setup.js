// =========================================================================
// SETUP DE TORNEO, LLAVES AUTOMÁTICAS Y PRUEBA DE MANDOS (COMPLETO)
// =========================================================================

let poolCompetidores = JSON.parse(localStorage.getItem('smtkd_competidores')) || [];

// Asegurarse de que los competidores tengan un ID único
poolCompetidores = poolCompetidores.map(c => {
    if(!c.id) c.id = 'ID_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    return c;
});

let valoresHUD = {
    sistema: 'best3', jueces: '2_2', paisRojo: 'ar', paisAzul: 'br',
    min: 1, seg: 30, 'desc-min': 1, 'desc-seg': 0, 'med-min': 1, 'med-seg': 0,
    'gj-max': 5, 'pg-pts': 12
};

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('cfg-nombre-rojo')) {
        const precarga = JSON.parse(sessionStorage.getItem('smtkd_preload_match'));
        if(precarga) {
            if(document.getElementById('cfg-nombre-rojo')) document.getElementById('cfg-nombre-rojo').value = precarga.rojo || "";
            if(document.getElementById('cfg-subtexto-rojo')) document.getElementById('cfg-subtexto-rojo').value = precarga.clubRojo || "";
            if(document.getElementById('cfg-nombre-azul')) document.getElementById('cfg-nombre-azul').value = precarga.azul || "";
            if(document.getElementById('cfg-subtexto-azul')) document.getElementById('cfg-subtexto-azul').value = precarga.clubAzul || "";
            if(document.getElementById('cfg-categoria-combate')) document.getElementById('cfg-categoria-combate').value = precarga.categoria || "COMBATE OFICIAL WT";
            sessionStorage.removeItem('smtkd_preload_match'); 
        }
        actualizarTodosLosDisplaysHUD();
        requestAnimationFrame(loopDeteccionFisica);
    }

    if(document.getElementById('bracket-render-box')) {
        actualizarContadorBase();
        renderizarLlaveAutomatica();
        requestAnimationFrame(loopTestMandos);
    }
});

function actualizarContadorBase() {
    let lblTotal = document.getElementById('total-inscriptos-lbl');
    if(lblTotal) lblTotal.innerText = `Base Total de Atletas: ${poolCompetidores.length}`;
}

window.seleccionarOpcionHUD = function(campo, valor, elemento) {
    valoresHUD[campo] = valor;
    const contenedor = elemento.parentElement;
    const botones = contenedor.querySelectorAll('.btn-selector-cyber');
    botones.forEach(btn => btn.classList.remove('activo'));
    elemento.classList.add('activo');
};

window.cambiarValorHUD = function(llave, incremento) {
    let valorActual = valoresHUD[llave]; let nuevoValor = valorActual + incremento;
    if (llave.endsWith('min')) { if (nuevoValor < 0) nuevoValor = 0; if (nuevoValor > 9) nuevoValor = 9; } 
    else if (llave.endsWith('seg')) {
        if (nuevoValor < 0) { let mLlave = llave.replace('seg', 'min'); if (valoresHUD[mLlave] > 0) { valoresHUD[mLlave]--; document.getElementById(`lbl-${mLlave}`).value = valoresHUD[mLlave].toString().padStart(2, '0'); nuevoValor = 55; } else { nuevoValor = 0; } }
        if (nuevoValor > 55) { let mLlave = llave.replace('seg', 'min'); if (valoresHUD[mLlave] < 9) { valoresHUD[mLlave]++; document.getElementById(`lbl-${mLlave}`).value = valoresHUD[mLlave].toString().padStart(2, '0'); nuevoValor = 0; } else { nuevoValor = 55; } }
    } else if (llave === 'gj-max') { if (nuevoValor < 1) nuevoValor = 1; if (nuevoValor > 10) nuevoValor = 10; } 
    else if (llave === 'pg-pts') { if (nuevoValor < 1) nuevoValor = 1; if (nuevoValor > 30) nuevoValor = 30; }

    valoresHUD[llave] = nuevoValor;
    let display = document.getElementById(`lbl-${llave}`);
    if (display) display.value = (llave.endsWith('seg') || llave.endsWith('min')) ? nuevoValor.toString().padStart(2, '0') : nuevoValor;
};

window.validarEntradaTeclado = function(llave, elemento) {
    let val = parseInt(elemento.value);
    if (isNaN(val)) return actualizarDisplayEspecifico(llave);
    if (llave.endsWith('min')) { if (val < 0) val = 0; if (val > 9) val = 9; } 
    else if (llave.endsWith('seg')) { if (val < 0) val = 0; if (val > 59) val = 59; } 
    else if (llave === 'gj-max') { if (val < 1) val = 1; if (val > 10) val = 10; } 
    else if (llave === 'pg-pts') { if (val < 1) val = 1; if (val > 30) val = 30; }
    valoresHUD[llave] = val; actualizarDisplayEspecifico(llave);
};

function actualizarTodosLosDisplaysHUD() { for (let llave in valoresHUD) { if (!['sistema','jueces','paisRojo','paisAzul'].includes(llave)) actualizarDisplayEspecifico(llave); } }
function actualizarDisplayEspecifico(llave) { let i = document.getElementById(`lbl-${llave}`); if (i) i.value = (llave.endsWith('seg') || llave.endsWith('min')) ? valoresHUD[llave].toString().padStart(2, '0') : valoresHUD[llave]; }

function loopDeteccionFisica() {
    const indicadorMando = document.getElementById('gamepad-status'); if (!indicadorMando) return;
    const gps = navigator.getGamepads(); let conectados = 0;
    for (let i = 0; i < gps.length; i++) { if (gps[i]) conectados++; }
    if (conectados > 0) { indicadorMando.className = "con-mando"; indicadorMando.innerText = `🎮 ¡Mandos listos! (${conectados})`; } 
    else { indicadorMando.className = "sin-mando"; indicadorMando.innerText = "🎮 Esperando mandos..."; }
    requestAnimationFrame(loopDeteccionFisica);
}

window.guardarYComenzar = function() {
    let reglas = {};
    reglas.nombreRojo = document.getElementById('cfg-nombre-rojo')?.value.trim() || "HONG";
    reglas.clubRojo = document.getElementById('cfg-subtexto-rojo')?.value.trim() || "";
    reglas.rankRojo = document.getElementById('cfg-rank-rojo')?.value.trim() || "";
    reglas.paisRojo = valoresHUD.paisRojo;

    reglas.nombreAzul = document.getElementById('cfg-nombre-azul')?.value.trim() || "CHONG";
    reglas.clubAzul = document.getElementById('cfg-subtexto-azul')?.value.trim() || "";
    reglas.rankAzul = document.getElementById('cfg-rank-azul')?.value.trim() || "";
    reglas.paisAzul = valoresHUD.paisAzul;

    reglas.categoria = document.getElementById('cfg-categoria-combate')?.value.trim() || "DIVISIÓN OFICIAL WT";
    reglas.tiempoRound = (valoresHUD.min * 60) + valoresHUD.seg;
    reglas.tiempoDescanso = (valoresHUD['desc-min'] * 60) + valoresHUD['desc-seg'];
    reglas.tiempoMedico = (valoresHUD['med-min'] * 60) + valoresHUD['med-seg'];
    reglas.sistema = valoresHUD.sistema;

    let configMandos = valoresHUD.jueces.split('_');
    reglas.mandosActivos = parseInt(configMandos[0]);
    reglas.coincidenciasRequeridas = parseInt(configMandos[1]);
    reglas.gamjeomLimiteActivo = document.getElementById('cfg-gj-act')?.checked ?? true;
    reglas.gamjeomMax = valoresHUD['gj-max'];
    reglas.pointGapActivo = document.getElementById('cfg-pg-act')?.checked ?? true;
    reglas.pointGapPts = valoresHUD['pg-pts'];

    sessionStorage.setItem('smtkd_active_match_rules', JSON.stringify(reglas));
    window.location.href = 'combate.html';
};

// ================= GESTIÓN DE ATLETAS =================
window.guardarAtletaNuevo = function() {
    let nom = document.getElementById('torn-nombre').value.trim().toUpperCase();
    let clb = document.getElementById('torn-club').value.trim().toUpperCase();
    let cin = document.getElementById('torn-cinturon').value;
    let pes = document.getElementById('torn-peso').value;

    if(!nom) return alert("Falta el nombre del atleta");
    
    let nuevoAtleta = { id: 'ID_' + Date.now().toString(36) + Math.random().toString(36).substr(2), nombre: nom, club: clb, cinturon: cin, peso: pes };
    poolCompetidores.push(nuevoAtleta);
    localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
    
    document.getElementById('torn-nombre').value = "";
    document.getElementById('torn-club').value = "";
    
    actualizarContadorBase();
    document.getElementById('filtro-cinturon').value = cin;
    document.getElementById('filtro-peso').value = pes;
    renderizarLlaveAutomatica();
};

window.exportarBaseAtletas = function() {
    if (poolCompetidores.length === 0) return alert("Base vacía.");
    const dl = document.createElement('a'); 
    dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(poolCompetidores))); 
    dl.setAttribute("download", "Base_Atletas_SMTKD.json");
    document.body.appendChild(dl); dl.click(); dl.remove();
};

window.importarBaseAtletas = function(e) {
    const archivo = e.target.files[0]; if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(evt) {
        try {
            const importados = JSON.parse(evt.target.result);
            if (Array.isArray(importados)) {
                poolCompetidores = importados.map(c => { if(!c.id) c.id = 'ID_' + Date.now().toString(36) + Math.random().toString(36).substr(2); return c; });
                localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
                actualizarContadorBase();
                renderizarLlaveAutomatica();
            }
        } catch(err) { alert("Error leyendo JSON."); }
    };
    lector.readAsText(archivo);
};

// ================= BARRA SUPERIOR DINÁMICA DE BOTONES =================
window.renderizarBarraCategorias = function() {
    const bar = document.getElementById('categorias-activas-bar'); if(!bar) return;
    let combinaciones = [];
    poolCompetidores.forEach(a => {
        let comboId = a.cinturon + "|" + a.peso;
        if(!combinaciones.find(c => c.id === comboId)) combinaciones.push({ id: comboId, cinturon: a.cinturon, peso: a.peso });
    });
    combinaciones.sort((a,b) => a.id.localeCompare(b.id));
    let fCin = document.getElementById('filtro-cinturon').value;
    let fPes = document.getElementById('filtro-peso').value;

    let html = `<button class="btn-cat-activa ${(fCin === 'TODOS' && fPes === 'TODOS') ? 'activa' : ''}" onclick="cambiarCategoriaRapida('TODOS', 'TODOS')"><i class="fa-solid fa-globe"></i> TODOS / LIBRE</button>`;
    combinaciones.forEach(c => {
        let isActiva = (c.cinturon === fCin && c.peso === fPes) ? 'activa' : '';
        let cinCorto = c.cinturon.split('(')[0].trim(); 
        let pesoCorto = c.peso.replace('MASCULINO', 'M').replace('FEMENINO', 'F').replace('ADULTOS', 'ADUL').replace('INFANTIL', 'INF').replace('JUVENIL', 'JUV');
        html += `<button class="btn-cat-activa ${isActiva}" onclick="cambiarCategoriaRapida('${c.cinturon}', '${c.peso}')">${cinCorto} | ${pesoCorto}</button>`;
    });
    bar.innerHTML = html;
};

window.cambiarCategoriaRapida = function(cinturon, peso) {
    document.getElementById('filtro-cinturon').value = cinturon;
    document.getElementById('filtro-peso').value = peso;
    renderizarLlaveAutomatica();
};

// ================= PROGRESO Y RECONSTRUCCIÓN DE CRUCES =================
window.renderizarLlaveAutomatica = function() {
    const box = document.getElementById('bracket-render-box'); if(!box) return;
    let fCin = document.getElementById('filtro-cinturon').value;
    let fPes = document.getElementById('filtro-peso').value;
    let keyLlave = fCin + "_" + fPes;

    let atletasLlave = poolCompetidores.filter(a => {
        return (fCin === 'TODOS' || a.cinturon === fCin) && (fPes === 'TODOS' || a.peso === fPes);
    });

    if(atletasLlave.length === 0) { 
        box.innerHTML = `<div style="text-align:center; padding: 50px; color:#475569; font-weight:bold; letter-spacing:1px; margin-top:20px;">NO HAY ATLETAS REGISTRADOS EN ESTA CATEGORÍA</div>`; 
        renderizarBarraCategorias(); return; 
    }
    
    let progreso = JSON.parse(localStorage.getItem('smtkd_progreso_llaves')) || {};
    if(!progreso[keyLlave]) progreso[keyLlave] = {};

    let numAtletas = atletasLlave.length;
    let numRondas = Math.ceil(Math.log2(Math.max(numAtletas, 2)));
    let slotsBase = Math.pow(2, numRondas);

    let atletasAlineados = [...atletasLlave];
    while(atletasAlineados.length < slotsBase) { atletasAlineados.push(null); }

    let rondasData = [atletasAlineados];
    let nombresRondas = ["FINAL", "SEMIFINALES", "CUARTOS DE FINAL", "OCTAVOS DE FINAL", "16VOS DE FINAL"];
    let html = `<div class="torneo-bracket-container"><div class="bracket-esports-layout">`;
    let subTitulo = (fCin === 'TODOS' && fPes === 'TODOS') ? "LLAVE LIBRE" : `${fPes}`;

    for(let r = 0; r < numRondas; r++) {
        let tituloRonda = nombresRondas[numRondas - r - 1] || `RONDA ${r+1}`;
        html += `<div class="bracket-columna"><div class="bracket-titulo-ronda">${tituloRonda} <span style="color:#fff; opacity:0.6; font-size:9px;">(${subTitulo})</span></div>`;
        
        let nextRondaData = [];
        let numMatches = rondasData[r].length / 2;

        for(let m = 0; m < numMatches; m++) {
            let rj = rondasData[r][m*2]; let az = rondasData[r][m*2+1];
            let matchId = `r${r}_m${m}`; let idGanador = progreso[keyLlave][matchId];
            
            if (rj && !az && !idGanador) { idGanador = rj.id; progreso[keyLlave][matchId] = rj.id; }
            else if (!rj && az && !idGanador) { idGanador = az.id; progreso[keyLlave][matchId] = az.id; }

            let ganadorObj = idGanador ? poolCompetidores.find(a => a.id === idGanador) : null;
            nextRondaData.push(ganadorObj);

            let idR = rj ? rj.nombre : 'ESPERANDO RIVAL'; let clubR = rj ? rj.club : '';
            let idA = az ? az.nombre : 'ESPERANDO RIVAL'; let clubA = az ? az.club : '';
            if(!rj && r===0) idR = "BYE / VACANTE"; if(!az && r===0) idA = "BYE / VACANTE";

            let classR = (!rj || (idGanador && idGanador !== (rj?rj.id:''))) ? 'atleta-vacante' : ''; 
            let classA = (!az || (idGanador && idGanador !== (az?az.id:''))) ? 'atleta-vacante' : '';
            let disBtn = (!rj || !az || idGanador) ? 'disabled' : '';
            let txtBtn = idGanador ? "COMBATE CERRADO" : "FIGHT MATCH";
            
            let idRojoStr = rj ? rj.id : 'null'; let idAzulStr = az ? az.id : 'null';
            let claseConector = (r < numRondas - 1) ? ((m % 2 === 0) ? "nodo-semifinal-top" : "nodo-semifinal-bottom") : "nodo-final";

            let controlesFlotantes = "";
            if(r === 0 && !idGanador) {
                controlesFlotantes = `
                <div class="acciones-match-flotantes">
                    <button class="btn-match-accion edit" title="Subir" onclick="moverAtleta('${idRojoStr}', -1)"><i class="fa-solid fa-arrow-up"></i></button>
                    <button class="btn-match-accion edit" title="Bajar" onclick="moverAtleta('${idAzulStr}', 1)"><i class="fa-solid fa-arrow-down"></i></button>
                    <button class="btn-match-accion edit" title="Editar" onclick="editarMatch('${idRojoStr}', '${idAzulStr}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-match-accion delete" title="Remover" onclick="eliminarMatch('${idRojoStr}', '${idAzulStr}')"><i class="fa-solid fa-trash"></i></button>
                </div>`;
            }

            html += `
            <div class="nodo-match ${claseConector}">
                <div class="cruce-match-box">
                    ${controlesFlotantes}
                    <div class="fila-atleta-llave b-rojo ${classR}"><div><span class="nombre-llave">${idR}</span><span class="club-atleta-llave">${clubR}</span></div></div>
                    <div class="fila-atleta-llave b-azul ${classA}"><div><span class="nombre-llave">${idA}</span><span class="club-atleta-llave">${clubA}</span></div></div>
                    <button class="btn-lanzar-match" onclick="lanzarMatchSetup('${idRojoStr}', '${idAzulStr}', '${keyLlave}', '${matchId}')" ${disBtn}>${txtBtn}</button>
                </div>
            </div>`;
        }
        rondasData[r+1] = nextRondaData; html += `</div>`;
    }

    let campeon = rondasData[numRondas][0];
    if(campeon) {
        html += `
        <div class="bracket-columna" style="justify-content: center;"><div class="bracket-titulo-ronda" style="color:#00ff88; border-color:#00ff88;">CAMPEÓN 🏆</div>
            <div class="cruce-match-box box-campeon" style="border-color:#00ff88; box-shadow: 0 0 30px rgba(0,255,136,0.2); justify-content: center; align-items: center; padding: 40px 20px;">
                <i class="fa-solid fa-trophy" style="font-size:45px; color:#00ff88; margin-bottom:15px; filter: drop-shadow(0 0 10px #00ff88);"></i>
                <div class="nombre-llave" style="font-size:22px; color:#fff;">${campeon.nombre}</div><div class="club-atleta-llave" style="color:#00ddff; font-size:12px;">${campeon.club}</div>
            </div>
        </div>`;
    }
    html += `</div></div>`; box.innerHTML = html;
    localStorage.setItem('smtkd_progreso_llaves', JSON.stringify(progreso));
    renderizarBarraCategorias();
};

window.moverAtleta = function(idAtleta, direccion) {
    let fCin = document.getElementById('filtro-cinturon').value;
    let fPes = document.getElementById('filtro-peso').value;
    let atletasLlave = poolCompetidores.filter(a => (fCin === 'TODOS' || a.cinturon === fCin) && (fPes === 'TODOS' || a.peso === fPes));
    let idxVisual = atletasLlave.findIndex(a => a.id === idAtleta); if(idxVisual < 0) return;
    let newIdxVisual = idxVisual + direccion;
    if(newIdxVisual >= 0 && newIdxVisual < atletasLlave.length) {
        let idTarget = atletasLlave[newIdxVisual].id;
        let absIdx1 = poolCompetidores.findIndex(a => a.id === idAtleta);
        let absIdx2 = poolCompetidores.findIndex(a => a.id === idTarget);
        let temp = poolCompetidores[absIdx1]; poolCompetidores[absIdx1] = poolCompetidores[absIdx2]; poolCompetidores[absIdx2] = temp;
        localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
        
        let progreso = JSON.parse(localStorage.getItem('smtkd_progreso_llaves')) || {};
        delete progreso[fCin + "_" + fPes]; localStorage.setItem('smtkd_progreso_llaves', JSON.stringify(progreso));
        renderizarLlaveAutomatica();
    }
};

window.lanzarMatchSetup = function(idR, idA, keyLlave, matchId) {
    let rj = poolCompetidores.find(a => a.id === idR); let az = poolCompetidores.find(a => a.id === idA);
    sessionStorage.setItem('smtkd_preload_match', JSON.stringify({ 
        rojo: rj ? rj.nombre : '', clubRojo: rj ? rj.club : '', idRojo: idR,
        azul: az ? az.nombre : '', clubAzul: az ? az.club : '', idAzul: idA,
        keyLlave: keyLlave, matchId: matchId, categoria: keyLlave.replace('_', ' | ')
    }));
    window.location.href = 'setup.html';
};

window.resetearLlaveActual = function() {
    let fCin = document.getElementById('filtro-cinturon').value;
    let fPes = document.getElementById('filtro-peso').value;
    if(confirm(`🚨 ¿Querés REINICIAR los combates de la categoría: ${fCin} | ${fPes}? Se borrarán los ganadores cargados.`)) {
        let progreso = JSON.parse(localStorage.getItem('smtkd_progreso_llaves')) || {};
        delete progreso[fCin + "_" + fPes];
        localStorage.setItem('smtkd_progreso_llaves', JSON.stringify(progreso));
        renderizarLlaveAutomatica();
    }
};

window.borrarBaseCompleta = function() { document.getElementById('modal-confirm-delete').classList.add('activa'); };
window.cerrarModalBorrado = function() { document.getElementById('modal-confirm-delete').classList.remove('activa'); };
window.ejecutarBorradoBase = function() {
    poolCompetidores = []; localStorage.removeItem('smtkd_competidores'); localStorage.removeItem('smtkd_progreso_llaves');
    actualizarContadorBase(); renderizarLlaveAutomatica(); cerrarModalBorrado();
};

window.editarMatch = function(idRojo, idAzul) {
    let atletaRojo = poolCompetidores.find(a => a.id === idRojo); let atletaAzul = poolCompetidores.find(a => a.id === idAzul);
    document.getElementById('edit-id-rojo').value = idRojo; document.getElementById('edit-nombre-rojo').value = atletaRojo ? atletaRojo.nombre : ''; document.getElementById('edit-club-rojo').value = atletaRojo ? atletaRojo.club : '';
    document.getElementById('edit-id-azul').value = idAzul; document.getElementById('edit-nombre-azul').value = atletaAzul ? atletaAzul.nombre : ''; document.getElementById('edit-club-azul').value = atletaAzul ? atletaAzul.club : '';
    document.getElementById('modal-edit-match').classList.add('activa');
};
window.cerrarModalEdicion = function() { document.getElementById('modal-edit-match').classList.remove('activa'); };
window.guardarEdicionMatch = function() {
    let idR = document.getElementById('edit-id-rojo').value; let idA = document.getElementById('edit-id-azul').value;
    let aRojo = poolCompetidores.find(a => a.id === idR); if(aRojo) { aRojo.nombre = document.getElementById('edit-nombre-rojo').value.trim().toUpperCase() || "BYE / VACANTE"; aRojo.club = document.getElementById('edit-club-rojo').value.trim().toUpperCase(); }
    let aAzul = poolCompetidores.find(a => a.id === idA); if(aAzul) { aAzul.nombre = document.getElementById('edit-nombre-azul').value.trim().toUpperCase() || "BYE / VACANTE"; aAzul.club = document.getElementById('edit-club-azul').value.trim().toUpperCase(); }
    localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores)); renderizarLlaveAutomatica(); cerrarModalEdicion();
};

let matchABorrar = null;
window.eliminarMatch = function(idRojo, idAzul) { matchABorrar = { idRojo, idAzul }; document.getElementById('modal-confirm-delete-match').classList.add('activa'); };
window.cerrarModalBorrarMatch = function() { matchABorrar = null; document.getElementById('modal-confirm-delete-match').classList.remove('activa'); };
window.ejecutarBorradoMatch = function() {
    if(matchABorrar) {
        poolCompetidores = poolCompetidores.filter(a => a.id !== matchABorrar.idRojo && a.id !== matchABorrar.idAzul);
        localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
        let fCin = document.getElementById('filtro-cinturon').value; let fPes = document.getElementById('filtro-peso').value;
        let progreso = JSON.parse(localStorage.getItem('smtkd_progreso_llaves')) || {};
        delete progreso[fCin + "_" + fPes]; localStorage.setItem('smtkd_progreso_llaves', JSON.stringify(progreso));
        actualizarContadorBase(); renderizarLlaveAutomatica();
    }
    cerrarModalBorrarMatch();
};

function loopTestMandos() {
    if(!document.getElementById('pagina-test')?.classList.contains('activa')) { requestAnimationFrame(loopTestMandos); return; }
    const gps = navigator.getGamepads();
    for(let i=0; i<2; i++) {
        let gp = gps[i]; let slot = document.getElementById(`ps-slot-${i}`);
        if(!gp) { if(slot) slot.classList.remove('conectado'); continue; }
        if(slot) slot.classList.add('conectado');
        document.getElementById(`btn-${i}-up`)?.classList.toggle('prendido', gp.buttons[12]?.pressed);
        document.getElementById(`btn-${i}-down`)?.classList.toggle('prendido', gp.buttons[13]?.pressed);
        document.getElementById(`btn-${i}-left`)?.classList.toggle('prendido', gp.buttons[14]?.pressed);
        document.getElementById(`btn-${i}-right`)?.classList.toggle('prendido', gp.buttons[15]?.pressed);
    }
    requestAnimationFrame(loopTestMandos);
}