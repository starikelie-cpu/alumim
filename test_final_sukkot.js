
import { calculateAliyahInfo } from './src/utils/hebrewDateUtils.js';
import { HDate } from '@hebcal/core';

const hd = new HDate(15, 7, 5784); // Sukkot I on Shabbat
console.log(`Testing ${hd.render()}:`);
const res = calculateAliyahInfo(hd);
console.log("Result:", res);
