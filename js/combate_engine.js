// =========================================================================
// MOTOR CENTRAL DE COMBATE Y BROADCAST A TV (VERSIÓN BLINDADA)
// =========================================================================

const canalTransmision = new BroadcastChannel('smtkd_transmision');
let r = JSON.parse(sessionStorage.getItem('smtkd_active_match_rules'));

let configPelea = r || { tiempoRound: 90, tiempoDescanso: 60, tiempoMedico: 60, sistema: 'best3', mandosActivos: 1, coincidenciasRequeridas: 1, gamjeomLimiteActivo: true, gamjeomMax: 5, pointGapActivo: true, pointGapPts: 12 };
let combate = { 
    rojo: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 }, 
    azul: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 } 
};
let colaDeVotos = []; let fase = 'pelea'; let roundActual = 1; let tiempoRestante = configPelea.tiempoRound; let corriendo = false; let intervalo; let ganadorDelCombate = null; let tiempoPeleaGuardado = 0; let estadoAnteriorMandos = {};

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('cronometro')) {
        // Inicializar interfaz Operador
        document.getElementById('nombre-display-rojo').innerText = r?.nombreRojo || "HONG";
        document.getElementById('subtexto-display-rojo').innerText = r?.clubRojo || "CLUB";
        document.getElementById('rank-display-rojo').innerText = r?.rankRojo || "SEED";
        document.getElementById('nombre-display-azul').innerText = r?.nombreAzul || "CHONG";
        document.getElementById('subtexto-display-azul').innerText = r?.clubAzul || "CLUB";
        document.getElementById('rank-display-azul').innerText = r?.rankAzul || "SEED";
        document.getElementById('categoria-display').innerText = r?.categoria || "DIVISIÓN OFICIAL WT";
        
        let imgRojo = document.getElementById('img-bandera-rojo');
        if (r?.paisRojo && imgRojo) { imgRojo.src = `banderas/${r.paisRojo.toLowerCase()}.png`; imgRojo.style.display='block'; imgRojo.onerror = () => imgRojo.style.display='none'; }
        
        let imgAzul = document.getElementById('img-bandera-azul');
        if (r?.paisAzul && imgAzul) { imgAzul.src = `banderas/${r.paisAzul.toLowerCase()}.png`; imgAzul.style.display='block'; imgAzul.onerror = () => imgAzul.style.display='none'; }

        // Garantizar visibilidad de J1 y J2 local
        for(let i=1; i<=2; i++) {
            let m = (i <= configPelea.mandosActivos) ? 'flex' : 'none';
            if(document.getElementById(`j${i}-rojo-box`)) document.getElementById(`j${i}-rojo-box`).style.display = m;
            if(document.getElementById(`j${i}-azul-box`)) document.getElementById(`j${i}-azul-box`).style.display = m;
        }
        actualizarPantallaCombate();
    }
});

function actualizarPantallaCombate(bando = null, tipo = null) {
    let m = Math.floor(tiempoRestante / 60); let s = tiempoRestante % 60;
    let timeStr = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    let lblFase = document.getElementById('lbl-fase')?.innerText || "ROUND";
    
    if(document.getElementById('cronometro')) {
        document.getElementById('pts-rojo').innerText = combate.rojo.puntos; document.getElementById('flt-rojo').innerText = combate.rojo.gamjeoms;
        document.getElementById('pts-azul').innerText = combate.azul.puntos; document.getElementById('flt-azul').innerText = combate.azul.gamjeoms;
        document.getElementById('cronometro').innerText = timeStr; document.getElementById('round-actual').innerText = roundActual;
        
        document.getElementById('round-rojo-1').classList.toggle('activo', combate.rojo.roundsGanados >= 1);
        document.getElementById('round-rojo-2').classList.toggle('activo', combate.rojo.roundsGanados >= 2);
        document.getElementById('round-azul-1').classList.toggle('activo', combate.azul.roundsGanados >= 1);
        document.getElementById('round-azul-2').classList.toggle('activo', combate.azul.roundsGanados >= 2);
    }

    // BROADCAST A TV: Se manda SIEMPRE configPelea.mandosActivos para que la TV no pierda al Juez 2
    canalTransmision.postMessage({
        nombreRojo: r?.nombreRojo, subtextoRojo: r?.clubRojo, rankRojo: r?.rankRojo, srcBanderaRojo: r?`banderas/${r.paisRojo.toLowerCase()}.png`:'',
        nombreAzul: r?.nombreAzul, subtextoAzul: r?.clubAzul, rankAzul: r?.rankAzul, srcBanderaAzul: r?`banderas/${r.paisAzul.toLowerCase()}.png`:'',
        categoriaCombate: r?.categoria, ptsRojo: combate.rojo.puntos, fltRojo: combate.rojo.gamjeoms, ptsAzul: combate.azul.puntos, fltAzul: combate.azul.gamjeoms,
        roundActual, cronometro: timeStr, lblFase: lblFase,
        roundRojo1: combate.rojo.roundsGanados>=1, roundRojo2: combate.rojo.roundsGanados>=2, roundAzul1: combate.azul.roundsGanados>=1, roundAzul2: combate.azul.roundsGanados>=2,
        hitBando: bando, hitTipo: tipo, mandosActivos: configPelea.mandosActivos
    });
}

window.procesarIntencionVotoDirecto = function(bando, cantidad, tipo, index = 0) {
    if(ganadorDelCombate || fase !== 'pelea') return;
    let realJ = (index % 2 === 0) ? 0 : 1;
    
    // Iluminar panel lateral
    let vis = `j${realJ+1}`;
    let b = document.getElementById(`${vis}-${bando}-box`); let v = document.getElementById(`${vis}-${bando}-val`);
    if(b && v) { v.innerText = cantidad > 0 ? `+${cantidad}` : cantidad; b.classList.add('parpadeo-voto'); setTimeout(()=>{ b.classList.remove('parpadeo-voto'); v.innerText="--"; }, 900); }
    canalTransmision.postMessage({ comandoAccion: "VOTO_JUEZ", juez: vis, bando, cantidad });

    if(configPelea.coincidenciasRequeridas === 1) { cambiarPuntosDirecto(bando, cantidad, tipo); return; }

    let ahora = Date.now();
    colaDeVotos.push({ bando, cantidad, tipo, idJuez: realJ, timestamp: ahora });
    colaDeVotos = colaDeVotos.filter(v => (ahora - v.timestamp) <= 2000); // Ventana de 2 segundos para coincidir

    let match = colaDeVotos.filter(v => v.bando === bando && v.cantidad === cantidad && v.tipo === tipo);
    let jueces = [...new Set(match.map(v => v.idJuez))];

    if(jueces.length >= configPelea.coincidenciasRequeridas) {
        cambiarPuntosDirecto(bando, cantidad, tipo);
        jueces.forEach(j => { let box = document.getElementById(`j${j+1}-${bando}-box`); if(box) { box.classList.add('activo'); setTimeout(()=>box.classList.remove('activo'),1000); } });
        colaDeVotos = colaDeVotos.filter(v => !(v.bando === bando && v.tipo === tipo));
    }
};

window.cambiarPuntosDirecto = function(bando, cantidad, tipo) {
    let a = combate[bando]; a.puntos = Math.max(0, a.puntos + cantidad);
    if(cantidad > 0 && tipo) a[tipo]++;
    let numDisplay = document.getElementById(`pts-${bando}`); if(numDisplay && cantidad>0){ numDisplay.classList.add('hit'); setTimeout(()=>numDisplay.classList.remove('hit'), 150); }
    actualizarPantallaCombate(bando, tipo);
    if(configPelea.pointGapActivo && Math.abs(combate.rojo.puntos - combate.azul.puntos) >= configPelea.pointGapPts) { detenerCronometroFuerza(); procesarFinRound(combate.rojo.puntos > combate.azul.puntos?'rojo':'azul', "Point Gap."); }
};

window.cambiarFalta = function(bando, cant) {
    let inf = combate[bando]; let op = combate[bando==='rojo'?'azul':'rojo'];
    if(cant > 0) { inf.gamjeoms++; op.puntos++; actualizarPantallaCombate(); if(configPelea.gamjeomLimiteActivo && inf.gamjeoms >= configPelea.gamjeomMax) { detenerCronometroFuerza(); procesarFinRound(bando==='rojo'?'azul':'rojo', "Descalificación por Gam-Jeom."); } }
    else { if(inf.gamjeoms>0) { inf.gamjeoms--; op.puntos=Math.max(0, op.puntos-1); actualizarPantallaCombate(); } }
};

window.controlarTiempo = function() {
    if(ganadorDelCombate) return;
    const btn = document.getElementById('btn-iniciar');
    if(corriendo) { clearInterval(intervalo); corriendo = false; btn.innerText = "▶ START"; btn.style.background = "#1b5e20"; }
    else { corriendo = true; btn.innerText = "❚❚ PAUSE"; btn.style.background = "#b71c1c"; intervalo = setInterval(() => { if(tiempoRestante > 0) { tiempoRestante--; actualizarPantallaCombate(); } else { detenerCronometroFuerza(); evaluarSuperioridad(); } }, 1000); }
};
window.detenerCronometroFuerza = function() { clearInterval(intervalo); corriendo = false; if(document.getElementById('btn-iniciar')) document.getElementById('btn-iniciar').innerText = "▶ START", document.getElementById('btn-iniciar').style.background = "#1b5e20"; };
window.modificarTiempo = function(s) { tiempoRestante = Math.max(0, tiempoRestante + s); actualizarPantallaCombate(); };
window.iniciarKyeShi = function() { if(corriendo) controlarTiempo(); tiempoPeleaGuardado = tiempoRestante; fase = 'kyeshi'; tiempoRestante = configPelea.tiempoMedico; document.getElementById('lbl-fase').innerText = "KYE-SHI"; controlarTiempo(); };

function evaluarSuperioridad() {
    let r = combate.rojo; let a = combate.azul;
    if(r.puntos !== a.puntos) return procesarFinRound(r.puntos>a.puntos?'rojo':'azul', "Puntos Netos.");
    let gR = (r.petogiro*4)+(r.cascogiro*6); let gA = (a.petogiro*4)+(a.cascogiro*6);
    if(gR !== gA) return procesarFinRound(gR>gA?'rojo':'azul', "Puntos por Giros.");
    if(r.casco !== a.casco) return procesarFinRound(r.casco>a.casco?'rojo':'azul', "Impactos a la Cabeza.");
    if(r.peto !== a.peto) return procesarFinRound(r.peto>a.peto?'rojo':'azul', "Impactos al Peto.");
    document.getElementById('contenedor-estadisticas').style.display = "none"; document.getElementById('contenedor-voto-manual').style.display = "block"; document.getElementById('btn-modal-accion').style.display = "none"; document.getElementById('modal-round').classList.add('activo');
}

function procesarFinRound(ganador, motivo) {
    combate[ganador].roundsGanados++; actualizarPantallaCombate();
    if(configPelea.sistema === 'best3') {
        if(combate.rojo.roundsGanados >= 2) { ganadorDelCombate = 'rojo'; abrirModalFinal("COMBATE FINALIZADO", "GANADOR: HONG (ROJO)", motivo); }
        else if(combate.azul.roundsGanados >= 2) { ganadorDelCombate = 'azul'; abrirModalFinal("COMBATE FINALIZADO", "GANADOR: CHONG (AZUL)", motivo); }
        else { abrirModalFinal(`ROUND ${roundActual} TERMINADO`, `GANADOR: ${ganador.toUpperCase()}`, motivo); }
    } else {
        if(roundActual >= 3) { ganadorDelCombate = combate.rojo.puntos>combate.azul.puntos?'rojo':'azul'; abrirModalFinal("COMBATE FIN", `GANADOR: ${ganadorDelCombate.toUpperCase()}`, "Puntaje Acumulativo."); }
        else abrirModalFinal(`ROUND ${roundActual} TERMINADO`, "PREPARAR SIGUIENTE ROUND", motivo);
    }
}

function abrirModalFinal(tit, gan, crit) {
    if(!document.getElementById('modal-round')) return;
    document.getElementById('modal-r-titulo').innerText = tit; document.getElementById('modal-r-ganador').innerText = gan; document.getElementById('modal-r-criterio').innerText = "Criterio: " + crit;
    document.getElementById('st-pt-r').innerText = combate.rojo.puntos; document.getElementById('st-pt-a').innerText = combate.azul.puntos;
    document.getElementById('st-pu-r').innerText = combate.rojo.punio; document.getElementById('st-pu-a').innerText = combate.azul.punio;
    document.getElementById('st-pe-r').innerText = combate.rojo.peto; document.getElementById('st-pe-a').innerText = combate.azul.peto;
    document.getElementById('st-ca-r').innerText = combate.rojo.casco; document.getElementById('st-ca-a').innerText = combate.azul.casco;
    document.getElementById('st-gj-r').innerText = combate.azul.gamjeoms; document.getElementById('st-gj-a').innerText = combate.rojo.gamjeoms;
    document.getElementById('modal-round').classList.add('activo');
    canalTransmision.postMessage({ comandoAccion: "MOSTRAR_ESTADISTICAS_PUBLICO", tituloRound: tit, ganadorRoundTexto: gan, criterioRoundTexto: crit });
}

window.avanzarSiguientePaso = function() {
    document.getElementById('modal-round').classList.remove('activo'); canalTransmision.postMessage({ comandoAccion: "OCULTAR_ESTADISTICAS_PUBLICO" });
    if(ganadorDelCombate) { window.location.href = 'setup.html'; }
    else {
        roundActual++; if(configPelea.sistema === 'best3') { ['rojo','azul'].forEach(b => { combate[b].puntos=0; combate[b].gamjeoms=0; }); }
        fase = 'descanso'; tiempoRestante = configPelea.tiempoDescanso; document.getElementById('lbl-fase').innerText = "DESCANSO"; actualizarPantallaCombate();
        intervalo = setInterval(() => { if(tiempoRestante>0) { tiempoRestante--; actualizarPantallaCombate(); } else { clearInterval(intervalo); fase='pelea'; tiempoRestante=configPelea.tiempoRound; document.getElementById('lbl-fase').innerText="ROUND"; actualizarPantallaCombate(); } }, 1000);
    }
};

window.asignarGanadorManual = function(b) { document.getElementById('contenedor-voto-manual').style.display="none"; document.getElementById('contenedor-estadisticas').style.display="flex"; document.getElementById('btn-modal-accion').style.display="block"; procesarFinRound(b, "Decisión Arbitral Unánime."); };
window.abrirModalAdmin = function() { if(corriendo) controlarTiempo(); document.getElementById('modal-admin').classList.add('activo'); };
window.cerrarModalAdmin = function() { document.getElementById('modal-admin').classList.remove('activo'); };

// =========================================================================
// RECEPCIÓN EN LA PANTALLA DE TV (VISTA-PUBLICO)
// =========================================================================
canalTransmision.onmessage = function(e) {
    let d = e.data; const iconClasses = { 'punio': 'icon-punio', 'peto': 'icon-peto', 'casco': 'icon-casco', 'petogiro': 'icon-petogiro', 'cascogiro': 'icon-cascogiro' };
    
    // Si NO existe el cronometro (Significa que estamos en vista-publico.html)
    if(!document.getElementById('cronometro')) {
        
        // Efectos de Voto de Juez (Parpadeo)
        if(d.comandoAccion === "VOTO_JUEZ") {
            let b = document.getElementById(`pub-${d.juez}-${d.bando}-box`); let v = document.getElementById(`pub-${d.juez}-${d.bando}-val`);
            if(b && v) { v.innerText = d.cantidad>0?`+${d.cantidad}`:d.cantidad; b.classList.add('parpadeo-voto'); setTimeout(()=>{b.classList.remove('parpadeo-voto'); v.innerText="--";},900); } return;
        }
        // Mostrar/Ocultar Modales en TV
        if(d.comandoAccion === "MOSTRAR_ESTADISTICAS_PUBLICO") { document.getElementById('pub-modal-r-titulo').innerText = d.tituloRound; document.getElementById('pub-modal-r-ganador').innerText = d.ganadorRoundTexto; document.getElementById('pub-modal-r-criterio').innerText = d.criterioRoundTexto; document.getElementById('pub-modal-round').classList.add('activo'); return; }
        if(d.comandoAccion === "OCULTAR_ESTADISTICAS_PUBLICO") { document.getElementById('pub-modal-round').classList.remove('activo'); return; }

        // Actualización Constante de Datos y Reloj
        document.getElementById('pub-nombre-rojo').innerText = d.nombreRojo; document.getElementById('pub-subtexto-rojo').innerText = d.subtextoRojo; document.getElementById('pub-rank-rojo').innerText = d.rankRojo;
        document.getElementById('pub-nombre-azul').innerText = d.nombreAzul; document.getElementById('pub-subtexto-azul').innerText = d.subtextoAzul; document.getElementById('pub-rank-azul').innerText = d.rankAzul;
        document.getElementById('pub-categoria').innerText = d.categoriaCombate;
        document.getElementById('pub-pts-rojo').innerText = d.ptsRojo; document.getElementById('pub-flt-rojo').innerText = d.fltRojo;
        document.getElementById('pub-pts-azul').innerText = d.ptsAzul; document.getElementById('pub-flt-azul').innerText = d.fltAzul;
        document.getElementById('pub-round-actual').innerText = d.roundActual; document.getElementById('pub-cronometro').innerText = d.cronometro; document.getElementById('pub-lbl-fase').innerText = d.lblFase;
        
        document.getElementById('pub-round-rojo-1').classList.toggle('activo', d.roundRojo1); document.getElementById('pub-round-rojo-2').classList.toggle('activo', d.roundRojo2);
        document.getElementById('pub-round-azul-1').classList.toggle('activo', d.roundAzul1); document.getElementById('pub-round-azul-2').classList.toggle('activo', d.roundAzul2);
        
        // Garantizar visibilidad correcta de J1 y J2 en TV
        let mActivos = d.mandosActivos || 1;
        for(let i=1; i<=2; i++) {
            let m = (i <= mActivos) ? 'flex' : 'none';
            if(document.getElementById(`pub-j${i}-rojo-box`)) document.getElementById(`pub-j${i}-rojo-box`).style.display = m;
            if(document.getElementById(`pub-j${i}-azul-box`)) document.getElementById(`pub-j${i}-azul-box`).style.display = m;
        }

        // Banderas en TV
        let imgRojo = document.getElementById('pub-bandera-rojo');
        if(d.srcBanderaRojo && imgRojo) { imgRojo.src = d.srcBanderaRojo; imgRojo.style.display='block'; imgRojo.onerror=()=>imgRojo.style.display='none'; }
        let imgAzul = document.getElementById('pub-bandera-azul');
        if(d.srcBanderaAzul && imgAzul) { imgAzul.src = d.srcBanderaAzul; imgAzul.style.display='block'; imgAzul.onerror=()=>imgAzul.style.display='none'; }

        // Animación de Golpe
        if(d.hitBando && d.hitTipo && iconClasses[d.hitTipo]) {
            let i = document.getElementById(`pub-hit-${d.hitBando}`); i.className = `icono-hit-reciente tkd-icon ${iconClasses[d.hitTipo]}`;
            i.classList.add('show'); setTimeout(()=>i.classList.remove('show'), 1200);
        }
    }
};

// =========================================================================
// LECTURA DE JOYSTICKS SIMULTÁNEOS
// =========================================================================
function loopGamepadsCombate() {
    if(document.getElementById('cronometro') && !document.getElementById('modal-admin').classList.contains('activo') && !document.getElementById('modal-round').classList.contains('activo')) {
        const gps = navigator.getGamepads();
        for(let i=0; i<2; i++) {
            let gp = gps[i]; if(!gp) continue;
            if(!estadoAnteriorMandos[i]) estadoAnteriorMandos[i] = {};
            let res = gp.buttons[6]?.pressed || false; // L2 para restar
            
            if(gp.buttons[13]?.pressed && !estadoAnteriorMandos[i].btn_down)  procesarIntencionVotoDirecto('rojo', res ? -1 : 1, 'punio', i);
            if(gp.buttons[15]?.pressed && !estadoAnteriorMandos[i].btn_right) procesarIntencionVotoDirecto('rojo', res ? -2 : 2, 'peto', i);
            if(gp.buttons[12]?.pressed && !estadoAnteriorMandos[i].btn_up)    procesarIntencionVotoDirecto('rojo', res ? -3 : 3, 'casco', i);
            if(gp.buttons[14]?.pressed && !estadoAnteriorMandos[i].btn_left)  procesarIntencionVotoDirecto('rojo', res ? -4 : 4, 'petogiro', i);
            if(gp.buttons[4]?.pressed && !estadoAnteriorMandos[i].btn_l1)     procesarIntencionVotoDirecto('rojo', res ? -6 : 6, 'cascogiro', i);

            if(gp.buttons[0]?.pressed && !estadoAnteriorMandos[i].btn_x)     procesarIntencionVotoDirecto('azul', res ? -1 : 1, 'punio', i);
            if(gp.buttons[2]?.pressed && !estadoAnteriorMandos[i].btn_sq)    procesarIntencionVotoDirecto('azul', res ? -2 : 2, 'peto', i);
            if(gp.buttons[3]?.pressed && !estadoAnteriorMandos[i].btn_tr)    procesarIntencionVotoDirecto('azul', res ? -3 : 3, 'casco', i);
            if(gp.buttons[1]?.pressed && !estadoAnteriorMandos[i].btn_ci)    procesarIntencionVotoDirecto('azul', res ? -4 : 4, 'petogiro', i);
            if(gp.buttons[5]?.pressed && !estadoAnteriorMandos[i].btn_r1)    procesarIntencionVotoDirecto('azul', res ? -6 : 6, 'cascogiro', i);

            estadoAnteriorMandos[i] = { btn_down: gp.buttons[13]?.pressed, btn_right: gp.buttons[15]?.pressed, btn_up: gp.buttons[12]?.pressed, btn_left: gp.buttons[14]?.pressed, btn_l1: gp.buttons[4]?.pressed, btn_x: gp.buttons[0]?.pressed, btn_sq: gp.buttons[2]?.pressed, btn_tr: gp.buttons[3]?.pressed, btn_ci: gp.buttons[1]?.pressed, btn_r1: gp.buttons[5]?.pressed };
        }
    }
  
  requestAnimationFrame(loopGamepadsCombate);

}
requestAnimationFrame(loopGamepadsCombate);