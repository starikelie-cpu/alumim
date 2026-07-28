
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { calculateAliyahInfo, getYahrzeitIfInCurrentWeek, getHebrewMonthNumber } from './src/utils/hebrewDateUtils.js';

function testFullCycle(dateStr) {
    console.log(`--- Testing Cycle for: "${dateStr}" ---`);
    const info = calculateAliyahInfo(dateStr);
    console.log(`Aliyah Info:`, info);

    // Simulate display in list
    const yWeek = getYahrzeitIfInCurrentWeek(dateStr);
    console.log(`Yahrzeit this week:`, yWeek ? yWeek.render('he') : 'No');
}

console.log('--- Case: Adar I 5784 ---');
testFullCycle('י"ח אדר א\' תשפ"ד');

console.log('--- Case: Adar II 5784 ---');
testFullCycle('י"ח אדר ב\' תשפ"ד');

console.log('--- Case: Adar 5786 (Non-Leap) ---');
testFullCycle('י"ח אדר תשפ"ו');

console.log('--- Custom check: getHebrewMonthNumber ---');
console.log(`"אדר א'": ${getHebrewMonthNumber("אדר א'")}`);
console.log(`"אדר ב'": ${getHebrewMonthNumber("אדר ב'")}`);
console.log(`"אדר א": ${getHebrewMonthNumber("אדר א")}`);
console.log(`"אדר ב": ${getHebrewMonthNumber("אדר ב")}`);
console.log(`"אדר": ${getHebrewMonthNumber("אדר")}`);
