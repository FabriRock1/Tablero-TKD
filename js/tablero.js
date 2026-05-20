const canalTransmision = new BroadcastChannel('smtkd_transmision');

window.abrirPantallaPublico = function() { window.open('vista-publico.html', 'SMTKD_Estadio', 'width=1280,height=720'); };

window.cambiarPagina = function(id) { 
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('activa')); 
    const paginaDestino = document.getElementById(id);
    if (paginaDestino) { paginaDestino.classList.add('activa'); pantallaActiva = id; }
};

window.iniciarCombate = function() {
    configPelea.tiempoRound = (parseInt(document.getElementById('cfg-min').value)||0)*60 + (parseInt(document.getElementById('cfg-seg').value)||0);
    configPelea.tiempoDescanso = (parseInt(document.getElementById('cfg-desc-min').value)||0)*60 + (parseInt(document.getElementById('cfg-desc-seg').value)||0);
    configPelea.tiempoMedico = (parseInt(document.getElementById('cfg-med-min').value)||0)*60 + (parseInt(document.getElementById('cfg-med-seg').value)||0);
    configPelea.sistema = document.getElementById('cfg-sistema').value;
    
    // Configuración Corregida a 2 Mandos Máximo
    let configMandos = document.getElementById('cfg-jueces').value.split('_');
    configPelea.mandosActivos = parseInt(configMandos[0]);
    configPelea.coincidenciasRequeridas = parseInt(configMandos[1]);

    configPelea.gamjeomLimiteActivo = document.getElementById('cfg-gj-act').checked;
    configPelea.gamjeomMax = parseInt(document.getElementById('cfg-gj-max').value) || 5;
    configPelea.pointGapActivo = document.getElementById('cfg-pg-act').checked;
    configPelea.pointGapPts = parseInt(document.getElementById('cfg-pg-pts').value) || 12;

    // Sincronizar visualización J1 y J2
    for(let i=1; i<=2; i++) {
        let displayMode = (i <= configPelea.mandosActivos) ? 'flex' : 'none';
        ['rojo', 'azul'].forEach(b => {
            if(document.getElementById(`j${i}-${b}-box`)) document.getElementById(`j${i}-${b}-box`).style.display = displayMode;
        });
    }
    canalTransmision.postMessage({ comandoAccion: "SETUP_JUECES", mandosActivos: configPelea.mandosActivos });

    document.getElementById('nombre-display-rojo').innerText = document.getElementById('cfg-nombre-rojo').value;
    document.getElementById('subtexto-display-rojo').innerText = document.getElementById('cfg-subtexto-rojo').value;
    document.getElementById('rank-display-rojo').innerText = document.getElementById('cfg-rank-rojo').value;
    document.getElementById('nombre-display-azul').innerText = document.getElementById('cfg-nombre-azul').value;
    document.getElementById('subtexto-display-azul').innerText = document.getElementById('cfg-subtexto-azul').value;
    document.getElementById('rank-display-azul').innerText = document.getElementById('cfg-rank-azul').value;
    document.getElementById('categoria-display').innerText = document.getElementById('cfg-categoria-combate').value;

    const codeRojo = document.getElementById('cfg-pais-rojo').value.toLowerCase();
    const codeAzul = document.getElementById('cfg-pais-azul').value.toLowerCase();
    if(document.getElementById('img-bandera-rojo')) { document.getElementById('img-bandera-rojo').src = `banderas/${codeRojo}.png`; document.getElementById('img-bandera-rojo').style.display = 'block'; }
    if(document.getElementById('img-bandera-azul')) { document.getElementById('img-bandera-azul').src = `banderas/${codeAzul}.png`; document.getElementById('img-bandera-azul').style.display = 'block'; }

    reiniciarCombateTotal();
    cambiarPagina('pagina-combate');
};

window.cerrarCombate = function() { if(corriendo) controlarTiempo(); cambiarPagina('pagina-setup'); };

let pantallaActiva = 'pagina-menu';
let configPelea = { tiempoRound: 90, tiempoDescanso: 60, tiempoMedico: 60, sistema: 'best3', mandosActivos: 1, coincidenciasRequeridas: 1, gamjeomLimiteActivo: true, gamjeomMax: 5, pointGapActivo: true, pointGapPts: 12 };
let colaDeVotos = []; 
let fase = 'pelea'; let roundActual = 1; let tiempoRestante = 90; let corriendo = false; let intervalo; let ganadorDelCombate = null; let tiempoPeleaGuardado = 0; 
let combate = { 
    rojo: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 }, 
    azul: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 } 
};

function actualizarPantallaCombate(bandoQueGolpeo = null, tipoGolpe = null) {
    document.getElementById('pts-rojo').innerText = combate.rojo.puntos; document.getElementById('flt-rojo').innerText = combate.rojo.gamjeoms;
    document.getElementById('pts-azul').innerText = combate.azul.puntos; document.getElementById('flt-azul').innerText = combate.azul.gamjeoms;
    document.getElementById('round-actual').innerText = roundActual;
    let m = Math.floor(tiempoRestante / 60); let s = tiempoRestante % 60;
    document.getElementById('cronometro').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    let peligroRojo = configPelea.gamjeomLimiteActivo && combate.rojo.gamjeoms >= (configPelea.gamjeomMax - 1);
    let peligroAzul = configPelea.gamjeomLimiteActivo && combate.azul.gamjeoms >= (configPelea.gamjeomMax - 1);
    document.getElementById('gamjeom-rojo-box').classList.toggle('peligro', peligroRojo);
    document.getElementById('gamjeom-azul-box').classList.toggle('peligro', peligroAzul);

    document.getElementById('round-rojo-1').classList.toggle('activo', combate.rojo.roundsGanados >= 1); document.getElementById('round-rojo-2').classList.toggle('activo', combate.rojo.roundsGanados >= 2);
    document.getElementById('round-azul-1').classList.toggle('activo', combate.azul.roundsGanados >= 1); document.getElementById('round-azul-2').classList.toggle('activo', combate.azul.roundsGanados >= 2);

    canalTransmision.postMessage({
        nombreRojo: document.getElementById('cfg-nombre-rojo').value, subtextoRojo: document.getElementById('cfg-subtexto-rojo').value, rankRojo: document.getElementById('cfg-rank-rojo').value,
        nombreAzul: document.getElementById('cfg-nombre-azul').value, subtextoAzul: document.getElementById('cfg-subtexto-azul').value, rankAzul: document.getElementById('cfg-rank-azul').value,
        categoriaCombate: document.getElementById('cfg-categoria-combate').value,
        srcBanderaRojo: document.getElementById('img-bandera-rojo')?.src || '', srcBanderaAzul: document.getElementById('img-bandera-azul')?.src || '',
        ptsRojo: combate.rojo.puntos, fltRojo: combate.rojo.gamjeoms, ptsAzul: combate.azul.puntos, fltAzul: combate.azul.gamjeoms,
        roundActual: roundActual, cronometro: document.getElementById('cronometro').innerText, lblFase: document.getElementById('lbl-fase').innerText,
        peligroRojo: peligroRojo, peligroAzul: peligroAzul,
        roundRojo1: combate.rojo.roundsGanados >= 1, roundRojo2: combate.rojo.roundsGanados >= 2,
        roundAzul1: combate.azul.roundsGanados >= 1, roundAzul2: combate.azul.roundsGanados >= 2,
        hitBando: bandoQueGolpeo, hitTipo: tipoGolpe
    });
}

// ================= LÓGICA COINCIDENCIA TRADICIONAL (HASTA 2 MANDOS) =================
window.procesarIntencionVotoDirecto = function(bando, cantidad, tipo, idJuez = 0) {
    if (ganadorDelCombate || fase !== 'pelea') return; 
    
    // CORRECCIÓN PANEL: Convierte índice 0 y 1 en juez 1 y juez 2 sin importar qué mando lea el navegador
    let realJuezIndex = (idJuez % 2 === 0) ? 0 : 1;
    iluminarVotoJuezLateral(realJuezIndex, bando, cantidad);
    
    if (configPelea.coincidenciasRequeridas === 1) { 
        cambiarPuntosDirecto(bando, cantidad, tipo); 
        return; 
    }
    
    let ahora = Date.now(); 
    colaDeVotos.push({ bando, cantidad, tipo, idJuez: realJuezIndex, timestamp: ahora });
    colaDeVotos = colaDeVotos.filter(v => (ahora - v.timestamp) <= 2000);
    
    let votosSimilares = colaDeVotos.filter(v => v.bando === bando && v.cantidad === cantidad && v.tipo === tipo);
    let juecesInvolucrados = [...new Set(votosSimilares.map(v => v.idJuez))];
    
    if (juecesInvolucrados.length >= configPelea.coincidenciasRequeridas) { 
        cambiarPuntosDirecto(bando, cantidad, tipo); 
        consolidarDestelloVerdeJueces(bando, juecesInvolucrados);
        colaDeVotos = colaDeVotos.filter(v => !(v.bando === bando && v.tipo === tipo)); 
    }
};

function iluminarVotoJuezLateral(idJuez, bando, cantidad) {
    let numJuezVis = 'j' + (idJuez + 1);
    let targetBox = document.getElementById(`${numJuezVis}-${bando}-box`);
    let targetVal = document.getElementById(`${numJuezVis}-${bando}-val`);
    if(targetBox && targetVal) {
        targetVal.innerText = (cantidad > 0) ? `+${cantidad}` : `${cantidad}`;
        targetBox.classList.add('parpadeo-voto');
        setTimeout(() => { targetBox.classList.remove('parpadeo-voto'); if(!targetBox.classList.contains('activo')) targetVal.innerText = "--"; }, 900);
    }
    canalTransmision.postMessage({ comandoAccion: "VOTO_JUEZ", juez: numJuezVis, bando: bando, cantidad: cantidad });
}

function consolidarDestelloVerdeJueces(bando, juecesArray) {
    juecesArray.forEach(idJuez => {
        let j = 'j' + (idJuez + 1);
        let box = document.getElementById(`${j}-${bando}-box`);
        if(box) { box.classList.add('activo'); setTimeout(() => box.classList.remove('activo'), 1000); }
        canalTransmision.postMessage({ comandoAccion: "VOTO_VALIDO", juez: j, bando: bando });
    });
}

function chequearPointGap() {
    if (configPelea.pointGapActivo && fase === 'pelea') {
        let diff = Math.abs(combate.rojo.puntos - combate.azul.puntos);
        if (diff >= configPelea.pointGapPts) {
            let ganadorRnd = combate.rojo.puntos > combate.azul.puntos ? 'rojo' : 'azul';
            detenerCronometroFuerza();
            procesarFinRound(ganadorRnd, `Diferencia de Puntos alcanzada (${configPelea.pointGapPts} pts).`);
        }
    }
}

window.cambiarPuntosDirecto = function(bando, cantidad, tipo) {
    let atleta = combate[bando];
    atleta.puntos = Math.max(0, atleta.puntos + cantidad);

    if (cantidad > 0) {
        if (tipo === 'punio') atleta.punio++; else if (tipo === 'peto') atleta.peto++; else if (tipo === 'casco') atleta.casco++; else if (tipo === 'petogiro') atleta.petogiro++; else if (tipo === 'cascogiro') atleta.cascogiro++;
        let numDisplay = document.getElementById(`pts-${bando}`);
        if (numDisplay) { numDisplay.classList.add('hit'); setTimeout(() => numDisplay.classList.remove('hit'), 150); }
        actualizarPantallaCombate(bando, tipo);
    } else { 
        if (tipo === 'punio') atleta.punio = Math.max(0, atleta.punio - 1); else if (tipo === 'peto') atleta.peto = Math.max(0, atleta.peto - 1); else if (tipo === 'casco') atleta.casco = Math.max(0, atleta.casco - 1); else if (tipo === 'petogiro') atleta.petogiro = Math.max(0, atleta.petogiro - 1); else if (tipo === 'cascogiro') atleta.cascogiro = Math.max(0, atleta.cascogiro - 1);
        actualizarPantallaCombate(null, null);
    }
    chequearPointGap();
};

window.cambiarFalta = function(bando, cantidad) {
    if (ganadorDelCombate) return;
    let infractor = combate[bando]; let oponenteBando = (bando === 'rojo') ? 'azul' : 'rojo'; let oponente = combate[oponenteBando];
    if (cantidad > 0) { 
        infractor.gamjeoms++; oponente.puntos++; 
        actualizarPantallaCombate();
        if (configPelea.gamjeomLimiteActivo && infractor.gamjeoms >= configPelea.gamjeomMax) {
            detenerCronometroFuerza(); procesarFinRound(oponenteBando, `Descalificación por límite de Gam-Jeom.`); return;
        }
        chequearPointGap(); 
    } else { if (infractor.gamjeoms > 0) { infractor.gamjeoms--; oponente.puntos = Math.max(0, oponente.puntos - 1); actualizarPantallaCombate(); } }
};

window.controlarTiempo = function() {
    if (ganadorDelCombate) return;
    if (fase === 'descanso') return terminarDescanso();
    if (fase === 'kyeshi') return terminarKyeShi();
    const btn = document.getElementById('btn-iniciar');
    if (corriendo) { clearInterval(intervalo); corriendo = false; btn.innerText = "▶ START"; btn.style.background = "#1b5e20"; } 
    else {
        corriendo = true; btn.innerText = "❚❚ PAUSE"; btn.style.background = "#b71c1c";
        intervalo = setInterval(() => {
            if (tiempoRestante > 0) { tiempoRestante--; actualizarPantallaCombate(); } 
            else { detenerCronometroFuerza(); evaluarGanadorPorTiempoYReglas(); }
        }, 1000);
    }
};

window.detenerCronometroFuerza = function() { clearInterval(intervalo); corriendo = false; document.getElementById('btn-iniciar').innerText = "▶ START"; document.getElementById('btn-iniciar').style.background = "#1b5e20"; };
window.modificarTiempo = function(s) { tiempoRestante = Math.max(0, tiempoRestante + s); actualizarPantallaCombate(); };

window.iniciarKyeShi = function() {
    if (ganadorDelCombate || fase !== 'pelea') return;
    if (corriendo) controlarTiempo(); 
    tiempoPeleaGuardado = tiempoRestante; fase = 'kyeshi'; tiempoRestante = configPelea.tiempoMedico;
    document.getElementById('lbl-fase').innerText = "KYE-SHI"; actualizarPantallaCombate(); corriendo = true;
    intervalo = setInterval(() => { if (tiempoRestante > 0) { tiempoRestante--; actualizarPantallaCombate(); } else { terminarKyeShi(); } }, 1000);
};
function terminarKyeShi() { clearInterval(intervalo); corriendo = false; fase = 'pelea'; tiempoRestante = tiempoPeleaGuardado; document.getElementById('lbl-fase').innerText = "ROUND"; actualizarPantallaCombate(); }

function evaluarGanadorPorTiempoYReglas() {
    let r = combate.rojo; let a = combate.azul;
    let ptsGiroR = (r.petogiro * 4) + (r.cascogiro * 6); let ptsGiroA = (a.petogiro * 4) + (a.cascogiro * 6);
    let ptsCascoR = r.casco * 3; let ptsCascoA = a.casco * 3;
    let ptsPetoR = r.peto * 2; let ptsPetoA = a.peto * 2;

    if (r.puntos !== a.puntos) return procesarFinRound((r.puntos > a.puntos) ? 'rojo' : 'azul', "Mayor cantidad de puntos netos.");
    if (ptsGiroR !== ptsGiroA) return procesarFinRound((ptsGiroR > ptsGiroA) ? 'rojo' : 'azul', "Superioridad: Más Puntos por Giros.");
    if (ptsCascoR !== ptsCascoA) return procesarFinRound((ptsCascoR > ptsCascoA) ? 'rojo' : 'azul', "Superioridad: Más Puntos a la Cabeza.");
    if (ptsPetoR !== ptsPetoA) return procesarFinRound((ptsPetoR > ptsPetoA) ? 'rojo' : 'azul', "Superioridad: Más Puntos al Peto.");
    abrirModalVotoManualSuperioridad();
}

function procesarFinRound(ganador, motivoCriterio) {
    combate[ganador].roundsGanados++; actualizarPantallaCombate();
    if (configPelea.sistema === 'best3') {
        if (combate.rojo.roundsGanados >= 2) { ganadorDelCombate = 'rojo'; mostrarModalFinal("COMBATE FINALIZADO", "GANADOR: HONG (ROJO)", "Ganó 2 rounds.", "SALIR AL MENÚ"); } 
        else if (combate.azul.roundsGanados >= 2) { ganadorDelCombate = 'azul'; mostrarModalFinal("COMBATE FINALIZADO", "GANADOR: CHONG (AZUL)", "Ganó 2 rounds.", "SALIR AL MENÚ"); } 
        else { mostrarModalFinal(`ROUND ${roundActual} TERMINADO`, `GANADOR ROUND: ${ganador.toUpperCase()}`, motivoCriterio, "INICIAR DESCANSO"); }
    } else {
        if (roundActual >= 3) { ganadorDelCombate = ganador; mostrarModalFinal("COMBATE FINALIZADO", `GANADOR: ${ganador.toUpperCase()}`, "Puntaje acumulativo final.", "SALIR AL MENÚ"); } 
        else { mostrarModalFinal(`ROUND ${roundActual} TERMINADO`, `ROUND FINALIZADO`, "Se mantiene puntaje.", "INICIAR DESCANSO"); }
    }
}

function mostrarModalFinal(titulo, ganadorText, criterioText, textoBoton) { 
    document.getElementById('modal-r-titulo').innerText = titulo; document.getElementById('modal-r-ganador').innerText = ganadorText; document.getElementById('modal-r-criterio').innerText = "Criterio: " + criterioText; document.getElementById('btn-modal-accion').innerText = textoBoton; 
    
    document.getElementById('st-pt-r').innerText = combate.rojo.puntos; document.getElementById('st-pt-a').innerText = combate.azul.puntos;
    document.getElementById('st-pu-r').innerText = combate.rojo.punio; document.getElementById('st-pu-a').innerText = combate.azul.punio;
    document.getElementById('st-pe-r').innerText = combate.rojo.peto; document.getElementById('st-pe-a').innerText = combate.azul.peto;
    document.getElementById('st-ca-r').innerText = combate.rojo.casco; document.getElementById('st-ca-a').innerText = combate.azul.casco;
    document.getElementById('st-peg-r').innerText = combate.rojo.petogiro; document.getElementById('st-peg-a').innerText = combate.azul.petogiro;
    document.getElementById('st-cag-r').innerText = combate.rojo.cascogiro; document.getElementById('st-cag-a').innerText = combate.azul.cascogiro;
    document.getElementById('st-gj-r').innerText = combate.azul.gamjeoms; document.getElementById('st-gj-a').innerText = combate.rojo.gamjeoms; 
    
    document.getElementById('contenedor-estadisticas').style.display = "flex"; document.getElementById('modal-round').classList.add('activo'); 
    
    canalTransmision.postMessage({
        comandoAccion: "MOSTRAR_ESTADISTICAS_PUBLICO", tituloRound: titulo, ganadorRoundTexto: ganadorText, criterioRoundTexto: "Criterio: " + criterioText,
        stats: {
            ptR: combate.rojo.puntos, ptA: combate.azul.puntos, puR: combate.rojo.punio, puA: combate.azul.punio, peR: combate.rojo.peto, peA: combate.azul.peto,
            caR: combate.rojo.casco, caA: combate.azul.casco, pegR: combate.rojo.petogiro, pegA: combate.azul.petogiro, cagR: combate.rojo.cascogiro, cagA: combate.azul.cascogiro,
            gjR: combate.azul.gamjeoms, gjA: combate.rojo.gamjeoms
        }
    });
}

window.avanzarSiguientePaso = function() {
    canalTransmision.postMessage({ comandoAccion: "OCULTAR_ESTADISTICAS_PUBLICO" });
    document.getElementById('modal-round').classList.remove('activo');
    if (ganadorDelCombate) { cerrarCombate(); } else {
        roundActual++;
        if(configPelea.sistema === 'best3'){
            combate.rojo = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: combate.rojo.roundsGanados };
            combate.azul = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: combate.azul.roundsGanados };
        }
        fase = 'descanso'; tiempoRestante = configPelea.tiempoDescanso; document.getElementById('lbl-fase').innerText = "DESCANSO";
        actualizarPantallaCombate(); corriendo = true;
        intervalo = setInterval(() => { if (tiempoRestante > 0) { tiempoRestante--; actualizarPantallaCombate(); } else { terminarDescanso(); } }, 1000);
    }
};

function terminarDescanso() { clearInterval(intervalo); corriendo = false; fase = 'pelea'; tiempoRestante = configPelea.tiempoRound; document.getElementById('lbl-fase').innerText = "ROUND"; actualizarPantallaCombate(); }
function abrirModalVotoManualSuperioridad() { document.getElementById('modal-r-titulo').innerText = "ROUND EMPATADO"; document.getElementById('contenedor-estadisticas').style.display = "none"; document.getElementById('contenedor-voto-manual').style.display = "block"; document.getElementById('btn-modal-accion').style.display = "none"; document.getElementById('modal-round').classList.add('activo'); }
window.asignarGanadorManual = function(bando) { document.getElementById('contenedor-voto-manual').style.display = "none"; document.getElementById('contenedor-estadisticas').style.display = "flex"; document.getElementById('btn-modal-accion').style.display = "inline-block"; procesarFinRound(bando, "Decisión unánime arbitral."); };
window.abrirModalAdmin = function() { if(corriendo) controlarTiempo(); document.getElementById('modal-admin').classList.add('activo'); };
window.cerrarModalAdmin = function() { document.getElementById('modal-admin').classList.remove('activo'); };

function reiniciarCombateTotal() {
    detenerCronometroFuerza(); roundActual = 1; fase = 'pelea'; tiempoRestante = configPelea.tiempoRound; ganadorDelCombate = null;
    combate.rojo = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 };
    combate.azul = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 };
    document.getElementById('modal-round').classList.remove('activo'); document.getElementById('contenedor-voto-manual').style.display = "none";
    document.getElementById('lbl-fase').innerText = "ROUND"; actualizarPantallaCombate();
}

let mandosConectados = {}; let estadoAnteriorMandos = {};
window.addEventListener("gamepadconnected", (e) => { mandosConectados[e.gamepad.index] = true; actualizarStatusMandos(); });
window.addEventListener("gamepaddisconnected", (e) => { delete mandosConectados[e.gamepad.index]; actualizarStatusMandos(); });

function actualizarStatusMandos() { 
    const statusDiv = document.getElementById('gamepad-status'); const cantidad = Object.keys(mandosConectados).length; 
    if(statusDiv) { if(cantidad > 0) { statusDiv.innerText = `🎮 ${cantidad} Mando(s) OK`; statusDiv.className = 'con-mando'; } else { statusDiv.innerText = `🎮 Esperando mandos...`; statusDiv.className = 'sin-mando'; } } 
    canalTransmision.postMessage({ comandoAccion: "STATUS_MANDOS", cantidad: cantidad });
}

function loopLecturaMandos() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < 2; i++) {
        const gp = gamepads[i]; const slot = document.getElementById(`ps-slot-${i}`); const statusText = document.getElementById(`ps-status-${i}`);
        if (!gp) { if (slot && statusText) { slot.classList.remove('conectado'); statusText.innerText = "Sin conexión"; } continue; }
        if (slot && statusText) { slot.classList.add('conectado'); statusText.innerText = "Conectado"; }
        
        let btn_x = gp.buttons[0]?.pressed || false; let btn_cir = gp.buttons[1]?.pressed || false; let btn_sq = gp.buttons[2]?.pressed || false; let btn_tri = gp.buttons[3]?.pressed || false;     
        let btn_l1 = gp.buttons[4]?.pressed || false; let btn_r1 = gp.buttons[5]?.pressed || false; let btn_l2 = gp.buttons[6]?.pressed || false; let btn_r2 = gp.buttons[7]?.pressed || false;      
        let btn_up = gp.buttons[12]?.pressed || false; let btn_down = gp.buttons[13]?.pressed || false; let btn_left = gp.buttons[14]?.pressed || false; let btn_right = gp.buttons[15]?.pressed || false;  
        let stick_l = Math.abs(gp.axes[0]) > 0.5 || Math.abs(gp.axes[1]) > 0.5; let stick_r = Math.abs(gp.axes[2]) > 0.5 || Math.abs(gp.axes[3]) > 0.5;

        if (pantallaActiva === 'pagina-test') {
            document.getElementById(`btn-${i}-left`)?.classList.toggle('prendido', btn_left); document.getElementById(`btn-${i}-up`)?.classList.toggle('prendido', btn_up);
            document.getElementById(`btn-${i}-down`)?.classList.toggle('prendido', btn_down); document.getElementById(`btn-${i}-right`)?.classList.toggle('prendido', btn_right);
            document.getElementById(`btn-${i}-l1`)?.classList.toggle('prendido', btn_l1); document.getElementById(`btn-${i}-l2`)?.classList.toggle('prendido', btn_l2);
            document.getElementById(`btn-${i}-cr`)?.classList.toggle('prendido', btn_x); document.getElementById(`btn-${i}-sq`)?.classList.toggle('prendido', btn_sq);
            document.getElementById(`btn-${i}-ci`)?.classList.toggle('prendido', btn_cir); document.getElementById(`btn-${i}-tr`)?.classList.toggle('prendido', btn_tri);
            document.getElementById(`btn-${i}-r1`)?.classList.toggle('prendido', btn_r1); document.getElementById(`btn-${i}-r2`)?.classList.toggle('prendido', btn_r2);
            document.getElementById(`stick-l-${i}`)?.classList.toggle('prendido', stick_l); document.getElementById(`stick-r-${i}`)?.classList.toggle('prendido', stick_r);
        }

        if (pantallaActiva === 'pagina-combate' && !document.getElementById('modal-admin').classList.contains('activo') && !document.getElementById('modal-round').classList.contains('activo')) {
            if (!estadoAnteriorMandos[i]) estadoAnteriorMandos[i] = {};
            let idJuez = i; let restar = btn_l2; 
            if (btn_down && !estadoAnteriorMandos[i].btn_down) procesarIntencionVotoDirecto('rojo', restar ? -1 : 1, 'punio', idJuez);
            if (btn_right && !estadoAnteriorMandos[i].btn_right) procesarIntencionVotoDirecto('rojo', restar ? -2 : 2, 'peto', idJuez);
            if (btn_up && !estadoAnteriorMandos[i].btn_up) procesarIntencionVotoDirecto('rojo', restar ? -3 : 3, 'casco', idJuez);
            if (btn_left && !estadoAnteriorMandos[i].btn_left) procesarIntencionVotoDirecto('rojo', restar ? -4 : 4, 'petogiro', idJuez);
            if (btn_l1 && !estadoAnteriorMandos[i].btn_l1) procesarIntencionVotoDirecto('rojo', restar ? -6 : 6, 'cascogiro', idJuez);

            if (btn_x && !estadoAnteriorMandos[i].btn_x) procesarIntencionVotoDirecto('azul', restar ? -1 : 1, 'punio', idJuez);
            if (btn_sq && !estadoAnteriorMandos[i].btn_sq) procesarIntencionVotoDirecto('azul', restar ? -2 : 2, 'peto', idJuez);
            if (btn_tri && !estadoAnteriorMandos[i].btn_tri) procesarIntencionVotoDirecto('azul', restar ? -3 : 3, 'casco', idJuez);
            if (btn_cir && !estadoAnteriorMandos[i].btn_cir) procesarIntencionVotoDirecto('azul', restar ? -4 : 4, 'petogiro', idJuez);
            if (btn_r1 && !estadoAnteriorMandos[i].btn_r1) procesarIntencionVotoDirecto('azul', restar ? -6 : 6, 'cascogiro', idJuez);
        }
        estadoAnteriorMandos[i] = { btn_x, btn_cir, btn_sq, btn_tri, btn_l1, btn_r1, btn_l2, btn_up, btn_down, btn_left, btn_right };
    }
    requestAnimationFrame(loopLecturaMandos);
}
requestAnimationFrame(loopLecturaMandos);

window.addEventListener('keydown', function(e) {
    if (pantallaActiva === 'pagina-combate' && !document.getElementById('modal-admin').classList.contains('activo') && !document.getElementById('modal-round').classList.contains('activo')) {
        if (e.key === 'ArrowUp') { e.preventDefault(); modificarTiempo(1); } 
        else if (e.key === 'ArrowDown') { e.preventDefault(); modificarTiempo(-1); }
    }
});

// ================= MÓDULO DE GESTIÓN DE TORNEOS (VERSIÓN ESPORTS) =================
const atletasPredefinidos = [
    { nombre: "LAUTARO DÍAZ", club: "BUENOS AIRES ACADEMY", cinturon: "Negro", peso: "MASCULINO -68 KG" },
    { nombre: "MATÍAS GÓMEZ", club: "ROSARIO TKD", cinturon: "Negro", peso: "MASCULINO -68 KG" },
    { nombre: "EMILIANO SILVA", club: "MENDOZA FIGHT", cinturon: "Negro", peso: "MASCULINO -68 KG" },
    { nombre: "GONZALO CARRIZO", club: "CÓRDOBA EQUIPO", cinturon: "Negro", peso: "MASCULINO -68 KG" }
];

let poolCompetidores = JSON.parse(localStorage.getItem('smtkd_competidores')) || atletasPredefinidos;

window.guardarAtletaNuevo = function() {
    const inputNombre = document.getElementById('torn-nombre'); const inputClub = document.getElementById('torn-club');
    let nom = inputNombre.value.trim().toUpperCase(); let clb = inputClub.value.trim().toUpperCase();
    let cin = document.getElementById('torn-cinturon').value; let pes = document.getElementById('torn-peso').value;

    if(!nom || !clb) { alert("Por favor complete Nombre y Club."); return; }
    if(poolCompetidores.find(a => a.nombre === nom)) { alert("El atleta ya existe."); return; }

    poolCompetidores.push({ nombre: nom, club: clb, cinturon: cin, peso: pes });
    localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));

    inputNombre.value = ""; inputClub.value = "";
    alert(`Atleta registrado.`);
    
    document.getElementById('filtro-cinturon').value = cin;
    document.getElementById('filtro-peso').value = pes;
    renderizarLlaveAutomatica();
};

window.renderizarLlaveAutomatica = function() {
    let cFiltro = document.getElementById('filtro-cinturon').value;
    let pFiltro = document.getElementById('filtro-peso').value;
    let contenedor = document.getElementById('bracket-render-box');
    
    if(!contenedor) return;
    contenedor.innerHTML = "";

    let filtrados = poolCompetidores.filter(a => a.cinturon === cFiltro && a.peso === pFiltro);
    document.getElementById('total-inscriptos-lbl').innerText = `Atletas en esta categoría: ${filtrados.length}`;

    if(filtrados.length < 2) {
        contenedor.innerHTML = "<div style='color:#666; font-style:italic; padding: 20px; text-align: center; font-family: Orbitron;'><i class='fa-solid fa-triangle-exclamation'></i> MÍNIMO 2 COMPETIDORES REQUERIDOS PARA ARMAR LLAVE</div>";
        return;
    }

    let a1 = filtrados[0] || { nombre: "- VACANTE - BYE -", club: "--" };
    let a2 = filtrados[1] || { nombre: "- VACANTE - BYE -", club: "--" };
    let a3 = filtrados[2] || { nombre: "- VACANTE - BYE -", club: "--" };
    let a4 = filtrados[3] || { nombre: "- VACANTE - BYE -", club: "--" };

    let c1 = a1.nombre.includes("VACANTE") ? "atleta-vacante" : "";
    let c2 = a2.nombre.includes("VACANTE") ? "atleta-vacante" : "";
    let c3 = a3.nombre.includes("VACANTE") ? "atleta-vacante" : "";
    let c4 = a4.nombre.includes("VACANTE") ? "atleta-vacante" : "";

    let htmlBracket = `
    <div class="bracket-esports-layout">
        <div class="bracket-columna">
            <div class="bracket-titulo-ronda">SEMIFINALES</div>
            
            <div class="nodo-match nodo-semifinal nodo-semifinal-top">
                <div class="cruce-match-box">
                    <div class="fila-atleta-llave b-rojo ${c1}">
                        <div><span class="nombre-llave">${a1.nombre}</span><span class="club-atleta-llave">${a1.club}</span></div>
                    </div>
                    <div class="fila-atleta-llave b-azul ${c2}">
                        <div><span class="nombre-llave">${a2.nombre}</span><span class="club-atleta-llave">${a2.club}</span></div>
                    </div>
                    <button class="btn-lanzar-match" onclick="cargarPeleaDesdeLlave('${a1.nombre}','${a1.club}','${a2.nombre}','${a2.club}','${pFiltro}')">⚡ FIGHT: MATCH 1</button>
                </div>
            </div>`;

    if(filtrados.length >= 3) {
        htmlBracket += `
            <div class="nodo-match nodo-semifinal nodo-semifinal-bottom">
                <div class="cruce-match-box">
                    <div class="fila-atleta-llave b-rojo ${c3}">
                        <div><span class="nombre-llave">${a3.nombre}</span><span class="club-atleta-llave">${a3.club}</span></div>
                    </div>
                    <div class="fila-atleta-llave b-azul ${c4}">
                        <div><span class="nombre-llave">${a4.nombre}</span><span class="club-atleta-llave">${a4.club}</span></div>
                    </div>
                    <button class="btn-lanzar-match" onclick="cargarPeleaDesdeLlave('${a3.nombre}','${a3.club}','${a4.nombre}','${a4.club}','${pFiltro}')">⚡ FIGHT: MATCH 2</button>
                </div>
            </div>`;
    }

    htmlBracket += `
        </div>
        <div class="bracket-columna">
            <div class="bracket-titulo-ronda" style="color: #fff; text-shadow: 0 0 15px #fff;">GRAN FINAL</div>
            
            <div class="nodo-match nodo-final">
                <div class="cruce-match-box" style="border-color: #ffd600; box-shadow: 0 10px 40px rgba(255,214,0,0.15);">
                    <div class="fila-atleta-llave b-rojo atleta-vacante">
                        <div><span class="nombre-llave">GANADOR MATCH 1</span><span class="club-atleta-llave">Por clasificar</span></div>
                    </div>
                    <div class="fila-atleta-llave b-azul atleta-vacante">
                        <div><span class="nombre-llave">GANADOR MATCH 2</span><span class="club-atleta-llave">Por clasificar</span></div>
                    </div>
                    <button class="btn-lanzar-match" style="background:#222; color:#777; cursor:not-allowed;" disabled>ESPERANDO RESULTADOS...</button>
                </div>
            </div>
        </div>
    </div>`;

    contenedor.innerHTML = htmlBracket;
};

window.cargarPeleaDesdeLlave = function(nomRojo, clubRojo, nomAzul, clubAzul, categoria) {
    if(nomRojo.includes("- VACANTE - BYE -") || nomAzul.includes("- VACANTE - BYE -")) { alert("No se puede iniciar un combate contra un BYE."); return; }
    document.getElementById('cfg-nombre-rojo').value = nomRojo; document.getElementById('cfg-subtexto-rojo').value = clubRojo; document.getElementById('cfg-rank-rojo').value = "CLASIFICADO";
    document.getElementById('cfg-nombre-azul').value = nomAzul; document.getElementById('cfg-subtexto-azul').value = clubAzul; document.getElementById('cfg-rank-azul').value = "CLASIFICADO";
    document.getElementById('cfg-categoria-combate').value = categoria;
    iniciarCombate();
};

// ================= SINCRONIZACIÓN OFFLINE MULTI-TATAMI =================
window.exportarBaseAtletas = function() {
    if (poolCompetidores.length === 0) { alert("Base vacía. Registre atletas antes de exportar."); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(poolCompetidores));
    const downloadAnchor = document.createElement('a'); downloadAnchor.setAttribute("href", dataStr); downloadAnchor.setAttribute("download", "SMTKD_Base_Atletas.json");
    document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
};

window.importarBaseAtletas = function(event) {
    const archivo = event.target.files[0]; if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const atletasImportados = JSON.parse(e.target.result);
            if (Array.isArray(atletasImportados)) {
                poolCompetidores = atletasImportados; localStorage.setItem('smtkd_competidores', JSON.stringify(poolCompetidores));
                alert(`¡Éxito! Importados ${atletasImportados.length} competidores.`); renderizarLlaveAutomatica();
            }
        } catch (err) { alert("Error al importar el archivo."); }
    };
    lector.readAsText(archivo);
};

// Forzar render inicial
setTimeout(() => { if(typeof renderizarLlaveAutomatica === 'function') renderizarLlaveAutomatica(); }, 500);