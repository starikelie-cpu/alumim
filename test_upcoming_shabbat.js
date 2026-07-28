
import { getUpcomingShabbatInfo } from './src/utils/hebrewDateUtils.js';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { calculateAliyahInfo } from './src/utils/hebrewDateUtils.js';

// Mocking "today" is hard with the current function because it uses new HDate() internaly.
// But I can inspect the code of getUpcomingShabbatInfo.

console.log("\nTesting actual getUpcomingShabbatInfo from utils:");

function testUpcomingActual(day, month, year) {
    // We need to trick the function into thinking "today" is slightly before this Shabbat.
    // However, getUpcomingShabbatInfo uses new HDate() (today).
    // So we need to modify our test to actually test the logic.
    // Since I can't easily mock the 'today' inside the function without more modules,
    // I will look at the results of calculateAliyahInfo for those same dates,
    // as it uses similar logic and accepts a date parameter.

    // Actually, I can just check the code of getUpcomingShabbatInfo I just wrote.
}

console.log("Checking calculateAliyahInfo for the same holiday-Shabbats:");
[
    { d: 15, m: 7, y: 5784, name: "Sukkot I on Shabbat" },
    { d: 21, m: 1, y: 5782, name: "Pesach VII on Shabbat" },
    { d: 2, m: 7, y: 5784, name: "Shabbat Shuva / Rosh Hashana II" },
    { d: 26, m: 9, y: 5784, name: "Shabbat Chanukah (Vayeishev)" }
].forEach(test => {
    const hd = new HDate(test.d, test.m, test.y);
    const res = calculateAliyahInfo(hd);
    console.log(`${test.name} (${hd.render()}): "${res.parasha}"`);
});
