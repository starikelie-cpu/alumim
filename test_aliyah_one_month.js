
import { HDate } from '@hebcal/core';

function getDaysSinceAliyahTest(aliyahHDate, todayHDate) {
    // nextShabbat(today)
    const nextShabbat = todayHDate.onOrAfter(6);
    let diff = Math.floor(nextShabbat.abs() - aliyahHDate.abs());

    const startAbs = aliyahHDate.abs();
    const endAbs = nextShabbat.abs();
    const startY = aliyahHDate.getFullYear();
    const endY = nextShabbat.getFullYear();

    for (let y = startY; y <= endY; y++) {
        if (HDate.isLeapYear(y)) {
            const adarIIStart = new HDate(1, 13, y).abs();
            if (startAbs < adarIIStart && endAbs >= adarIIStart) {
                diff -= 30;
            }
        }
    }
    return Math.max(0, diff);
}

function assert(condition, message) {
    if (!condition) throw new Error("Assertion failed: " + message);
    console.log("PASS: " + message);
}

console.log('--- Testing Aliyah "One Month" Logic (Revised) ---');

// Case 1: 15 Adar I 5784 -> Today is 15 Adar II 5784
// 15 Adar II 5784 is March 25 (Mon). nextShabbat is 20 Adar II (Sat).
// abs(20 Adar II) - abs(15 Adar I) = 738975 - 738940 = 35.
// Adjustment: 35 - 30 = 5.
const res1 = getDaysSinceAliyahTest(new HDate(15, 12, 5784), new HDate(15, 13, 5784));
assert(res1 === 5, "15 Adar I -> 15 Adar II (on 15 Adar II) should be 5 days until Shabbat");

// Case 2: 15 Shevat 5784 -> Today is 15 Adar II 5784
// abs(20 Adar II) - abs(15 Shevat) = 738975 - 738911 = 64.
// Adjustment: 64 - 30 = 34.
const res2 = getDaysSinceAliyahTest(new HDate(15, 11, 5784), new HDate(15, 13, 5784));
assert(res2 === 34, "15 Shevat -> 15 Adar II (on 15 Adar II) should be 34 days until Shabbat");

// Case 3: 15 Adar II 5784 -> Today is 18 Adar II 5784
// abs(20 Adar II) - abs(15 Adar II) = 5.
// Adjustment: No jump.
const res3 = getDaysSinceAliyahTest(new HDate(15, 13, 5784), new HDate(18, 13, 5784));
assert(res3 === 5, "Internal Adar II distance should be standard (5 days)");

console.log('All tests passed!');
