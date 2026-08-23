export const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';

// נוחות: ייצוא מחדש של פונקציות זיהוי פלטפורמה
export { isMobile, isElectron, getPlatform } from './utils/platformUtils';
