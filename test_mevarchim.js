import { HDate, HebrewCalendar, flags } from '@hebcal/core';

const testDate = new HDate(new Date('2026-02-14'));
const options = {
    start: testDate,
    end: testDate,
    mevarchim: true,
    sedrot: true,
    il: true
};

const events = HebrewCalendar.calendar(options);
events.forEach(e => {
    console.log(`Event: ${e.render('he')}, Desc: ${e.desc}, Flags: ${e.getFlags()}`);
});
