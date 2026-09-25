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

/**
 * מעדכן את תגית האינדיקציה (Badge) של כמות הנרשמים החדשים על גבי אייקון האפליקציה במסך:
 * 1. Web App Badging API (במסך הבית באנדרואיד ובשורת המשימות ב-Windows)
 * 2. כותרת הכרטיסייה בדפדפן (Document Title)
 * 3. אייקון הכרטיסייה/אפליקציה (Dynamic Favicon Badge)
 */
export function updateAppBadge(count = 0) {
    if (typeof window === 'undefined') return;

    // 1. OS Native / PWA App Badge API (Android Home Screen Icon & Windows Taskbar App Icon)
    if ('setAppBadge' in navigator) {
        if (count > 0) {
            navigator.setAppBadge(count).catch(() => {});
        } else if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(() => {});
        }
    }

    // 2. Document Title Badge (למשל: "(3) ניהול בית כנסת")
    const baseTitle = 'ניהול בית כנסת';
    if (count > 0) {
        document.title = `(${count}) ${baseTitle}`;
    } else {
        document.title = baseTitle;
    }

    // 3. Dynamic Favicon Badge (ציור תגית ירוקה עם המספר על אייקון הלוגו של האפליקציה)
    try {
        let favicon = document.querySelector("link[rel*='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = favicon.href || '/favicon.ico';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 32, 32);
            if (count > 0) {
                // עיגול תגית ירוק
                ctx.beginPath();
                ctx.arc(24, 8, 8, 0, 2 * Math.PI);
                ctx.fillStyle = '#52c41a';
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                // ספרת כמות הנרשמים
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(count > 99 ? '99+' : String(count), 24, 8);
            }
            favicon.href = canvas.toDataURL('image/png');
        };
    } catch (e) {
        console.error('Failed to update favicon badge:', e);
    }
}
