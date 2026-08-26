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
let splashWindow;
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

// ── Splash window ─────────────────────────────────────────────────────────────
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 420,
        height: 280,
        frame: false,
        transparent: false,
        resizable: false,
        center: true,
        alwaysOnTop: true,
        backgroundColor: '#1a3a5c',
        icon: path.join(__dirname, 'prague_synagogue_icon.ico'),
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const splashHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%);
    color: #fff;
    font-family: 'Segoe UI', Arial, sans-serif;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; text-align: center; user-select: none;
  }
  .icon { font-size: 56px; margin-bottom: 16px; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px; }
  .sub { font-size: 14px; color: #a8c8e8; margin-bottom: 28px; }
  .bar-wrap {
    width: 260px; height: 6px; background: rgba(255,255,255,0.2);
    border-radius: 3px; overflow: hidden;
  }
  .bar {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #4fc3f7, #81d4fa);
    border-radius: 3px;
    animation: fill 4s ease-in-out forwards;
  }
  @keyframes fill { 0%{width:5%} 40%{width:60%} 80%{width:85%} 100%{width:95%} }
  .status { font-size: 12px; color: #7baed4; margin-top: 12px; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
</style>
</head>
<body>
  <div class="icon">🕍</div>
  <h1>ניהול בית כנסת</h1>
  <div style="font-size: 13px; color: #ffd54f; margin-bottom: 6px; font-weight: 600;">להתקשרות: אלי סטריק - 052-3375529</div>
  <div class="sub">מאתחל את המערכת...</div>
  <div class="bar-wrap"><div class="bar"></div></div>
  <div class="status">מתחבר לשרת...</div>
</body>
</html>`;

    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
    splashWindow.show();
}



function createWindow(backendPort) {
    if (backendPort) currentBackendPort = backendPort;

    mainWindow = new BrowserWindow({
        title: 'בית כנסת - ניהול מתפללים | אלי סטריק - 052-3375529',
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
        // Close splash first, then reveal main window
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
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
function waitForHttpServerReady(url, timeoutMs = 15000, intervalMs = 300) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(url, (res) => {
                res.resume();
                if (res.statusCode >= 200 && res.statusCode < 500) { resolve(); return; }
                maybeRetry();
            });
            req.on('error', maybeRetry);
            req.setTimeout(500, () => { req.destroy(); maybeRetry(); }); // Reduced from 1000 to 500
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

// ── Synagogue name file operations ───────────────────────────────────────────────
const SYNAGOGUE_NAME_FILE = path.join(app.getPath('userData'), 'synagogue_name.json');

function getSynagogueNameFromFile() {
    try {
        if (fs.existsSync(SYNAGOGUE_NAME_FILE)) {
            const data = fs.readFileSync(SYNAGOGUE_NAME_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.synagogueName || null;
        }
    } catch (e) {
        log(`Error reading synagogue name file: ${e.message}`);
    }
    return null;
}

function saveSynagogueNameToFile(synagogueName) {
    try {
        fs.writeFileSync(SYNAGOGUE_NAME_FILE, JSON.stringify({ synagogueName }, null, 2));
        log(`Saved synagogue name to file: ${synagogueName}`);
    } catch (e) {
        log(`Error saving synagogue name file: ${e.message}`);
    }
}

// ── Server startup ────────────────────────────────────────────────────────────
function startServer(backendPort) {
    return new Promise((resolve, reject) => {
        const userDataPath = path.join(app.getPath('userData'), 'data');
        const serverPath   = path.join(__dirname, 'index.js');

        // Ensure data directory exists
        try {
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
                log(`Created data directory: ${userDataPath}`);
            }
        } catch (err) {
            log(`Error creating data directory: ${err.message}`);
        }

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
            waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 4000, 200)
                .then(() => { log('HTTP healthy; continuing.'); finish(true); })
                .catch(() => finish(false, new Error('Server did not respond in time')));
        }, 1500); // Reduced from 3000 to 1500
    });
}

// ── Electron lifecycle ────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    // Show splash immediately — user sees something while server starts
    if (!isDev) createSplashWindow();

    try {
        // 1. Pick a free port (prefer 3000)
        const backendPort = await selectBackendPort(3000);
        currentBackendPort = backendPort;
        log(`Selected backend port: ${backendPort}`);

        // 2. Start express backend
        await startServer(backendPort);

        // 3. Wait until HTTP is confirmed listening (proven server readiness)
        await waitForHttpServerReady(
            `http://localhost:${backendPort}/api/db-status`, 5000, 200
        );
        log('HTTP server confirmed ready');

        // 4. Open window — loadURL so config.js gets http: protocol → relative API calls
        createWindow(backendPort);

    } catch (err) {
        log(`FATAL startup error: ${err.message}`);
        // Close splash before showing error
        if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
        dialog.showErrorBox('Startup Error',
            `Application failed to start backend server.\n\n${err.message}`);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow(currentBackendPort);
    });
});


let isQuitting = false;

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
    if (isQuitting) return; // already in cleanup — let it through
    if (!serverProcess) return;

    event.preventDefault(); // block quit until server exits cleanly
    isQuitting = true;
    log('before-quit: killing server process and waiting for it to exit...');

    const cleanupTimeout = setTimeout(() => {
        log('before-quit: cleanup timed out after 5s, forcing quit');
        app.quit();
    }, 5000);

    serverProcess.once('exit', () => {
        log('before-quit: server process exited cleanly');
        clearTimeout(cleanupTimeout);
        serverProcess = null;
        app.quit(); // now truly quit — isQuitting=true skips this handler
    });

    serverProcess.kill();
});
