
import { HDate } from '@hebcal/core';
import {
    calculateAliyahInfo,
    formatHebrewDateToTextual
} from './src/utils/hebrewDateUtils.js';

function simulateUpdate(originalDate) {
    console.log(`Original: "${originalDate}"`);

    // 1. Initial calculateAliyahInfo (when modal loads or date is picked)
    const aliyahInfo = calculateAliyahInfo(originalDate);
    const formattedForForm = aliyahInfo.formattedDate;
    console.log(`Formatted for Form: "${formattedForForm}"`);

    // 2. Simulate handleFinish (when user clicks Save)
    // aliyah_date: aliyahInfo.formattedDate
    const aliyahInfo2 = calculateAliyahInfo(formattedForForm);
    const savedDate = aliyahInfo2.formattedDate;
    console.log(`Saved Date: "${savedDate}"`);

    if (originalDate !== savedDate) {
        console.log(`CHANGE! "${originalDate}" -> "${savedDate}"`);
    } else {
        console.log("No change.");
    }
    console.log('\n');
}

console.log('--- Test 5784 (Leap Year) ---');
simulateUpdate('י"ח אדר א\' תשפ"ד');
simulateUpdate('י"ח אדר ב\' תשפ"ד');

console.log('--- Test 5787 (Leap Year) ---');
simulateUpdate('י"ח אדר א\' תשפ"ז');

console.log('--- Test 5786 (Non-Leap Year) ---');
simulateUpdate('י"ח אדר תשפ"ו');
