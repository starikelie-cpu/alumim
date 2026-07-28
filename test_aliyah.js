
import { HDate, HebrewCalendar, flags, getSedra } from '@hebcal/core';

// Mock function based on my implementation
function calculateAliyahInfo(hDate) {
    // 2. Find events on the specific date (Holiday/Rosh Chodesh)
    const dayOptions = {
        start: hDate,
        end: hDate,
        il: true,
        // isHebrewYear: true, // optimization - this might be causing issues if start/end are used?
        sedrot: true
    };
    const dayEvents = HebrewCalendar.calendar(dayOptions);

    // Priority: Major Holiday > Minor Holiday > Rosh Chodesh > Weekly Parasha (if on Shabbat)
    const interestingEvents = dayEvents.filter(e => {
        const f = e.getFlags();
        return (f & flags.MAJOR_HOLIDAY) || (f & flags.MINOR_HOLIDAY) || (f & flags.ROSH_CHODESH) || (f & flags.SPECIAL_SHABBAT);
    });

    let eventName = "";
    if (interestingEvents.length > 0) {
        eventName = interestingEvents.map(e => e.render('he')).join(' / ');
    }

    let parashaName = "";
    const saturday = hDate.onOrAfter(6);
    const satOptions = {
        start: saturday,
        end: saturday,
        sedrot: true,
        il: true
    };
    const satEvents = HebrewCalendar.calendar(satOptions);
    const parashaEvent = satEvents.find(e => e.getFlags() & flags.PARSHA_HASHAVUA);

    if (parashaEvent) {
        parashaName = parashaEvent.render('he').replace("פרשת ", "");
    } else {
        const sedra = getSedra(hDate.getFullYear(), true);
        const lookup = sedra.lookup(hDate);
        if (lookup && lookup.parsha) {
            parashaName = lookup.parsha.join('-');
        }
    }

    let finalName = parashaName;
    if (interestingEvents.length > 0) {
        finalName = eventName;
    } else {
        finalName = parashaName || "לא נמצאה פרשה";
    }

    return finalName;
}

// Test Cases
const year = new HDate().getFullYear();

// 1. Chanukah (should show Chanukah)
// 25 Kislev
const chanukah = new HDate(25, 9, year);
console.log(`Date: ${chanukah.render()}, Expected: Chanukah, Got: ${calculateAliyahInfo(chanukah)}`);

// 2. Regular Weekday (should show upcoming Parasha)
// 1 Cheshvan (Rosh Chodesh) - Should show Rosh Chodesh
const roshChodesh = new HDate(1, 8, year);
console.log(`Date: ${roshChodesh.render()}, Expected: Rosh Chodesh Cheshvan, Got: ${calculateAliyahInfo(roshChodesh)}`);

// 3. Regular Weekday non-holiday (should show Parasha)
// 5 Cheshvan
const regular = new HDate(5, 8, year);
console.log(`Date: ${regular.render()}, Expected: Parasha..., Got: ${calculateAliyahInfo(regular)}`);

// 4. Purim
const purim = new HDate(14, 12, year); // Adar or Adar II if leap
console.log(`Date: ${purim.render()}, Expected: Purim, Got: ${calculateAliyahInfo(purim)}`);
