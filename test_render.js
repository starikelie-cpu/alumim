
import { HDate } from '@hebcal/core';

function testRender(day, month, year) {
    const hd = new HDate(day, month, year);
    const rend = hd.renderGematriya(true);
    console.log(`HDate(${day}, ${month}, ${year}) -> renderGematriya(true): "${rend}"`);
    const parts = rend.split(' ');
    console.log(`Parts:`, parts);
    console.log(`Year Part: "${parts[parts.length - 1]}"`);
}

console.log('--- ADAR I in Leap Year (5784) ---');
testRender(18, 12, 5784);

console.log('--- ADAR II in Leap Year (5784) ---');
testRender(18, 13, 5784);

console.log('--- ADAR in Non-Leap Year (5786) ---');
testRender(18, 12, 5786);

console.log('--- Other Month ---');
testRender(18, 11, 5786);
