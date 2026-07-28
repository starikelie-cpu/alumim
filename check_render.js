import { HDate } from '@hebcal/core';
const hd = new HDate(15, 1, 5784);
console.log('false, false:', hd.renderGematriya(false, false));
console.log('true, false:', hd.renderGematriya(true, false));
console.log('false, true:', hd.renderGematriya(false, true));
console.log('true, true:', hd.renderGematriya(true, true));
