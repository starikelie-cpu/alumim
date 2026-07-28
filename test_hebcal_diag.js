
import { HDate, months } from '@hebcal/core';

console.log('--- Hebcal Library Diagnostics ---');

console.log('Month Enums:');
console.log(`Tishrei: ${months.TISHREI}`); // Expected 7
console.log(`Cheshvan: ${months.CHESHVAN}`); // Expected 8
console.log(`Adar I: ${months.ADAR_I}`); // Expected 12
console.log(`Adar II: ${months.ADAR_II}`); // Expected 13
console.log(`Nisan: ${months.NISAN}`); // Expected 1
console.log(`Elul: ${months.ELUL}`); // Expected 6

console.log('\nYear Transition Logic:');
const tishrei = new HDate(1, 7, 5784);
console.log(`1 Tishrei 5784: ${tishrei.render()} (Year: ${tishrei.getFullYear()}, Month: ${tishrei.getMonth()})`);

const elulIdx = new HDate(1, 6, 5784);
console.log(`1 Elul 5784: ${elulIdx.render()} (Year: ${elulIdx.getFullYear()}, Month: ${elulIdx.getMonth()})`);

const nisanIdx = new HDate(1, 1, 5784);
console.log(`1 Nisan 5784: ${nisanIdx.render()} (Year: ${nisanIdx.getFullYear()}, Month: ${nisanIdx.getMonth()})`);

console.log('\nLeap Year Month Checks (5784):');
for (let m = 1; m <= 13; m++) {
    try {
        const d = new HDate(1, m, 5784);
        console.log(`Month ${m}: ${d.render()}`);
    } catch (e) {
        console.log(`Month ${m}: ERROR`);
    }
}

console.log('\nRegular Year Month Checks (5785):');
for (let m = 1; m <= 13; m++) {
    try {
        const d = new HDate(1, m, 5785);
        console.log(`Month ${m}: ${d.render()}`);
    } catch (e) {
        console.log(`Month ${m}: ERROR`);
    }
}
