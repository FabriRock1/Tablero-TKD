// =========================================================================
// SERVIDOR LOCAL SMTKD - PUENTE REAL-TIME PARA CELULARES Y MARCADOR
// =========================================================================

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PUERTO = 3000;

// Servir todos los archivos de tu proyecto de forma estática
app.use(express.static(__dirname));

// Lógica de comunicación por WebSockets
wss.on('connection', (ws) => {
    // Al conectarse un dispositivo, le damos la bienvenida
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Reenviar el mensaje de voto o comando a TODOS los dispositivos conectados
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (err) {
            console.error("Error al procesar mensaje de red:", err);
        }
    });
});

// Función para obtener la IP local de tu notebook para decírsela a los celulares
function obtenerIPLocal() {
    const interfaces = os.networkInterfaces();
    for (let devName in interfaces) {
        let iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}

const ipLocal = obtenerIPLocal();

server.listen(PUERTO, () => {
    console.log("=================================================================");
    console.log("             ¡SISTEMA SMTKD ONLINE EN RED LOCAL!                 ");
    console.log("=================================================================");
    console.log(`🖥️  Marcador (en la Notebook): http://localhost:${PUERTO}/index.html`);
    console.log(`📱 Mando Jueces (en el Celular): http://${ipLocal}:${PUERTO}/mando-mobile.html`);
    console.log("=================================================================");
    console.log("👉 Asegurate de que los celulares estén conectados al mismo Wi-Fi.");
});
