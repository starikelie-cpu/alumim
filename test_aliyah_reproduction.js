
import { translateParashaName, calculateAliyahInfo } from './src/utils/hebrewDateUtils.js';
import { HDate } from '@hebcal/core';

console.log("Testing translateParashaName:");
console.log(`- "פרשת Shmini Atzeret" -> "${translateParashaName("פרשת Shmini Atzeret")}"`);
console.log(`- "Shmini Atzeret" -> "${translateParashaName("Shmini Atzeret")}"`);
console.log(`- "Matot-Masei" -> "${translateParashaName("Matot-Masei")}"`);
console.log(`- "" -> "${translateParashaName("")}"`);
console.log(`- null -> "${translateParashaName(null)}"`);

console.log("\nTesting calculateAliyahInfo for problematic dates:");
// Try a date that might result in "No Parasha"
// How about a very old date?
const hdOld = new HDate(1, 1, 1);
console.log(`- 1/1/1 ->`, calculateAliyahInfo(hdOld).parasha);

// Try a holiday that might be tricky
const hdSukkot = new HDate(15, 7, 5786);
console.log(`- 15 Tishrei 5786 (Sukkot I) ->`, calculateAliyahInfo(hdSukkot).parasha);

const hdPesach = new HDate(15, 1, 5786);
console.log(`- 15 Nisan 5786 (Pesach I) ->`, calculateAliyahInfo(hdPesach).parasha);
