
import { HDate, months } from '@hebcal/core';

function testSorting() {
    console.log('Testing Hebrew Date Sorting Logic...');

    const upcomingMemorials = [
        { name: 'Person A', date: 'ב\' בשבט', absDate: new HDate(2, months.SHVAT, 5786).abs() },
        { name: 'Person B', date: 'כ"ה בטבת', absDate: new HDate(25, months.TEVET, 5786).abs() },
        { name: 'Person C', date: 'י"ח בטבת', absDate: new HDate(18, months.TEVET, 5786).abs() },
        { name: 'Person D', date: 'א\' בניסן', absDate: new HDate(1, months.NISAN, 5786).abs() }
    ];

    console.log('Before sorting:');
    upcomingMemorials.forEach(m => console.log(`- ${m.name}: ${m.date} (abs: ${m.absDate})`));

    upcomingMemorials.sort((a, b) => a.absDate - b.absDate);

    console.log('\nAfter sorting:');
    upcomingMemorials.forEach(m => console.log(`- ${m.name}: ${m.date} (abs: ${m.absDate})`));

    const sortedNames = upcomingMemorials.map(m => m.name);
    const expectedNames = ['Person C', 'Person B', 'Person A', 'Person D'];

    if (JSON.stringify(sortedNames) === JSON.stringify(expectedNames)) {
        console.log('\n✅ Sorting verified successfully!');
    } else {
        console.log('\n❌ Sorting FAILED!');
        process.exit(1);
    }
}

testSorting();
