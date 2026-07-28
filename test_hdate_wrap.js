
import { HDate } from '@hebcal/core';

console.log('--- HDate Wrap Around Tests ---');

try {
    const d1 = new HDate(221, 0, 5763);
    console.log(`new HDate(221, 0, 5763) -> ${d1.render()} (Year: ${d1.getFullYear()}, Month: ${d1.getMonth()}, Day: ${d1.getDate()})`);
} catch (e) {
    console.log(`new HDate(221, 0, 5763) ERROR: ${e.message}`);
}

try {
    const d2 = new HDate(1, 0, 5763);
    console.log(`new HDate(1, 0, 5763) -> ${d2.render()} (Year: ${d2.getFullYear()}, Month: ${d2.getMonth()}, Day: ${d2.getDate()})`);
} catch (e) {
    console.log(`new HDate(1, 0, 5763) ERROR: ${e.message}`);
}
