
import { calculateAliyahInfo } from './src/utils/hebrewDateUtils.js';
import { HDate } from '@hebcal/core';

// Test case 1: Shabbat Chol HaMoed Pesach 5786 (17 Nisan 5786)
// Saturday, April 4, 2026
const d1 = new Date(2026, 3, 4); // April is 3
console.log("Testing 17 Nisan 5786 (Shabbat Chol HaMoed Pesach):");
const res1 = calculateAliyahInfo(d1);
console.log("Result:", res1);

// Test case 2: Shabbat 1st day of Sukkot 5786 (15 Tishrei 5786)
// Saturday, September 27, 2025
const d2 = new Date(2025, 8, 27); // September is 8
console.log("\nTesting 15 Tishrei 5786 (Sukkot I on Shabbat):");
const res2 = calculateAliyahInfo(d2);
console.log("Result:", res2);

// Test case 3: Shabbat Chanukah 5786 (30 Kislev 5786)
// Saturday, December 20, 2025
const d3 = new Date(2025, 11, 20); // December is 11
console.log("\nTesting 30 Kislev 5786 (Shabbat Chanukah / Rosh Chodesh):");
const res3 = calculateAliyahInfo(d3);
console.log("Result:", res3);
