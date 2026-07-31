// ─── IndexedDB helpers for persisting FileSystemFileHandles ───────────────────

// Helper to get the AppData directory path where records are stored
function getAppDataPath() {
    // Hard‑coded path for this project (Windows)
    // C:\Users\<username>\AppData\Roaming\synagogue-management\data
    // In production you may use Electron's app.getPath('appData')
    return "C:/Users/Elie/AppData/Roaming/synagogue-management/data";
}
const IDB_NAME = 'bc-file-handles';
const IDB_STORE = 'handles';
const IDB_VERSION = 1;

function openHandleDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function saveHandle(key, handle) {
    try {
        const db = await openHandleDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(handle, key);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('Could not save file handle:', e);
    }
}

async function loadHandle(key) {
    try {
        const db = await openHandleDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = (e) => resolve(e.target.result || null);
            req.onerror = (e) => reject(e.target.error);
        });
    } catch (e) {
        console.warn('Could not load file handle:', e);
        return null;
    }
}

// ─── Export ───────────────────────────────────────────────────────────────────
/**
 * Saves JSON data to a file using the File System Access API if available.
 * Remembers the last chosen path via IndexedDB and reuses it on next call.
 * @param {object|array} data - The JSON data to save
 * @param {string} defaultName - The default file name (e.g., 'members.json')
 * @param {string} [handleKey] - Key used to persist the chosen file handle
 */
export async function saveJsonFile(data, defaultName = 'export.json', handleKey) {
    const jsonString = JSON.stringify(data, null, 2);
    const storageKey = handleKey || `save-handle-${defaultName}`;

    if (window.showSaveFilePicker) {
        try {
            // Try to load the previously chosen handle to use its parent as a starting point
            let lastHandle = await loadHandle(storageKey);

            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                startIn: lastHandle || 'documents',
                types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
            });

            // Save the new handle for next time
            await saveHandle(storageKey, handle);

            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File save failed:', err);
                alert('שגיאה בשמירת הקובץ: ' + err.message);
            }
            return false;
        }
    }

    // Fallback download
    try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error('Fallback save failed:', e);
        alert('שגיאה בשמירת הקובץ (Fallback): ' + e.message);
        return false;
    }
}

// ─── Import ───────────────────────────────────────────────────────────────────
/**
 * Opens a JSON file picker, remembers the last chosen directory via IndexedDB,
 * and returns the parsed JSON content.
 * @param {string} [handleKey] - Key used to persist the chosen file handle
 * @returns {Promise<{json: any, fileName: string} | null>}
 */
export async function loadJsonFile(handleKey = 'import-handle') {
    if (window.showOpenFilePicker) {
        try {
            // Try to load the previously chosen handle to use its parent as a starting point
            let lastHandle = await loadHandle(handleKey);

            const [handle] = await window.showOpenFilePicker({
                startIn: lastHandle || 'documents',
                types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
                multiple: false,
            });
            await saveHandle(handleKey, handle);
            const file = await handle.getFile();
            const text = await file.text();
            return { json: JSON.parse(text), fileName: file.name };
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File open failed:', err);
                alert('שגיאה בפתיחת הקובץ: ' + err.message);
            }
            return null;
        }
    }

    // Fallback: try to load default data file from AppData directory
    try {
        const appDataPath = getAppDataPath();
        // Assume default file name 'members.json'
        const defaultFile = `${appDataPath}/members.json`;
        const response = await fetch(`file://${defaultFile}`);
        if (response.ok) {
            const text = await response.text();
            return { json: JSON.parse(text), fileName: 'members.json' };
        }
    } catch (e) {
        console.warn('Failed to load from AppData fallback:', e);
    }
    // If AppData fallback fails, fall back to classic file input
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    resolve({ json: JSON.parse(ev.target.result), fileName: file.name });
                } catch (err) {
                    alert('שגיאה בקריאת הקובץ: ' + err.message);
                    resolve(null);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}
