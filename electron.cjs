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

app.on('second-instance', (event, commandLine, workingDirectory) => {
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

    // OPEN DEVTOOLS FOR DEBUGGING WHITE SCREEN ONLY IN DEV
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    if (isDev) {
        // Development: use Vite dev server
        const devUrl = 'http://localhost:5173';
        log(`Loading dev URL: ${devUrl}`);
        mainWindow.loadURL(devUrl);
    } else {
        // Production: load the built index.html file directly (same as 1.3.6 / 1.4.4)
        const prodPath = path.join(__dirname, 'dist', 'index.html');
        log(`Loading production file: ${prodPath}`);
        mainWindow.loadFile(prodPath);
    }

    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log(`Failed to load URL: ${validatedURL} (${errorCode}: ${errorDescription})`);
        if (errorCode === -102 || errorCode === -105) {
            log('Retrying load in 2 seconds...');
            setTimeout(() => {
                if (!mainWindow || mainWindow.isDestroyed()) return;
                if (isDev) {
                    mainWindow.loadURL('http://localhost:5173');
                } else {
                    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
                }
            }, 2000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function waitForHttpServerReady(url, timeoutMs = 15000, intervalMs = 500) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(url, (res) => {
                res.resume();
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
                    resolve();
                    return;
                }
                maybeRetry();
            });

            req.on('error', () => {
                maybeRetry();
            });

            req.setTimeout(1000, () => {
                req.destroy();
                maybeRetry();
            });
        };

        const maybeRetry = () => {
            if (Date.now() - start >= timeoutMs) {
                reject(new Error(`Timed out waiting for server readiness at ${url}`));
                return;
            }
            setTimeout(tryOnce, intervalMs);
        };

        tryOnce();
    });
}

function selectBackendPort(preferredPort = 3000) {
    return new Promise((resolve) => {
        const probe = net.createServer();

        probe.once('error', () => {
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

function startServer(backendPort) {
    return new Promise((resolve, reject) => {
        // Use standard AppData Roaming directory for persistent database storage
        const userDataPath = path.join(app.getPath('userData'), 'data');

        // Use utilityProcess.fork — Electron's native API for Node.js helper scripts
        const serverPath = path.join(__dirname, 'index.js');

        log(`Starting server at: ${serverPath}`);
        log(`Data path set to: ${userDataPath}`);
        log(`Backend port set to: ${backendPort}`);

        let settled = false;
        let startupTimer = null;

        const finishResolve = () => {
            if (settled) return;
            settled = true;
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            resolve();
        };

        const finishReject = (error) => {
            if (settled) return;
            settled = true;
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            reject(error);
        };

        serverProcess = utilityProcess.fork(serverPath, [], {
            cwd: __dirname,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                APP_DATA_PATH: userDataPath,
                PORT: String(backendPort),
                MONGODB_URI: process.env.MONGODB_URI || MONGODB_URI
            },
            stdio: 'pipe'
        });

        serverProcess.stdout.on('data', (data) => {
            log(`[SERVER-OUT] ${data.toString().trim()}`);
        });

        serverProcess.stderr.on('data', (data) => {
            log(`[SERVER-ERR] ${data.toString().trim()}`);
        });

        serverProcess.on('spawn', () => {
            log('Server process spawned successfully');
        });

        serverProcess.on('exit', (code) => {
            log(`Server process exited with code: ${code}`);
            if (code !== 0 && code !== null) {
                log('CRITICAL: Server exited unexpectedly');
                // Probe HTTP in case a previous instance is already up
                waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 5000, 500)
                    .then(() => {
                        log('Active HTTP server detected despite exit; continuing.');
                        finishResolve();
                    })
                    .catch(() => {
                        finishReject(new Error(`Server process exited unexpectedly with code ${code}`));
                    });
            }
        });

        // utilityProcess uses parentPort for IPC
        serverProcess.on('message', (message) => {
            if (message === 'server-ready') {
                log('Server signaled READY');
                finishResolve();
            }
        });

        // Fallback: if no ready signal in 10s, proceed anyway (same as 1.3.6 / 1.4.4)
        startupTimer = setTimeout(() => {
            log('Server ready signal timeout - proceeding anyway');
            finishResolve();
        }, 10000);
    });
}

app.whenReady().then(async () => {
    try {
        const backendPort = await selectBackendPort(3000);
        currentBackendPort = backendPort;
        log(`Selected backend port: ${backendPort}`);

        // Start the Express server first
        await startServer(backendPort);

        // Create the window (loads dist/index.html directly)
        createWindow(backendPort);
    } catch (err) {
        log(`FATAL startup error: ${err.message}`);
        dialog.showErrorBox('Startup Error', `Application failed to start backend server.\n\n${err.message}`);
        app.quit();
        return;
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow(currentBackendPort);
        }
    });
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
