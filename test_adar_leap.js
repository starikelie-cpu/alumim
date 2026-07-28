import { HDate } from '@hebcal/core';

// Replicating updated logic from hebrewDateUtils.js
function formatHebrewDateToTextual(dateStr) {
    if (!dateStr) return '';
    try {
        // Simplified parseHebrewDate for test
        const parts = dateStr.includes('אדר') ? { day: 15, monthName: 'אדר', year: 5784 } : null;
        if (dateStr === '15 אדר 5784') {
            const hd = new HDate(15, 12, 5784);
            const rend = hd.renderGematriya(true).split(' ');
            const dayGem = rend[0];
            const yearGem = rend[rend.length - 1];
            const monthName = rend.slice(1, -1).join(' ').replace(/^ב/, '');
            return `${dayGem} ${monthName} ${yearGem}`;
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

console.log('Test 1: 5784 Adar (Leap Year)');
const hdLeap = new HDate(15, 12, 5784);
const rendLeap = hdLeap.renderGematriya(true).split(' ');
const monthLeap = rendLeap.slice(1, -1).join(' ').replace(/^ב/, '');
console.log('Rendered Month:', monthLeap); // Should be אדר א'

console.log('Test 2: 5786 Adar (Regular Year)');
const hdReg = new HDate(15, 12, 5786);
const rendReg = hdReg.renderGematriya(true).split(' ');
const monthReg = rendReg.slice(1, -1).join(' ').replace(/^ב/, '');
console.log('Rendered Month:', monthReg); // Should be אדר

console.log('Test 3: Truncation check (slice(0, -1).join(" "))');
const testStr = 'ט״ו אדר א׳ תשפ״ד';
const parts = testStr.split(' ');
console.log('Processed (Yahrzeit style):', parts.slice(0, -1).join(' ')); // Should be ט״ו אדר א׳
