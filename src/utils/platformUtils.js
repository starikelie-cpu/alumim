/**
 * platformUtils.js
 * -----------------
 * זיהוי פלטפורמה: Electron (Windows), Android, iOS, Web
 */

/**
 * מחזיר את הפלטפורמה הנוכחית:
 *   'electron'  - אפליקציית Desktop על Windows
 *   'android'   - דפדפן / Capacitor על אנדרואיד
 *   'ios'       - דפדפן / Capacitor על iOS
 *   'web'       - דפדפן דסקטופ רגיל
 */
export function getPlatform() {
    // Electron - הפרוטוקול הוא file:// בגרסת Desktop
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        return 'electron';
    }

    // Capacitor - אפליקציה מקורית (Android / iOS)
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
        return window.Capacitor.getPlatform(); // 'android' | 'ios'
    }

    // זיהוי לפי User Agent
    if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) return 'android';
        if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    }

    return 'web';
}

/** האם הגרסה היא Electron (Windows desktop) */
export const isElectron = () => getPlatform() === 'electron';

/** האם מדובר בפלטפורמת מובייל (Android או iOS) */
export const isMobile = () => ['android', 'ios'].includes(getPlatform());

/** האם מדובר בדפדפן רגיל (לא Electron, לא מובייל) */
export const isDesktopWeb = () => getPlatform() === 'web';
