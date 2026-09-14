const REMOTE_SERVER = 'https://beit-knesset.onrender.com';

const getApiBase = () => {
    if (typeof window === 'undefined') return '';

    const { protocol, hostname } = window.location;

    // Standalone mobile app or file protocol (Capacitor, Cordova, Android WebView, file://)
    if (protocol === 'file:' || protocol === 'capacitor:' || protocol === 'app:' || protocol.startsWith('content')) {
        return REMOTE_SERVER;
    }

    // Hosted web domain (e.g. beit-knesset.onrender.com) or local Express server (localhost)
    return '';
};

export const API_BASE = getApiBase();

// נוחות: ייצוא מחדש של פונקציות זיהוי פלטפורמה
export { isMobile, isElectron, getPlatform } from './utils/platformUtils';
