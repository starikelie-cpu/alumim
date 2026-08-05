const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { fork } = require('child_process');

// Load .env file if present (for dev mode)
try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch(e) {}

// Embedded MongoDB URI - always connect to Cluster1
const MONGODB_URI = 'mongodb+srv://Alumim:alumim99@cluster1.i8jyvvd.mongodb.net/Alumim?retryWrites=true&w=majority&appName=Cluster1';

let mainWindow;
let serverProcess;
let currentBackendPort = null;

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
    currentBackendPort = backendPort || currentBackendPort;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        backgroundColor: '#f0f2f5',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'build', 'prague_synagogue_icon.ico'),
    });

    // OPEN DEVTOOLS FOR DEBUGGING WHITE SCREEN ONLY IN DEV
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    const devUrl = 'http://localhost:5173';
    const prodUrl = `http://localhost:${currentBackendPort}`;

    if (isDev) {
        // Development: use Vite dev server
        log(`Loading dev URL: ${devUrl}`);
        mainWindow.loadURL(devUrl);
    } else {
        // Production: load via backend static server on the selected port.
        log(`Loading production URL: ${prodUrl}`);
        mainWindow.loadURL(prodUrl);
    }

    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log(`Failed to load URL: ${validatedURL} (${errorCode}: ${errorDescription})`);
        if (errorCode === -102 || errorCode === -105) {
            log('Retrying load in 2 seconds...');
            setTimeout(() => {
                if (!mainWindow || mainWindow.isDestroyed()) return;
                if (isDev) {
                    mainWindow.loadURL(devUrl);
                } else {
                    mainWindow.loadURL(prodUrl);
                }
            }, 2000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function waitForHttpServerReady(url, timeoutMs = 30000, intervalMs = 500) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const req = http.get(url, (res) => {
                // Any HTTP response means server process is up and listening.
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

        // Use child_process.fork for maximum compatibility across installed environments.
        const serverPath = path.join(__dirname, 'index.js');

        log(`Starting server at: ${serverPath}`);
        log(`Data path set to: ${userDataPath}`);
        log(`Backend port set to: ${backendPort}`);

        let settled = false;
        let startupTimer = null;

        const finishResolve = () => {
            if (settled) return;
            settled = true;
            if (startupTimer) {
                clearTimeout(startupTimer);
                startupTimer = null;
            }
            resolve();
        };

        const finishReject = (error) => {
            if (settled) return;
            settled = true;
            if (startupTimer) {
                clearTimeout(startupTimer);
                startupTimer = null;
            }
            reject(error);
        };

        serverProcess = fork(serverPath, [], {
            cwd: __dirname,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                APP_DATA_PATH: userDataPath,
                PORT: String(backendPort),
                MONGODB_URI: process.env.MONGODB_URI || MONGODB_URI
            },
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
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

        serverProcess.on('error', (err) => {
            log(`Server process error: ${err.message}`);
            finishReject(new Error(`Server process spawn error: ${err.message}`));
        });

        serverProcess.on('exit', (code) => {
            log(`Server process exited with code: ${code}`);
            if (code !== 0 && code !== null) {
                log('CRITICAL: Server exited unexpectedly');
                // In some cases a previous server is already listening on 3000.
                // If health check passes, continue instead of failing startup.
                waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 5000, 500)
                    .then(() => {
                        log('Detected active HTTP server despite child exit; continuing startup.');
                        finishResolve();
                    })
                    .catch(() => {
                        finishReject(new Error(`Server process exited unexpectedly with code ${code}`));
                    });
            }
        });

        // Resolve when the server signals it is ready
        serverProcess.on('message', (message) => {
            if (message === 'server-ready') {
                log('Server signaled READY');
                finishResolve();
            }
        });

        // Fail fast if no ready signal arrives in time.
        startupTimer = setTimeout(() => {
            if (settled) return;
            log('Server ready signal timeout - probing HTTP health endpoint before failing');
            waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 5000, 500)
                .then(() => {
                    log('HTTP server is healthy even without ready signal; continuing startup.');
                    finishResolve();
                })
                .catch(() => {
                    finishReject(new Error('Server did not send ready signal in time and health-check failed'));
                });
        }, 30000);
    });
}

app.whenReady().then(async () => {
    try {
        const backendPort = await selectBackendPort(3000);
        currentBackendPort = backendPort;
        log(`Selected backend port: ${backendPort}`);

        // Start the Express server first.
        await startServer(backendPort);

        // Confirm HTTP endpoint is actually listening before opening UI.
        await waitForHttpServerReady(`http://localhost:${backendPort}/api/db-status`, 30000, 500);

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
    // Kill the server process
    if (serverProcess) {
        serverProcess.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Ensure server is killed on quit
    if (serverProcess) {
        serverProcess.kill();
    }
});
