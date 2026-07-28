
import { HDate } from '@hebcal/core';
import { getDaysSinceAliyah } from './src/utils/hebrewDateUtils.js';

// Mock today as a Saturday (e.g., June 6, 2026 is Shabbat)
const mockToday = new Date('2026-06-06T12:00:00Z');
const hdToday = new HDate(mockToday);
console.log(`Mocking Today: ${hdToday.render('he')} (Day ${hdToday.getDay()})`);

// 1. Test Aliyah TODAY (Shabbat)
console.log("\n1. Test Aliyah TODAY (Shabbat):");
const days = getDaysSinceAliyah(hdToday);
console.log(`Days passed (expected 0): ${days}`);

// 2. Test Aliyah LAST SHABBAT (May 30, 2026)
console.log("\n2. Test Aliyah LAST SHABBAT (May 30, 2026):");
const hdLastSat = new HDate(new Date('2026-05-30T12:00:00Z'));
const daysLast = getDaysSinceAliyah(hdLastSat);
console.log(`Days passed (expected 7): ${daysLast}`);

// 3. Test Month Parsing for Adar
import { getHebrewMonthNumber } from './src/utils/hebrewDateUtils.js';
console.log("\n3. Testing Adar Parsing:");
console.log(`'אדר א' -> ${getHebrewMonthNumber("אדר א")}`);
console.log(`'אדר ב' -> ${getHebrewMonthNumber("אדר ב")}`);
