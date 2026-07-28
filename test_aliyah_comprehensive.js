
import { calculateAliyahInfo } from './src/utils/hebrewDateUtils.js';
import { HDate } from '@hebcal/core';

function testDate(day, month, year, label) {
    const hd = new HDate(day, month, year);
    console.log(`\nTesting ${label} (${hd.render()}):`);
    const res = calculateAliyahInfo(hd);
    console.log("Result:", res);
}

// 1. Sukkot I on Shabbat (15 Tishrei 5784) - Sep 30, 2023
testDate(15, 7, 5784, "Sukkot I (Shabbat)");

// 2. Pesach VII on Shabbat (21 Nisan 5782) - April 22, 2022
testDate(21, 1, 5782, "Pesach VII (Shabbat)");

// 3. Shmini Atzeret on Shabbat (22 Tishrei 5783) - Oct 17, 2022
testDate(22, 7, 5783, "Shmini Atzeret (Shabbat)");

// 4. Rosh Hashana I on Shabbat (1 Tishrei 5781) - Sep 19, 2020
testDate(1, 7, 5781, "Rosh Hashana I (Shabbat)");

// 5. Yom Kippur on Shabbat (10 Tishrei 5781) - Sep 28, 2020
testDate(10, 7, 5781, "Yom Kippur (Shabbat)");

// 6. Regular Shabbat
testDate(20, 8, 5786, "Regular Shabbat (20 Cheshvan 5786)");
