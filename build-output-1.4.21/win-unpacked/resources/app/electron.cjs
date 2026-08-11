const { app, BrowserWindow, dialog, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

// Load .env file if present (for dev mode)
try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch(e) {}

// Embedded MongoDB URI - always connect to Cluster1
const MONGODB_URI = 'mongodb+srv://Alumim:alumim99@cluster1.i8jyvvd.mongodb.net/Alumim?retryWrites=true&w=majority&appName=Cluster1';

let mainWindow;
let serverProcess;
let currentBackendPort = 3000;

const isDev = !app.isPackaged;

// Create a log file in AppData to help debug
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logPath, entry);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

app.on('second-instance', () => {
    log('Second instance detected, focusing main window...');
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

log('Application starting...');
log(`isPackaged: ${app.isPackaged}`);

function createWindow(backendPort) {
    if (backendPort) currentBackendPort = backendPort;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        backgroundColor: '#f0f2f5',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'prague_synagogue_icon.ico'),
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    const devUrl  = 'http://localhost:5173';
    // Production: load via express backend serving dist/ statically.
    // Using loadURL (not loadFile) so window.location.protocol = 'http:'
    // and config.js returns '' (relative) → API calls go to the correct dynamic port.
    const prodUrl = `http://localhost:${currentBackendPort}`;

    if (isDev) {
        log(`Loading dev URL: ${devUrl}`);
        mainWindow.loadURL(devUrl);
    } else {
        log(`Loading production URL: ${prodUrl}`);
        mainWindow.loadURL(prodUrl);
    }

    // Retry on transient load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log(`Failed to load URL: ${validatedURL} (${errorCode}: ${errorDescription})`);
        if (errorCode === -102 || errorCode === -105) {
            log('Retrying load in 2 seconds...');
            setTimeout(() => {
                if (!mainWindow || mainWindow.isDestroyed()) return;
                mainWindow.loadURL(isDev ? devUrl : prodUrl);
            }, 2000);
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Port selection ────────────────────────────────────────────────────────────
function selectBackendPort(preferredPort = 3000) {
    return new Promise((resolve) => {
        const probe = net.createServer();
        probe.once('error', () => {
            // Preferred port busy — grab any free port
            const fallback = net.createServer();
            fallback.once('error', () => resolve(preferredPort));
            fallback.listen(0, '127.0.0.1', () => {
                const addr = fallback.address();
                const chosen = addr && typeof addr === 'object' ? addr.port : preferredPort;
                fallback.close(() => resolve(chosen));
            });
        });
        probe.listen(preferredPort, '127.0.0.1', () => {
            probe.close(() => resolve(preferredPort));
        });
    });
}

// ── HTTP health probe ─────────────────────────────────────────────────────────
function waitForHttpServerReady(url, timeoutMs = 30000, intervalMs = 500) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(url, (res) => {
                res.resume();
                if (res.statusCode >= 200 && res.statusCode < 500) { resolve(); return; }
                maybeRetry();
            });
            req.on('error', maybeRetry);
            req.setTimeout(1000, () => { req.destroy(); maybeRetry(); });
        };
        const maybeRetry = () => {
            if (Date.now() - start >= timeoutMs) {
                reject(new Error(`Timed out waiting for server at ${url}`));
                return;
            }
            setTimeout(tryOnce, intervalMs);
        };
        tryOnce();
    });
}

// ── Server startup ────────────────────────────────────────────────────────────
function startServer(backendPort) {
    return new Promise((resolve, reject) => {
        const userDataPath = path.join(app.getPath('userData'), 'data');
        const serverPath   = path.join(__dirname, 'index.js');

        log(`Starting server at: ${serverPath}`);
        log(`Data path: ${userDataPath}`);
        log(`Backend port: ${backendPort}`);

        let settled = false;
        let startupTimer = null;

        const finish = (ok, err) => {
            if (settled) return;
            settled = true;
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            if (ok) resolve(); else reject(err);
        };

        // utilityProcess.fork — Electron's native API for Node.js helper scripts.
        // Supports ES modules (type:module) and uses process.parentPort for IPC.
        serverProcess = utilityProcess.fork(serverPath, [], {
            cwd: __dirname,
            env: {
                ...process.env,
                NODE_ENV:      'production',
                APP_DATA_PATH: userDataPath,
                PORT:          String(backendPort),
                MONGODB_URI:   process.env.MONGODB_URI || MONGODB_URI
            },
            stdio: 'pipe'
        });

        serverProcess.stdout.on('data', d => log(`[SERVER] ${d.toString().trim()}`));
        serverProcess.stderr.on('data', d => log(`[SERVER-ERR] ${d.toString().trim()}`));

        serverProcess.on('spawn', () => log('Server process spawned'));

        serverProcess.on('exit', (code) => {
            log(`Server process exited with code: ${code}`);
            if (code !== 0 && code !== null) {
                log('CRITICAL: Server exited unexpectedly — probing HTTP before failing');
                // Maybe a previous instance is still up on that port
                waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 5000, 500)
                    .then(() => { log('Existing HTTP server detected; continuing.'); finish(true); })
                    .catch(() => finish(false, new Error(`Server exited with code ${code}`)));
            }
        });

        serverProcess.on('message', (msg) => {
            if (msg === 'server-ready' || (msg && msg.type === 'server-ready')) {
                log('Server signaled READY');
                finish(true);
            }
        });

        // Fallback: if no ready signal in time, probe HTTP before giving up
        startupTimer = setTimeout(() => {
            if (settled) return;
            log('No ready signal — probing HTTP health endpoint');
            waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 15000, 500)
                .then(() => { log('HTTP healthy; continuing.'); finish(true); })
                .catch(() => finish(false, new Error('Server did not respond in time')));
        }, 30000);
    });
}

// ── Electron lifecycle ────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    try {
        // 1. Pick a free port (prefer 3000)
        const backendPort = await selectBackendPort(3000);
        currentBackendPort = backendPort;
        log(`Selected backend port: ${backendPort}`);

        // 2. Start express backend
        await startServer(backendPort);

        // 3. Wait until HTTP is confirmed listening (proven server readiness)
        await waitForHttpServerReady(
            `http://localhost:${backendPort}/api/db-status`, 30000, 500
        );
        log('HTTP server confirmed ready');

        // 4. Open window — loadURL so config.js gets http: protocol → relative API calls
        createWindow(backendPort);

    } catch (err) {
        log(`FATAL startup error: ${err.message}`);
        dialog.showErrorBox('Startup Error',
            `Application failed to start backend server.\n\n${err.message}`);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow(currentBackendPort);
    });
});

app.on('window-all-closed', () => {
    if (serverProcess) serverProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) serverProcess.kill();
});
