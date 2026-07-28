
import { HDate } from '@hebcal/core';
import { getUpcomingShabbatInfo, getHolidayInfo } from './src/utils/hebrewDateUtils.js';

// Mock Date to control "today"
const originalDate = global.Date;

function testDate(year, month, day, expectedName) {
    global.Date = class extends originalDate {
        constructor() {
            super(new originalDate(year, month - 1, day).getTime());
        }
    };
    
    // Clear cache if any
    // Note: hebrewDateUtils uses internal cache based on Date.toDateString()
    
    const info = getUpcomingShabbatInfo();
    console.log(`Test: Today is ${year}-${month}-${day}`);
    console.log(`Result: ${info.parasha} on ${info.shabbatDateFormatted}`);
    console.log(`Haftarah: ${info.haftarah}`);
    console.log('---');
}

console.log('Running Holiday Detection Tests...');

// 28 Elul 5786 -> Wed, Sept 9, 2026
testDate(2026, 9, 9, 'ראש השנה');

// 2 Tishrei 5787 -> Fri, Sept 11, 2026 (Rosh Hashana II, but our table only has I)
// Actually, Rosh Hashana is 1-2 Tishrei. The user only asked for 1 Tishrei.
// If today is 2 Tishrei, it should find Yom Kippur (10 Tishrei) if no Shabbat before.
// 2 Tishrei is Friday. Next Shabbat is 3 Tishrei (Ha'Azinu).
testDate(2026, 9, 11, "האזינו"); 

// 11 Tishrei 5787 -> Tue, Sept 22, 2026 -> Next is 15 Tishrei (Sukkot I)
testDate(2026, 9, 22, "א' סוכות");

// Shabbat Chol HaMoed Sukkot 5787
// Sukkot starts Sun, Sept 27 (15 Tishrei). 
// Shabbat is Oct 3 (21 Tishrei).
testDate(2026, 9, 30, 'שבת חוה"מ סוכות');

global.Date = originalDate;
