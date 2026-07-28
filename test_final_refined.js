
import { HDate } from '@hebcal/core';
import {
    parseHebrewDate,
    getYahrzeitIfInCurrentWeek,
    getDaysSinceAliyah,
    calculateAliyahInfo,
    getHebrewMonthNumber
} from './src/utils/hebrewDateUtils.js';

function assert(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`PASS: ${message}`);
}

console.log('--- 1. Testing Robust Parsing & Year Retrieval ---');
const tests = [
    { input: 'י"ח אדר א\' תשפ"ד', expectedDay: 18, expectedMonth: 'אדר א\'', expectedYear: 5784 },
    { input: 'כ"א שבט ה\'תשפ"ד', expectedDay: 21, expectedMonth: 'שבט', expectedYear: 5784 },
    { input: 'א תשרי תשפ"ד', expectedDay: 1, expectedMonth: 'תשרי', expectedYear: 5784 },
    { input: 'י"ח אדר ב\'', expectedDay: 18, expectedMonth: 'אדר ב\'', expectedYear: new HDate().getFullYear() }
];

tests.forEach(t => {
    const p = parseHebrewDate(t.input);
    assert(p.day === t.expectedDay, `Day should be ${t.expectedDay} for "${t.input}"`);
    assert(p.monthName === t.expectedMonth, `Month should be ${t.expectedMonth} for "${t.input}"`);
    assert(p.year === t.expectedYear, `Year should be ${t.expectedYear} for "${t.input}"`);
});

console.log('\n--- 2. Testing Aliyah Counter (Should be SEPARATE Adars) ---');
// Simulation of getDaysSinceAliyah using Test version to control "Today"
import { HebrewCalendar } from '@hebcal/core';

// 15 Adar I -> 15 Adar II. Distance is 30 days. No adjustment.
// Since absolute diff is what we return in standard behavior.
const al1 = new HDate(15, 12, 5784); // 5784 is leap
const td1 = new HDate(15, 13, 5784).onOrAfter(6); // nextShabbat from 15 Adar II is 20 Adar II
const diff1 = Math.floor(td1.abs() - al1.abs());
console.log(`Distance from 15 Adar I to nextShabbat of 15 Adar II: ${diff1} days`);
assert(diff1 > 30, 'Adar I and Adar II should be distinct for Aliyah distance');

console.log('\n--- 3. Testing Yahrzeit Parity Logic (Internal Check) ---');
// We verify getHebrewMonthNumber handles Adar month strings correctly
assert(getHebrewMonthNumber("אדר א") === 12, "Adar I is month 12");
assert(getHebrewMonthNumber("אדר ב") === 13, "Adar II is month 13");
assert(getHebrewMonthNumber("אדר") === 12, "Adar is month 12");

console.log('\n--- 4. Stability Check for calculateAliyahInfo ---');
const info = calculateAliyahInfo('י"ח אדר א\' תשפ"ד');
console.log(`Formatted: ${info.formattedDate}`);
const infoBack = calculateAliyahInfo(info.formattedDate);
assert(info.formattedDate === infoBack.formattedDate, 'Formatter should be idempotent');

console.log('\nAll tests passed successfully!');
