
import { HDate, getSedra } from '@hebcal/core';

function testSedra(day, month, year) {
    const hd = new HDate(day, month, year);
    const sedra = getSedra(year, true);
    const lookup = sedra.lookup(hd);
    console.log(`Sedra for ${hd.render()}:`, lookup ? lookup.parsha : "null");
}

testSedra(15, 7, 5784); // Sukkot I
testSedra(21, 1, 5782); // Pesach VII
testSedra(1, 1, 5782); // Nisan 1
testSedra(15, 1, 5782); // Pesach I
