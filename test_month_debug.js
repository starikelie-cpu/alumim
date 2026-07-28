
import { months } from '@hebcal/core';
import { getHebrewMonthNumber, normalizeHebrewString } from './src/utils/hebrewDateUtils.js';

console.log('--- Month Map Diagnosis ---');
console.log(`IYAR constant: ${months.IYAR}`);

const iyar1 = 'אייר'; // Two yuds
const iyar2 = 'איר'; // One yud

console.log(`Mapping "${iyar1}": ${getHebrewMonthNumber(iyar1)}`);
console.log(`Mapping "${iyar2}": ${getHebrewMonthNumber(iyar2)}`);

console.log(`Normalized "${iyar1}": "${normalizeHebrewString(iyar1)}"`);
console.log(`Normalized length: ${normalizeHebrewString(iyar1).length}`);

// Let's check the map itself by importing it if possible (but it's not exported)
// Instead let's try some variations
const variations = ['אייר', 'איר', 'אייר', 'אייר '];
variations.forEach(v => {
    console.log(`"${v}" -> ${getHebrewMonthNumber(v)}`);
});
