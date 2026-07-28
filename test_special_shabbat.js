import { HDate, HebrewCalendar, flags } from '@hebcal/core';

console.log('Testing Special Shabbat Detection...\n');

// Test the next few weeks to find special Shabbatot
for (let i = 0; i < 8; i++) {
    const today = new HDate();
    const testDate = today.add(i * 7, 'd');
    const upcomingShabbat = testDate.onOrAfter(6);

    const options = { start: upcomingShabbat, end: upcomingShabbat, sedrot: true, il: true };
    const events = HebrewCalendar.calendar(options);

    console.log(`\n=== Week ${i + 1}: ${upcomingShabbat.render('he')} ===`);

    events.forEach(e => {
        const desc = e.render('he');
        const flagsVal = e.getFlags();
        console.log(`  - ${desc} (flags: ${flagsVal})`);
        console.log(`    Is Parasha: ${!!(flagsVal & flags.PARSHA_HASHAVUA)}`);
        console.log(`    Contains 'שבת': ${desc.includes('שבת')}`);
        console.log(`    Contains 'פרשת': ${desc.includes('פרשת')}`);
    });

    // Apply the filter
    const specialShabbatEvents = events.filter(e => {
        const desc = e.render('he');
        return desc.includes('שבת') && !desc.includes('פרשת');
    });

    if (specialShabbatEvents.length > 0) {
        console.log(`  ✓ SPECIAL SHABBAT FOUND: ${specialShabbatEvents[0].render('he')}`);
    } else {
        console.log(`  ✗ No special Shabbat`);
    }
}
