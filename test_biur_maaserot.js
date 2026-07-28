
import { HDate } from '@hebcal/core';
import { getUpcomingShabbatInfo } from './src/utils/hebrewDateUtils.js';

const originalDate = global.Date;

function testDate(year, month, day) {
    const mockDate = new originalDate(year, month - 1, day);
    global.Date = class extends originalDate {
        constructor(arg) {
            if (arg !== undefined) return new originalDate(arg);
            return mockDate;
        }
    };
    
    // Clear cache if any
    try {
        const info = getUpcomingShabbatInfo();
        const hd = new HDate(mockDate);
        console.log(`Test: Today is ${year}-${month}-${day} (Hebrew Year: ${hd.getFullYear()}, Remainder: ${hd.getFullYear() % 7})`);
        console.log(`Day: ${info.parasha} on ${info.shabbatDateFormatted}`);
        console.log(`Is Biur Maaserot: ${info.isBiurMaaserot}`);
    } catch(e) {
        console.error(e);
    }
    console.log('---');
}

console.log('Running Biur Maaserot Tests...');

// 21 Nisan 5788 (Remainder 3) - Should NOT show
testDate(2028, 4, 26);

// 21 Nisan 5789 (Remainder 4) - Should show
testDate(2029, 4, 5);

// 21 Nisan 5792 (Remainder 0) - Should show
testDate(2032, 4, 28);

global.Date = originalDate;
