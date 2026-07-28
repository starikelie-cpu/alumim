import { getUpcomingShabbatInfo } from './src/utils/hebrewDateUtils.js';

console.log('--- Haftarah Verification ---');
const info = getUpcomingShabbatInfo();
console.log('Upcoming Shabbat:', info.shabbatDateFormatted);
console.log('Parasha:', info.parasha);
console.log('Special Shabbat:', info.specialShabbatType || 'None');
console.log('Haftarah:', info.haftarah);

const isZachor = info.specialShabbatType && info.specialShabbatType.includes('זָכוֹר');
const correctHaftarah = isZachor ? 'שמואל א ט"ו' : 'יחזקאל מ"ג';

if (info.haftarah.includes(correctHaftarah)) {
    console.log(`\nSUCCESS: Correct Haftarah identified (${info.haftarah}).`);
} else {
    console.log('\nFAILURE: Unexpected Haftarah info.');
}
