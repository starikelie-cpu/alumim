
import { HDate, HebrewCalendar } from '@hebcal/core';

function testY(deathDay, deathMonth, deathYear, targetYear) {
    const deathDate = new HDate(deathDay, deathMonth, deathYear);
    console.log(`Death: ${deathDate.render('en')} (${deathMonth}/${deathYear})`);

    // getYahrzeit(year, refDate)
    const yahrzeit = HebrewCalendar.getYahrzeit(targetYear, deathDate);
    console.log(`Yahrzeit in ${targetYear}: ${yahrzeit.render('en')} (${yahrzeit.getMonth()})`);
    console.log('---');
}

console.log('--- DEATH in ADAR (Non-Leap 5783) -> TARGET LEAP 5784 ---');
testY(18, 12, 5783, 5784);

console.log('--- DEATH in ADAR I (Leap 5784) -> TARGET NON-LEAP 5786 ---');
testY(18, 12, 5784, 5786);

console.log('--- DEATH in ADAR II (Leap 5784) -> TARGET NON-LEAP 5786 ---');
testY(18, 13, 5784, 5786);

console.log('--- DEATH in ADAR I (Leap 5784) -> TARGET LEAP 5787 ---');
testY(18, 12, 5784, 5787);

console.log('--- DEATH in ADAR II (Leap 5784) -> TARGET LEAP 5787 ---');
testY(18, 13, 5784, 5787);
