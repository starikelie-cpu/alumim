const { app, BrowserWindow, utilityProcess, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let serverProcess;

const isDev = !app.isPackaged;

// Create a log file in AppData to help debug
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logPath, entry);
}

log('Application starting...');
log(`isPackaged: ${app.isPackaged}`);

function createWindow() {
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

    if (isDev) {
        // Development: use Vite dev server
        const devUrl = 'http://localhost:5173';
        log(`Loading dev URL: ${devUrl}`);
        mainWindow.loadURL(devUrl);
    } else {
        // Production: load the built index.html file directly
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
                mainWindow.loadURL(startUrl);
            }, 2000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        // Use standard AppData Roaming directory for persistent database storage
        const userDataPath = path.join(app.getPath('userData'), 'data');

        // Use utilityProcess.fork which is optimized for running node scripts in Electron
        const serverPath = path.join(__dirname, 'index.js');

        log(`Starting server at: ${serverPath}`);
        log(`Data path set to: ${userDataPath}`);

        serverProcess = utilityProcess.fork(serverPath, [], {
            cwd: __dirname,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                APP_DATA_PATH: userDataPath
            },
            stdio: 'inherit'
        });

        serverProcess.on('spawn', () => {
            log('Server process spawned successfully');
        });

        serverProcess.on('exit', (code) => {
            log(`Server process exited with code: ${code}`);
            if (code !== 0 && code !== null) {
                log('CRITICAL: Server exited unexpectedly');
            }
        });

        // Resolve when the server signals it is ready
        serverProcess.on('message', (message) => {
            if (message === 'server-ready') {
                log('Server signaled READY');
                resolve();
            }
        });

        // Fallback timeout in case signaling fails
        setTimeout(() => {
            log('Server ready signal timeout - proceeding');
            resolve();
        }, 10000);
    });
}

app.whenReady().then(async () => {
    // Start the Express server first
    await startServer();

    // Then create the window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
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
