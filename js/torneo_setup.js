// =========================================================================
// SETUP DE TORNEO, LLAVES AUTOMÁTICAS Y PRUEBA DE MANDOS (COMPLETO)
// =========================================================================

let poolCompetidores = JSON.parse(localStorage.getItem('smtkd_competidores')) || [];

// Captura unificada del HUD para todos los selectores analógicos, países y sistemas
let valoresHUD = {
    sistema: 'best3',
    jueces: '2_2',
    paisRojo: 'ar',
    paisAzul: 'br',
    min: 1,
    seg: 30,
    'desc-min': 1,
    'desc-seg': 0,
    'med-min': 1,
    'med-seg': 0,
    'gj-max': 5,
    'pg-pts': 12
};

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. INICIALIZACIÓN DE SETUP.HTML ---
    if(document.getElementById('cfg-nombre-rojo')) {
        // Autocompletar si venimos de la pantalla de llaves automáticas
        const precarga = JSON.parse(sessionStorage.getItem('smtkd_preload_match'));
        if(precarga) {
            if(document.getElementById('cfg-nombre-rojo')) document.getElementById('cfg-nombre-rojo').value = precarga.rojo || "";
            if(document.getElementById('cfg-subtexto-rojo')) document.getElementById('cfg-subtexto-rojo').value = precarga.clubRojo || "";
            if(document.getElementById('cfg-nombre-azul')) document.getElementById('cfg-nombre-azul').value = precarga.azul || "";
            if(document.getElementById('cfg-subtexto-azul')) document.getElementById('cfg-subtexto-azul').value = precarga.clubAzul || "";
            sessionStorage.removeItem('smtkd_preload_match'); 
        }

        // Sincronizar todos los casilleros y campos digitales con el estado de inicio
        actualizarTodosLosDisplaysHUD();

        // Activamos el chequeo de joysticks en tiempo real para el cartel del Setup
        requestAnimationFrame(loopDeteccionFisica);
    }

    // --- 2. INICIALIZACIÓN DE TORNEO.HTML ---
    if(document.getElementById('bracket-render-box')) {
        let lblTotal = document.getElementById('total-inscriptos-lbl');
        if(lblTotal) lblTotal.innerText = `Atletas: ${poolCompetidores.length}`;
        renderizarLlaveAutomatica();
        requestAnimationFrame(loopTestMandos);
    }
});

// ================= LÓGICA DE SELECCIÓN INTERACTIVA HUD Países / Reglas =================
window.seleccionarOpcionHUD = function(campo, valor, elemento) {
    valoresHUD[campo] = valor;
    
    const contenedor = elemento.parentElement;
    const botones = contenedor.querySelectorAll('.btn-selector-cyber');
    botones.forEach(btn => btn.classList.remove('activo'));
    
    elemento.classList.add('activo');
};

// ================= INCREMENTADORES Y LIMITADORES DIGITALES HUD (BOTONES + / -) =================
window.cambiarValorHUD = function(llave, incremento) {
    let valorActual = valoresHUD[llave];
    let nuevoValor = valorActual + incremento;

    if (llave.endsWith('min')) {
        if (nuevoValor < 0) nuevoValor = 0;
        if (nuevoValor > 9) nuevoValor = 9;
    } else if (llave.endsWith('seg')) {
        if (nuevoValor < 0) {
            let minLlave = llave.replace('seg', 'min');
            if (valoresHUD[minLlave] > 0) {
                valoresHUD[minLlave]--;
                document.getElementById(`lbl-${minLlave}`).value = valoresHUD[minLlave].toString().padStart(2, '0');
                nuevoValor = 55;
            } else {
                nuevoValor = 0;
            }
        }
        if (nuevoValor > 55) {
            let minLlave = llave.replace('seg', 'min');
            if (valoresHUD[minLlave] < 9) {
                valoresHUD[minLlave]++;
                document.getElementById(`lbl-${minLlave}`).value = valoresHUD[minLlave].toString().padStart(2, '0');
                nuevoValor = 0;
            } else {
                nuevoValor = 55;
            }
        }
    } else if (llave === 'gj-max') {
        if (nuevoValor < 1) nuevoValor = 1;
        if (nuevoValor > 10) nuevoValor = 10;
    } else if (llave === 'pg-pts') {
        if (nuevoValor < 1) nuevoValor = 1;
        if (nuevoValor > 30) nuevoValor = 30;
    }

    valoresHUD[llave] = nuevoValor;
    
    let displayElement = document.getElementById(`lbl-${llave}`);
    if (displayElement) {
        displayElement.value = llave.endsWith('seg') || llave.endsWith('min') 
            ? nuevoValor.toString().padStart(2, '0') 
            : nuevoValor;
    }
};

// ================= LÓGICA DE CAPTURA DIRECTA DESDE EL TECLADO (INPUT CHANGE) =================
window.validarEntradaTeclado = function(llave, elemento) {
    let valorIngresado = parseInt(elemento.value);
    
    if (isNaN(valorIngresado)) {
        actualizarDisplayEspecifico(llave);
        return;
    }

    if (llave.endsWith('min')) {
        if (valorIngresado < 0) valorIngresado = 0;
        if (valorIngresado > 9) valorIngresado = 9;
    } else if (llave.endsWith('seg')) {
        if (valorIngresado < 0) valorIngresado = 0;
        if (valorIngresado > 59) valorIngresado = 59;
    } else if (llave === 'gj-max') {
        if (valorIngresado < 1) valorIngresado = 1;
        if (valorIngresado > 10) valorIngresado = 10;
    } else if (llave === 'pg-pts') {
        if (valorIngresado < 1) valorIngresado = 1;
        if (valorIngresado > 30) valorIngresado = 30;
    }

    valoresHUD[llave] = valorIngresado;
    actualizarDisplayEspecifico(llave);
};

function actualizarTodosLosDisplaysHUD() {
    for (let llave in valoresHUD) {
        if (llave !== 'sistema' && llave !== 'jueces' && llave !== 'paisRojo' && llave !== 'paisAzul') {
            actualizarDisplayEspecifico(llave);
        }
    }
}

function actualizarDisplayEspecifico(llave) {
    let input = document.getElementById(`lbl-${llave}`);
    if (input) {
        input.value = llave.endsWith('seg') || llave.endsWith('min') 
            ? valoresHUD[llave].toString().padStart(2, '0') 
            : valoresHUD[llave];
    }
}

// ================= LOOP DETECCIÓN DE MANDOS PARA SETUP.HTML =================
function loopDeteccionFisica() {
    const indicadorMando = document.getElementById('gamepad-status');
    if (!indicadorMando) return;

    const gamepads = navigator.getGamepads();
    let cantidadConectados = 0;

    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            cantidadConectados++;
        }
    }

    if (cantidadConectados > 0) {
        indicadorMando.className = "con-mando";
        indicadorMando.innerText = `🎮 ¡Mandos listos! (${cantidadConectados} detectado${cantidadConectados > 1 ? 's' : ''})`;
    } else {
        indicadorMando.className = "sin-mando";
        indicadorMando.innerText = "🎮 Esperando mandos...";
    }

    requestAnimationFrame(loopDeteccionFisica);
}

// ================= LÓGICA DE CAPTURA Y GUARDADO DE COMBATE =================
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

// ================= GESTIÓN COMPETIDORES BRACKETS =================
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

// ================= TEST DE MANDOS INTERNOS ORIGINALES =================
function loopTestMandos() {
    if(!document.getElementById('pagina-test')?.classList.contains('activa')) {
        requestAnimationFrame(loopTestMandos); return;
    }
    const gps = navigator.getGamepads();
    for(let i=0; i<2; i++) {
        let gp = gps[i]; let slot = document.getElementById(`ps-slot-${i}`);
        if(!gp) { if(slot) slot.classList.remove('conectado'); continue; }
        if(slot) slot.classList.add('conectado');
        
        document.getElementById(`btn-${i}-up`)?.classList.toggle('prendido', gp.buttons[12]?.pressed);
        document.getElementById(`btn-${i}-down`)?.classList.toggle('prendido', gp.buttons[13]?.pressed);
        document.getElementById(`btn-${i}-left`)?.classList.toggle('prendido', gp.buttons[14]?.pressed);
        document.getElementById(`btn-${i}-right`)?.classList.toggle('prendido', gp.buttons[15]?.pressed);
        
        document.getElementById(`btn-${i}-cr`)?.classList.toggle('prendido', gp.buttons[0]?.pressed); 
        document.getElementById(`btn-${i}-ci`)?.classList.toggle('prendido', gp.buttons[1]?.pressed); 
        document.getElementById(`btn-${i}-sq`)?.classList.toggle('prendido', gp.buttons[2]?.pressed); 
        document.getElementById(`btn-${i}-tr`)?.classList.toggle('prendido', gp.buttons[3]?.pressed); 
    }
    requestAnimationFrame(loopTestMandos);
}