
import { HDate } from '@hebcal/core';

console.log('--- HDate.renderGematriya(true) Tests ---');

const dates = [
    new HDate(18, 12, 5784),
    new HDate(1, 1, 5785),
    new HDate(1, 7, 5786),
    new HDate(new Date())
];

dates.forEach(hd => {
    const rend = hd.renderGematriya(true);
    console.log(`Rendered: "${rend}"`);
    const parts = rend.split(' ');
    console.log(`Parts (length ${parts.length}): ${JSON.stringify(parts)}`);
});
