
import { HDate } from '@hebcal/core';

function testMonth13(year) {
    const isLeap = HDate.isLeapYear(year);
    console.log(`--- Year ${year} (Leap: ${isLeap}) ---`);
    try {
        const hd12 = new HDate(18, 12, year);
        console.log(`Month 12: ${hd12.render('en')} (${hd12.getMonth()})`);

        const hd13 = new HDate(18, 13, year);
        console.log(`Month 13: ${hd13.render('en')} (${hd13.getMonth()})`);
    } catch (e) {
        console.log(`Month 13: ERROR - ${e.message}`);
    }
    console.log('\n');
}

testMonth13(5784); // Leap
testMonth13(5786); // Regular
testMonth13(5787); // Leap

console.log('--- Difference check ---');
const hd1 = new HDate(18, 12, 5784);
const hd2 = new HDate(18, 12, 5786);
console.log(`Adar I 5784 abs: ${hd1.abs()}`);
console.log(`Adar 5786 abs: ${hd2.abs()}`);
