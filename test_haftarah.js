import { HebrewCalendar, HDate, flags } from '@hebcal/core';

const today = new HDate();
const upcomingShabbat = today.onOrAfter(6);

const options = {
    start: upcomingShabbat,
    end: upcomingShabbat,
    sedrot: true,
    leyning: true,
    il: true
};

const events = HebrewCalendar.calendar(options);
for (const ev of events) {
    console.log('Event:', ev.getDesc(), 'Flags:', ev.getFlags());
    if (ev.getFlags() & flags.PARSHA_HASHAVUA) {
        console.log('Parasha:', ev.render('he'));
        // Check if there's any additional info in properties
        console.log('Props:', ev.p);
    }
}
