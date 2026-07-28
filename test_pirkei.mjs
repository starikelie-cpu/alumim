import { HDate } from '@hebcal/core';

const year = 5786;
const pesachEnd = new HDate(21, 1, year); // 7th day of Pesach
const firstShabbat = pesachEnd.onOrAfter(6);
const roshHashana = new HDate(1, 7, year + 1);
const lastShabbat = roshHashana.prev().onOrBefore(6);

const CHAPTER_NAMES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
let currentShabbat = firstShabbat;
let shabbatNum = 0;

console.log('Pirkei Avot schedule for 5786:');
while (currentShabbat.abs() <= lastShabbat.abs()) {
    const chapter = CHAPTER_NAMES[shabbatNum % 6];
    const greg = currentShabbat.greg();
    console.log(`  ${currentShabbat.renderGematriya(true)} (${greg.toISOString().slice(0,10)}) - פרק ${chapter}`);
    currentShabbat = currentShabbat.add(7, 'd');
    shabbatNum++;
}
console.log(`\nTotal Shabbatot: ${shabbatNum}`);
