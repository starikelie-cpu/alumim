
import { HDate } from '@hebcal/core';
import { calculateAliyahInfo, getHaftarahForParasha, getUpcomingShabbatInfo } from './src/utils/hebrewDateUtils.js';

function testDate(day, month, year) {
    const hd = new HDate(day, month, year);
    const info = calculateAliyahInfo(hd);
    const shabbatInfo = getUpcomingShabbatInfo(); // This tests today's relative info, but we care more about getHaftarahForParasha directly

    // For Haftarah, let's simulate what getUpcomingShabbatInfo does but for the specific date if it's shabbat
    let haftarah = '';
    if (hd.getDay() === 6) {
        // Extract parasha name from info.parasha (it might be combined "Parasha / Holiday")
        const parashaPart = info.parasha.split(' / ')[0].replace('פרשת ', '');
        // Special types would come from calendar events, but we'll test the helper with the date
        haftarah = getHaftarahForParasha(parashaPart, null, hd);
    }

    console.log(`Date: ${hd.render('he')} (${hd.getDay() === 6 ? 'Shabbat' : 'Weekday'})`);
    console.log(`Calculated Name: ${info.parasha}`);
    if (hd.getDay() === 6) {
        console.log(`Haftarah: ${haftarah}`);
    }
    console.log('-------------------');
}

console.log('--- Verification Tests ---');

// 1. Rosh Hashana Day 1 falling on Shabbat (1 Tishrei 5787)
testDate(1, 7, 5787);

// 2. Shabbat Rosh Chodesh (30 Av 5785 - Shabbat)
// Av is 5, 30 Av is first day of RC Elul.
testDate(30, 5, 5785);

// 3. Shabbat HaGadol (10 Nisan 5786 - Shabbat)
testDate(10, 1, 5786);

// 4. Weekday Holiday (Purim 14 Adar 5786 - Tuesday)
// 5786 is leap, so Adar is 12 (Adar I) or 13 (Adar II). Purim is in Adar II.
testDate(14, 13, 5786);

// 5. Pesach Day 1 Shabbat (15 Nisan 5781 - already passed but useful for test)
testDate(15, 1, 5781);
