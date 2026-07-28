import { HDate } from '@hebcal/core';

// Replicating the logic from hebrewDateUtils.js for test
function getYahrzeitInfo(deathDay, deathMonthName, deathYear, targetYear) {
    const isTargetLeap = HDate.isLeapYear(targetYear);
    const isDeathLeap = HDate.isLeapYear(deathYear);

    let monthNum = 12;
    if (deathMonthName.includes('ב')) monthNum = 13;
    else if (deathMonthName.includes('א')) monthNum = 12;

    let targetMonth = monthNum;
    let isRegularAdar = false;

    if (isTargetLeap) {
        if (monthNum === 12 || monthNum === 13) {
            if (!isDeathLeap) {
                targetMonth = 13;
                isRegularAdar = true;
            } else if (deathMonthName === 'אדר') {
                targetMonth = 13;
                isRegularAdar = true;
            }
        }
    } else {
        if (monthNum === 12 || monthNum === 13) targetMonth = 12;
    }

    return { targetMonth, isRegularAdar };
}

function formatWithLabel(hd, isRegularAdar) {
    let formatted = hd.renderGematriya(true, true);

    if (isRegularAdar && HDate.isLeapYear(hd.getFullYear())) {
        // New requirement: replace "אדר ב׳" with "אדר"
        formatted = formatted.replace(/אדר ב׳$/, 'אדר');
    }
    return formatted;
}

console.log('--- Case 1: Regular Adar death (5783) -> Leap year Yahrzeit (5784) ---');
const info1 = getYahrzeitInfo(15, 'אדר', 5783, 5784);
const hd1 = new HDate(15, info1.targetMonth, 5784);
console.log('Is Regular Adar:', info1.isRegularAdar);
console.log('Output Label (Expected "ט״ו אדר"):', formatWithLabel(hd1, info1.isRegularAdar));

console.log('--- Case 2: Adar I death (5784) -> Leap year Yahrzeit (5787) ---');
const info2 = getYahrzeitInfo(15, 'אדר א׳', 5784, 5787);
const hd2 = new HDate(15, info2.targetMonth, 5787);
console.log('Output Label (Expected "ט״ו אדר א׳"):', formatWithLabel(hd2, info2.isRegularAdar));

console.log('--- Case 3: Adar II death (5784) -> Leap year Yahrzeit (5787) ---');
const info3 = getYahrzeitInfo(15, 'אדר ב׳', 5784, 5787);
const hd3 = new HDate(15, info3.targetMonth, 5787);
console.log('Output Label (Expected "ט״ו אדר ב׳"):', formatWithLabel(hd3, info3.isRegularAdar));
