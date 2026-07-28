import { getUpcomingShabbatInfo } from './src/utils/hebrewDateUtils.js';

console.log('Testing getUpcomingShabbatInfo...\n');
const info = getUpcomingShabbatInfo();

console.log('Upcoming Shabbat Info:');
console.log('======================');
console.log('Parasha:', info.parasha);
console.log('Shabbat Date (full):', info.shabbatDate);
console.log('Shabbat Date (formatted):', info.shabbatDateFormatted);
console.log('Special Shabbat Type:', info.specialShabbatType || 'None');
console.log('Is Mevarchim:', info.isMevarchim);
if (info.isMevarchim) {
    console.log('Mevarchim Month:', info.month);
}
console.log('\nToday (formatted):', info.todayFormatted);
