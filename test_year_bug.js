
import { HDate } from '@hebcal/core';
import { calculateAliyahInfo, parseHebrewDate } from './src/utils/hebrewDateUtils.js';

function testYearPersistence(originalStr) {
    console.log(`\nTesting: "${originalStr}"`);
    const info1 = calculateAliyahInfo(originalStr);
    console.log(`First Calculation - Formatted: "${info1.formattedDate}" (Parasha: ${info1.parasha})`);

    const p1 = parseHebrewDate(info1.formattedDate);
    console.log(`First Parse - Year detected: ${p1 ? p1.year : 'FAIL'}`);

    const info2 = calculateAliyahInfo(info1.formattedDate);
    console.log(`Second Calculation - Formatted: "${info2.formattedDate}"`);

    if (info1.formattedDate !== info2.formattedDate) {
        console.log(`!!! SHIFT DETECTED: "${info1.formattedDate}" -> "${info2.formattedDate}"`);
    } else {
        console.log(`Stable.`);
    }
}

console.log('--- Year Shift Debugging ---');
testYearPersistence('י"ח אדר א\' תשפ"ד');
testYearPersistence('אדר א תשפד');
testYearPersistence('י"ח אדר א תשפ"ד');
testYearPersistence('י"ח אדר א\''); // No year
testYearPersistence('י"ח/12/5784');
testYearPersistence('18/12/5784');
