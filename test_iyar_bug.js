
import { HDate } from '@hebcal/core';
import { calculateAliyahInfo, parseHebrewDate, getHebrewMonthNumber } from './src/utils/hebrewDateUtils.js';

console.log('--- Debugging Iyar Tashsag ---');

const testInput = 'אייר תשס״ג';
console.log(`Input: "${testInput}"`);

const p = parseHebrewDate(testInput);
console.log('Parsed Parts:', JSON.stringify(p));

if (p) {
    const m = getHebrewMonthNumber(p.monthName || p.month, p.year);
    console.log(`Month Number: ${m} (Year context: ${p.year})`);

    try {
        const hd = new HDate(p.day || 1, m, p.year);
        console.log(`HDate rendered: ${hd.render()}`);
        console.log(`HDate absolute: ${hd.abs()}`);

        const info = calculateAliyahInfo(testInput);
        console.log(`calculateAliyahInfo Result:`);
        console.log(`  Formatted: "${info.formattedDate}"`);
        console.log(`  Parasha: "${info.parasha}"`);
    } catch (e) {
        console.log(`Error creating HDate: ${e.message}`);
    }
}

console.log('\n--- Month Map Check ---');
const n = 'אייר';
console.log(`Mapping "${n}": ${getHebrewMonthNumber(n)}`);
