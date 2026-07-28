import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { getHolidayInfo, getSingleDayInfo } from './src/utils/hebrewDateUtils.js';

function getUpcomingShabbatInfoTest(today) {
    const nextShabbat = today.onOrAfter(6);

    const daysToPrint = [];

    // Logic from the updated function
    let checkDate = today;
    while (checkDate.abs() < nextShabbat.abs()) {
        const holiday = getHolidayInfo(checkDate);
        if (holiday) {
            daysToPrint.push(getSingleDayInfo(checkDate, holiday.name));
        }
        checkDate = checkDate.next();
    }

    // Always include Shabbat itself
    const shabbatInfo = getSingleDayInfo(nextShabbat);
    daysToPrint.push(shabbatInfo);

    // Filter out duplicates
    const uniqueDays = [];
    const seenAbs = new Set();
    for (const d of daysToPrint) {
        if (!seenAbs.has(d.date.abs())) {
            uniqueDays.push(d);
            seenAbs.add(d.date.abs());
        }
    }

    return uniqueDays;
}

function runTest(name, today) {
    console.log(`\n--- Test: ${name} ---`);
    console.log(`Today: ${today.render('he')} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()]})`);
    const results = getUpcomingShabbatInfoTest(today);
    console.log('Days to print:');
    results.forEach(r => {
        console.log(`  - ${r.date.render('he')}: ${r.parasha}`);
    });
}

// Scenario 1: Shavuot 5786 (Friday)
// Today is Thursday (5 Sivan 5786)
runTest('Shavuot on Friday (Print on Thursday)', new HDate(5, 3, 5786));

// Scenario 2: Rosh Hashana 5786 (Thursday-Friday)
// Today is Wednesday (29 Elul 5785)
runTest('Rosh Hashana on Thu-Fri (Print on Wed)', new HDate(29, 6, 5785));

// Scenario 3: Rosh Hashana 5786 (Thursday-Friday)
// Today is Thursday (1 Tishrei 5786)
runTest('Rosh Hashana on Thu-Fri (Print on Thu)', new HDate(1, 7, 5786));

// Scenario 4: Regular Week
// Today is Wednesday
runTest('Regular Week', new HDate(10, 8, 5786)); // 10 Cheshvan
