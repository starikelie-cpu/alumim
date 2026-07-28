
import { getShmitaYearStatus, getNextBirkatHaChama } from './src/utils/hebrewDateUtils.js';

console.log('--- Shmita Cycle Verification ---');
const years = [5782, 5783, 5784, 5785, 5786, 5787, 5788, 5789];
years.forEach(y => {
    console.log(`${y}: ${getShmitaYearStatus(y)}`);
});

console.log('\n--- Birkat HaChama Verification ---');
const currentYears = [5769, 5786, 5797, 5798];
currentYears.forEach(y => {
    console.log(`Current year ${y}, Next Birkat HaChama: ${getNextBirkatHaChama(y)}`);
});
