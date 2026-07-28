
import { HDate } from '@hebcal/core';

console.log('--- Chronology Test ---');

const nisanStart = new HDate(1, 1, 5784);
const tishreiStart = new HDate(1, 7, 5784);

console.log(`1 Nisan 5784: abs=${nisanStart.abs()}, date=${nisanStart.greg().toDateString()}`);
console.log(`1 Tishrei 5784: abs=${tishreiStart.abs()}, date=${tishreiStart.greg().toDateString()}`);

if (nisanStart.abs() < tishreiStart.abs()) {
    console.log('RESULT: Nisan 5784 comes BEFORE Tishrei 5784.');
} else {
    console.log('RESULT: Tishrei 5784 comes BEFORE Nisan 5784.');
}

const nisanNextYear = new HDate(1, 1, 5785);
console.log(`1 Nisan 5785: abs=${nisanNextYear.abs()}, date=${nisanNextYear.greg().toDateString()}`);

console.log('\n--- Transition Test ---');
const elul = new HDate(29, 6, 5784);
const nextDay = elul.next();
console.log(`29 Elul 5784 + 1 day = ${nextDay.render()} (Year: ${nextDay.getFullYear()}, Month: ${nextDay.getMonth()})`);
