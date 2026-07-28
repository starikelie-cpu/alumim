import { HDate, HebrewCalendar, flags } from '@hebcal/core';

function getMevarchimInfo(saturdayHDate) {
    // Check next 6 days for Rosh Chodesh
    const start = saturdayHDate.next();
    const end = saturdayHDate.add(6, 'd');

    const options = {
        start: start,
        end: end,
        roshChodesh: true,
        il: true
    };

    const events = HebrewCalendar.calendar(options);
    const rcEvent = events.find(e => e.getFlags() & flags.ROSH_CHODESH);

    if (rcEvent) {
        // Description is usually "Rosh Chodesh Adar I" or "Rosh Chodesh Nisan"
        // We want to extract the month name.
        let desc = rcEvent.render('he');
        let month = desc.replace('ראש חודש ', '').replace('א\' ', '').replace('ב\' ', '').trim();
        return { isMevarchim: true, month: month };
    }
    return { isMevarchim: false };
}

const testSaturday = new HDate(new Date('2026-02-14'));
console.log('Result for 2026-02-14:', getMevarchimInfo(testSaturday));

const normalSaturday = new HDate(new Date('2026-02-07'));
console.log('Result for 2026-02-07:', getMevarchimInfo(normalSaturday));
