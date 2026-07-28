
import { HDate, months } from '@hebcal/core';
import { 
    parseHebrewDate, 
    formatHebrewDateToTextual, 
    calculateAliyahInfo,
    gematriaToNum,
    yearToGematria
} from './src/utils/hebrewDateUtils.js';

function testDate(dateStr) {
    console.log(`--- Testing: "${dateStr}" ---`);
    const parts = parseHebrewDate(dateStr);
    console.log('Parsed Parts:', parts);
    
    if (parts) {
        const aliyahInfo = calculateAliyahInfo(dateStr);
        console.log('Aliyah Info:', aliyahInfo);
        
        const textual = formatHebrewDateToTextual(dateStr);
        console.log('Textual Format:', textual);
        
        // Simulate update: parse textual and re-format
        const parts2 = parseHebrewDate(textual);
        console.log('Parsed Textual:', parts2);
        const textual2 = formatHebrewDateToTextual(textual);
        console.log('Textual Format 2:', textual2);
        
        if (textual !== textual2) {
            console.error('ERROR: Textual format changed after re-parsing!');
        }
    }
    console.log('\n');
}

console.log('--- Leap Year Tests (5784) ---');
testDate('י"ח אדר א\' תשפ"ד');
testDate('י"ח אדר ב\' תשפ"ד');
testDate('י"ח אדר תשפ"ד');

console.log('--- Non-Leap Year Tests (5786) ---');
testDate('י"ח אדר תשפ"ו');

console.log('--- Edge Case: Prefix ה ---');
testDate('י"ח כסלו ה\'תשפ"ד');

console.log('--- Year formatting check ---');
for (let y = 5780; y <= 5790; y++) {
    const gem = yearToGematria(y);
    const num = gematriaToNum(gem) + 5000;
    console.log(`${y} -> ${gem} -> ${num} ${y === num ? 'OK' : 'FAIL'}`);
}
