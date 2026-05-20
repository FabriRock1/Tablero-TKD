// =========================================================================
// MOTOR CENTRAL DE COMBATE Y BROADCAST A TV (COMPLETO Y ANIMADO)
// =========================================================================

const canalTransmision = new BroadcastChannel('smtkd_transmision');
let reglas = JSON.parse(sessionStorage.getItem('smtkd_active_match_rules')) || { 
    tiempoRound: 90, tiempoDescanso: 60, tiempoMedico: 60, sistema: 'best3', mandosActivos: 1, 
    coincidenciasRequeridas: 1, gamjeomLimiteActivo: true, gamjeomMax: 5, pointGapActivo: true, pointGapPts: 12 
};

let combate = { 
    rojo: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 }, 
    azul: { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: 0 } 
};

let fase = 'pelea'; 
let roundActual = 1; 
let tiempoRestante = reglas.tiempoRound; 
let corriendo = false; 
let intervalo; 
let ganadorDelCombate = null;
let tiempoPeleaGuardado = 0;
let estadoAnteriorMandos = {};

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('cronometro')) {
        document.getElementById('nombre-display-rojo').innerText = reglas.nombreRojo || "HONG";
        document.getElementById('subtexto-display-rojo').innerText = reglas.clubRojo || "";
        document.getElementById('rank-display-rojo').innerText = reglas.rankRojo || "";
        
        document.getElementById('nombre-display-azul').innerText = reglas.nombreAzul || "CHONG";
        document.getElementById('subtexto-display-azul').innerText = reglas.clubAzul || "";
        document.getElementById('rank-display-azul').innerText = reglas.rankAzul || "";
        
        if(document.getElementById('categoria-display')) {
            document.getElementById('categoria-display').innerText = reglas.categoria || "DIVISIÓN OFICIAL WT";
        }

        // Carga Segura de Banderas (Con fallback a 'none' si no existe)
        let imgRojo = document.getElementById('img-bandera-rojo');
        if (reglas.paisRojo && imgRojo) { 
            imgRojo.src = `banderas/${reglas.paisRojo.toLowerCase()}.png`; 
            imgRojo.style.display = 'block'; 
            imgRojo.onerror = () => { imgRojo.style.display = 'none'; }; 
        }
        
        let imgAzul = document.getElementById('img-bandera-azul');
        if (reglas.paisAzul && imgAzul) { 
            imgAzul.src = `banderas/${reglas.paisAzul.toLowerCase()}.png`; 
            imgAzul.style.display = 'block'; 
            imgAzul.onerror = () => { imgAzul.style.display = 'none'; }; 
        }

        actualizarPantallaCombate();
        
        // Forzamos la actualización a la TV por si se abrió antes
        setTimeout(actualizarPantallaCombate, 500); 
    }
    requestAnimationFrame(loopGamepadsCombate);
});

// --- ACTUALIZACIÓN VISUAL Y TRANSMISIÓN TV ---
function actualizarPantallaCombate(bando = null, tipo = null) {
    let m = Math.floor(tiempoRestante / 60); 
    let s = tiempoRestante % 60;
    let timeStr = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    let lblFase = document.getElementById('lbl-fase')?.innerText || "ROUND";
    
    if(document.getElementById('cronometro')) {
        document.getElementById('pts-rojo').innerText = combate.rojo.puntos; 
        document.getElementById('flt-rojo').innerText = combate.rojo.gamjeoms;
        document.getElementById('pts-azul').innerText = combate.azul.puntos; 
        document.getElementById('flt-azul').innerText = combate.azul.gamjeoms;
        document.getElementById('cronometro').innerText = timeStr; 
        document.getElementById('round-actual').innerText = roundActual;
        
        // Actualizar Leds de Rounds Ganados
        let rR1 = document.getElementById('round-rojo-1'); if(rR1) rR1.classList.toggle('activo', combate.rojo.roundsGanados >= 1);
        let rR2 = document.getElementById('round-rojo-2'); if(rR2) rR2.classList.toggle('activo', combate.rojo.roundsGanados >= 2);
        let rA1 = document.getElementById('round-azul-1'); if(rA1) rA1.classList.toggle('activo', combate.azul.roundsGanados >= 1);
        let rA2 = document.getElementById('round-azul-2'); if(rA2) rA2.classList.toggle('activo', combate.azul.roundsGanados >= 2);
    }

    canalTransmision.postMessage({
        nombreRojo: reglas.nombreRojo, subtextoRojo: reglas.clubRojo, rankRojo: reglas.rankRojo, srcBanderaRojo: reglas.paisRojo ? `banderas/${reglas.paisRojo.toLowerCase()}.png` : '',
        nombreAzul: reglas.nombreAzul, subtextoAzul: reglas.clubAzul, rankAzul: reglas.rankAzul, srcBanderaAzul: reglas.paisAzul ? `banderas/${reglas.paisAzul.toLowerCase()}.png` : '',
        categoriaCombate: reglas.categoria, 
        ptsRojo: combate.rojo.puntos, fltRojo: combate.rojo.gamjeoms, 
        ptsAzul: combate.azul.puntos, fltAzul: combate.azul.gamjeoms,
        roundActual: roundActual, cronometro: timeStr, lblFase: lblFase,
        roundRojo1: combate.rojo.roundsGanados>=1, roundRojo2: combate.rojo.roundsGanados>=2, 
        roundAzul1: combate.azul.roundsGanados>=1, roundAzul2: combate.azul.roundsGanados>=2
    });
}

function chequearPointGap() {
    if (reglas.pointGapActivo && fase === 'pelea') {
        let diff = Math.abs(combate.rojo.puntos - combate.azul.puntos);
        if (diff >= reglas.pointGapPts) {
            let ganadorRnd = combate.rojo.puntos > combate.azul.puntos ? 'rojo' : 'azul';
            detenerCronometroFuerza();
            procesarFinRound(ganadorRnd, `Diferencia de Puntos (${reglas.pointGapPts} pts).`);
        }
    }
}

// --- CONTROLES DE PUNTOS Y FALTAS (CON ANIMACIÓN) ---
window.cambiarPuntosDirecto = function(bando, cantidad, tipo = null) {
    if(ganadorDelCombate || fase !== 'pelea') return;
    let atleta = combate[bando];
    
    if (cantidad > 0) {
        atleta.puntos += cantidad;
        if (tipo === 'punio') atleta.punio++; 
        else if (tipo === 'peto') atleta.peto++; 
        else if (tipo === 'casco') atleta.casco++; 
        else if (tipo === 'petogiro') atleta.petogiro++; 
        else if (tipo === 'cascogiro') atleta.cascogiro++;

        // --- DISPARO DE ANIMACIÓN VISUAL ---
        let numDisplay = document.getElementById(`pts-${bando}`);
        if (numDisplay) {
            // "Truco" para reiniciar la animación si marcan puntos muy rápido
            numDisplay.classList.remove('hit'); 
            void numDisplay.offsetWidth; 
            numDisplay.classList.add('hit');
            
            // Crear el texto flotante (+1, +2, etc)
            let contenedorPadre = numDisplay.parentElement;
            contenedorPadre.style.position = 'relative';
            
            let flotante = document.createElement('div');
            flotante.className = 'texto-flotante';
            flotante.innerText = `+${cantidad}`;
            contenedorPadre.appendChild(flotante);
            
            // Eliminar el texto flotante después de 1 segundo
            setTimeout(() => { flotante.remove(); }, 1000);
        }

    } else {
        atleta.puntos = Math.max(0, atleta.puntos - 1);
        if (tipo === 'punio') atleta.punio = Math.max(0, atleta.punio - 1); 
        else if (tipo === 'peto') atleta.peto = Math.max(0, atleta.peto - 1); 
        else if (tipo === 'casco') atleta.casco = Math.max(0, atleta.casco - 1); 
        else if (tipo === 'petogiro') atleta.petogiro = Math.max(0, atleta.petogiro - 1); 
        else if (tipo === 'cascogiro') atleta.cascogiro = Math.max(0, atleta.cascogiro - 1);
    }
    
    actualizarPantallaCombate(bando, tipo);
    chequearPointGap();
};

window.cambiarFalta = function(bando, cantidad) {
    if(ganadorDelCombate || fase !== 'pelea') return;
    let infractor = combate[bando]; 
    let oponenteBando = (bando === 'rojo') ? 'azul' : 'rojo'; 
    let oponente = combate[oponenteBando];
    
    if(cantidad > 0) {
        infractor.gamjeoms++;
        oponente.puntos++; 
        actualizarPantallaCombate();
        if(reglas.gamjeomLimiteActivo && infractor.gamjeoms >= reglas.gamjeomMax) {
            detenerCronometroFuerza();
            procesarFinRound(oponenteBando, "Descalificación por límite de Gam-Jeom.");
            return;
        }
        chequearPointGap();
    } else {
        if(infractor.gamjeoms > 0) {
            infractor.gamjeoms--;
            oponente.puntos = Math.max(0, oponente.puntos - 1);
            actualizarPantallaCombate();
        }
    }
};

// --- CONTROL DE TIEMPO Y RELOJ ---
window.controlarTiempo = function() {
    if(ganadorDelCombate) return;
    if(fase === 'descanso') return terminarDescanso();
    if(fase === 'kyeshi') return terminarKyeShi();
    
    const btn = document.getElementById('btn-iniciar');
    
    if(corriendo) { 
        clearInterval(intervalo); 
        corriendo = false; 
        if(btn) { btn.innerText = "▶ START / PAUSE"; btn.style.background = "#006600"; }
    } else { 
        corriendo = true; 
        if(btn) { btn.innerText = "❚❚ PAUSE"; btn.style.background = "#990000"; }
        
        clearInterval(intervalo);
        intervalo = setInterval(() => { 
            if(tiempoRestante > 0) { 
                tiempoRestante--; 
                actualizarPantallaCombate(); 
            } else { 
                detenerCronometroFuerza();
                evaluarGanadorPorTiempoYReglas();
            } 
        }, 1000); 
    }
};

window.detenerCronometroFuerza = function() { 
    clearInterval(intervalo); 
    corriendo = false; 
    let btn = document.getElementById('btn-iniciar');
    if(btn) { btn.innerText = "▶ START / PAUSE"; btn.style.background = "#006600"; }
};

window.modificarTiempo = function(s) { 
    tiempoRestante = Math.max(0, tiempoRestante + s); 
    actualizarPantallaCombate(); 
};

window.iniciarKyeShi = function() { 
    if(ganadorDelCombate || fase !== 'pelea') return;
    if(corriendo) controlarTiempo(); 
    tiempoPeleaGuardado = tiempoRestante; 
    fase = 'kyeshi'; 
    tiempoRestante = reglas.tiempoMedico; 
    let lbl = document.getElementById('lbl-fase');
    if(lbl) lbl.innerText = "MEDICO"; 
    controlarTiempo(); 
};

function terminarKyeShi() { 
    clearInterval(intervalo); 
    corriendo = false; 
    fase = 'pelea'; 
    tiempoRestante = tiempoPeleaGuardado; 
    let lbl = document.getElementById('lbl-fase');
    if(lbl) lbl.innerText = "ROUND"; 
    actualizarPantallaCombate(); 
}

function terminarDescanso() { 
    clearInterval(intervalo); 
    corriendo = false; 
    fase = 'pelea'; 
    tiempoRestante = reglas.tiempoRound; 
    let lbl = document.getElementById('lbl-fase');
    if(lbl) lbl.innerText = "ROUND"; 
    actualizarPantallaCombate(); 
}

// --- EVALUACIÓN DE ROUNDS Y FIN DEL COMBATE ---
function evaluarGanadorPorTiempoYReglas() {
    let r = combate.rojo; let a = combate.azul;
    let ptsGiroR = (r.petogiro * 4) + (r.cascogiro * 6); 
    let ptsGiroA = (a.petogiro * 4) + (a.cascogiro * 6);
    let ptsCascoR = r.casco * 3; let ptsCascoA = a.casco * 3;
    let ptsPetoR = r.peto * 2; let ptsPetoA = a.peto * 2;

    if (r.puntos !== a.puntos) return procesarFinRound((r.puntos > a.puntos) ? 'rojo' : 'azul', "Mayor cantidad de puntos.");
    if (ptsGiroR !== ptsGiroA) return procesarFinRound((ptsGiroR > ptsGiroA) ? 'rojo' : 'azul', "Superioridad: Puntos por Giros.");
    if (ptsCascoR !== ptsCascoA) return procesarFinRound((ptsCascoR > ptsCascoA) ? 'rojo' : 'azul', "Superioridad: Puntos a la Cabeza.");
    if (ptsPetoR !== ptsPetoA) return procesarFinRound((ptsPetoR > ptsPetoA) ? 'rojo' : 'azul', "Superioridad: Puntos al Peto.");
    
    // Si sigue empatado, forzar voto de superioridad manual
    alert("¡ROUND EMPATADO! Asignar ganador por superioridad manualmente.");
}

function procesarFinRound(ganador, motivoCriterio) {
    combate[ganador].roundsGanados++; 
    actualizarPantallaCombate();
    
    if (reglas.sistema === 'best3') {
        if (combate.rojo.roundsGanados >= 2) { 
            ganadorDelCombate = 'rojo'; 
            alert(`¡HONG GANA EL COMBATE!\nCriterio: ${motivoCriterio}`);
        } 
        else if (combate.azul.roundsGanados >= 2) { 
            ganadorDelCombate = 'azul'; 
            alert(`¡CHONG GANA EL COMBATE!\nCriterio: ${motivoCriterio}`); 
        } 
        else { 
            alert(`ROUND ${roundActual} PARA ${ganador.toUpperCase()}\nCriterio: ${motivoCriterio}`);
            prepararSiguienteRound();
        }
    } else {
        if (roundActual >= 3) { 
            ganadorDelCombate = ganador; 
            alert(`¡COMBATE FINALIZADO!\nGANADOR: ${ganador.toUpperCase()}`); 
        } 
        else { 
            alert(`ROUND ${roundActual} FINALIZADO`);
            prepararSiguienteRound();
        }
    }
}

function prepararSiguienteRound() {
    roundActual++;
    if(reglas.sistema === 'best3'){
        // Resetear puntajes, mantener rounds ganados
        combate.rojo = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: combate.rojo.roundsGanados };
        combate.azul = { puntos: 0, gamjeoms: 0, casco: 0, peto: 0, punio: 0, petogiro: 0, cascogiro: 0, roundsGanados: combate.azul.roundsGanados };
    }
    fase = 'descanso'; 
    tiempoRestante = reglas.tiempoDescanso; 
    let lbl = document.getElementById('lbl-fase');
    if(lbl) lbl.innerText = "DESCANSO";
    actualizarPantallaCombate(); 
    corriendo = true;
    intervalo = setInterval(() => { 
        if (tiempoRestante > 0) { 
            tiempoRestante--; 
            actualizarPantallaCombate(); 
        } else { 
            terminarDescanso(); 
        } 
    }, 1000);
}

// --- LECTURA DE JOYSTICKS (CÓDIGO BLINDADO CONTRA MULTI-CLICK) ---
function loopGamepadsCombate() {
    if(document.getElementById('cronometro')) {
        const gps = navigator.getGamepads();
        for(let i=0; i<2; i++) {
            let gp = gps[i]; if(!gp) continue;
            
            // Inicializar estado anterior si no existe para evitar errores
            if(!estadoAnteriorMandos[i]) estadoAnteriorMandos[i] = {};
            
            let res = gp.buttons[6]?.pressed || false; // L2 apretado = Restar
            let val = res ? -1 : 1; // Multiplicador

            // ROJO (Flechas y L1)
            if(gp.buttons[13]?.pressed && !estadoAnteriorMandos[i].btn_down)  cambiarPuntosDirecto('rojo', 1 * val, 'punio');
            if(gp.buttons[15]?.pressed && !estadoAnteriorMandos[i].btn_right) cambiarPuntosDirecto('rojo', 2 * val, 'peto');
            if(gp.buttons[12]?.pressed && !estadoAnteriorMandos[i].btn_up)    cambiarPuntosDirecto('rojo', 3 * val, 'casco');
            if(gp.buttons[14]?.pressed && !estadoAnteriorMandos[i].btn_left)  cambiarPuntosDirecto('rojo', 4 * val, 'petogiro');
            if(gp.buttons[4]?.pressed && !estadoAnteriorMandos[i].btn_l1)     cambiarPuntosDirecto('rojo', 6 * val, 'cascogiro');

            // AZUL (Acción y R1)
            if(gp.buttons[0]?.pressed && !estadoAnteriorMandos[i].btn_x)     cambiarPuntosDirecto('azul', 1 * val, 'punio');
            if(gp.buttons[2]?.pressed && !estadoAnteriorMandos[i].btn_sq)    cambiarPuntosDirecto('azul', 2 * val, 'peto');
            if(gp.buttons[3]?.pressed && !estadoAnteriorMandos[i].btn_tr)    cambiarPuntosDirecto('azul', 3 * val, 'casco');
            if(gp.buttons[1]?.pressed && !estadoAnteriorMandos[i].btn_ci)    cambiarPuntosDirecto('azul', 4 * val, 'petogiro');
            if(gp.buttons[5]?.pressed && !estadoAnteriorMandos[i].btn_r1)    cambiarPuntosDirecto('azul', 6 * val, 'cascogiro');

            // Guardar el estado exacto de este frame para el frame que viene (Evita el multi-click)
            estadoAnteriorMandos[i] = { 
                btn_down: gp.buttons[13]?.pressed, btn_right: gp.buttons[15]?.pressed, 
                btn_up: gp.buttons[12]?.pressed, btn_left: gp.buttons[14]?.pressed, 
                btn_l1: gp.buttons[4]?.pressed, btn_x: gp.buttons[0]?.pressed, 
                btn_sq: gp.buttons[2]?.pressed, btn_tr: gp.buttons[3]?.pressed, 
                btn_ci: gp.buttons[1]?.pressed, btn_r1: gp.buttons[5]?.pressed 
            };
        }
    }
    requestAnimationFrame(loopGamepadsCombate);
}

// --- RECEPTOR DE LA PANTALLA DE PÚBLICO ---
canalTransmision.onmessage = function(e) {
    if(!document.getElementById('cronometro')) {
        let d = e.data;
        let setPubVal = (id, val) => { let el = document.getElementById(id); if(el) el.innerText = val; };
        
        setPubVal('pub-nombre-rojo', d.nombreRojo);
        setPubVal('pub-subtexto-rojo', d.subtextoRojo);
        setPubVal('pub-rank-rojo', d.rankRojo);
        setPubVal('pub-nombre-azul', d.nombreAzul);
        setPubVal('pub-subtexto-azul', d.subtextoAzul);
        setPubVal('pub-rank-azul', d.rankAzul);
        setPubVal('pub-categoria', d.categoriaCombate);
        
        setPubVal('pub-pts-rojo', d.ptsRojo); 
        setPubVal('pub-flt-rojo', d.fltRojo);
        setPubVal('pub-pts-azul', d.ptsAzul); 
        setPubVal('pub-flt-azul', d.fltAzul);
        
        setPubVal('pub-round-actual', d.roundActual); 
        setPubVal('pub-cronometro', d.cronometro); 
        setPubVal('pub-lbl-fase', d.lblFase);

        let bR = document.getElementById('pub-bandera-rojo');
        if(bR && d.srcBanderaRojo) { bR.src = d.srcBanderaRojo; bR.style.display = 'block'; bR.onerror = ()=> bR.style.display='none'; }
        
        let bA = document.getElementById('pub-bandera-azul');
        if(bA && d.srcBanderaAzul) { bA.src = d.srcBanderaAzul; bA.style.display = 'block'; bA.onerror = ()=> bA.style.display='none'; }

        let rR1 = document.getElementById('pub-round-rojo-1'); if(rR1) rR1.classList.toggle('activo', d.roundRojo1);
        let rR2 = document.getElementById('pub-round-rojo-2'); if(rR2) rR2.classList.toggle('activo', d.roundRojo2);
        let rA1 = document.getElementById('pub-round-azul-1'); if(rA1) rA1.classList.toggle('activo', d.roundAzul1);
        let rA2 = document.getElementById('pub-round-azul-2'); if(rA2) rA2.classList.toggle('activo', d.roundAzul2);
    }
};