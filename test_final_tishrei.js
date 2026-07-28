
import { HDate } from '@hebcal/core';
import { calculateAliyahInfo, parseHebrewDate, getHebrewMonthNumber, formatHebrewDateToNumeric, getTishreiAlignedMonthIndex } from './src/utils/hebrewDateUtils.js';

console.log('--- Final Tishrei Alignment Verification ---');

const testCases = [
    { input: '15/01/5784', expectedHebcal: '15th of Tishrei, 5784' }, // User Tishrei
    { input: '15/07/5784', expectedHebcal: '15th of Adar II, 5784' }, // User Adar II (Leap)
    { input: '15/08/5784', expectedHebcal: '15th of Nisan, 5784' },   // User Nisan
    { input: 'טו שבט תשפ"ד', expectedHebcal: '15th of Sh’vat, 5784' },
];

testCases.forEach(({ input, expectedHebcal }) => {
    const p = parseHebrewDate(input);
    const m = getHebrewMonthNumber(p.monthName || p.month, p.year);
    const hd = new HDate(p.day, m, p.year);
    const rendered = hd.render();

    console.log(`Input: ${input} -> Hebcal: ${rendered}`);
    if (rendered !== expectedHebcal) {
        console.log(`!!! MISMATCH: Expected ${expectedHebcal}, got ${rendered}`);
    } else {
        console.log('OK');
    }

    // Test reverse mapping for numeric input
    if (input.includes('/')) {
        const numeric = formatHebrewDateToNumeric(input);
        console.log(`Input: ${input} -> Numeric Export: ${numeric}`);
        if (numeric !== input) {
            // Note: leading zeros might differ
            console.log(`!!! EXPORT MISMATCH: Original ${input}, Exported ${numeric}`);
        } else {
            console.log('Stable.');
        }
    }
});

console.log('\n--- Year Prefix Verification ---');
const tests = [
    { s: '15/01/84', e: 5784 },
    { s: '15/01/784', e: 5784 },
    { s: 'טו שבט 84', e: 5784 },
    { s: 'טו שבט פ"ד', e: 5784 },
];

tests.forEach(({ s, e }) => {
    const p = parseHebrewDate(s);
    console.log(`Input: ${s} -> Year detected: ${p.year}`);
    if (p.year !== e) {
        console.log(`!!! FAILED: Expected ${e}, got ${p.year}`);
    } else {
        console.log('OK');
    }
});
