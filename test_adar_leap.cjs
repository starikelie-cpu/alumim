const { HDate } = require('@hebcal/core');

const year = 5784; // Leap year
const month12 = 12; // Adar I
const month13 = 13; // Adar II

const hd1 = new HDate(15, month12, year);
const hd2 = new HDate(15, month13, year);

console.log('Adar I:', hd1.renderGematriya(true));
console.log('Adar II:', hd2.renderGematriya(true));

const rend1 = hd1.renderGematriya(true).split(' ');
const monthName1 = rend1.slice(1, -1).join(' ').replace(/^ב/, '');
console.log('Processed Adar I Month:', monthName1);

const rend2 = hd2.renderGematriya(true).split(' ');
const monthName2 = rend2.slice(1, -1).join(' ').replace(/^ב/, '');
console.log('Processed Adar II Month:', monthName2);

const regularYear = 5783; // Regular year
const hdRegular = new HDate(15, 12, regularYear);
console.log('Regular Adar:', hdRegular.renderGematriya(true));
const rendRegular = hdRegular.renderGematriya(true).split(' ');
const monthNameRegular = rendRegular.slice(1, -1).join(' ').replace(/^ב/, '');
console.log('Processed Regular Adar Month:', monthNameRegular);
