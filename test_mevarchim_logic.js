import { HDate } from '@hebcal/core';
import { getMevarchimInfo } from './src/utils/hebrewDateUtils.js';

// Test 2-day Rosh Chodesh (e.g. 27 Shevat 5786 / Feb 14 2026 -> Rosh Chodesh Adar on Tue & Wed)
const saturday2Days = new HDate(new Date('2026-02-14'));
console.log('Result for 2026-02-14 (2-day RC):', getMevarchimInfo(saturday2Days));

// Test 1-day Rosh Chodesh (e.g. 25 Adar 5786 / Mar 14 2026 -> Rosh Chodesh Nisan on Thu)
const saturday1Day = new HDate(new Date('2026-03-14'));
console.log('Result for 2026-03-14 (1-day RC):', getMevarchimInfo(saturday1Day));

// Test normal Saturday with no upcoming Rosh Chodesh
const normalSaturday = new HDate(new Date('2026-02-07'));
console.log('Result for 2026-02-07 (No RC):', getMevarchimInfo(normalSaturday));
