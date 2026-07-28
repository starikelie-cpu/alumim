import { HDate, gematriya, months, HebrewCalendar, flags, getSedra } from '@hebcal/core';

const UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];

const GEMATRIA_VALUES = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
};

/**
 * Convert number (1-30) to Hebrew Gematria day
 */
export function dayToGematria(num) {
    if (num === 15) return 'טו';
    if (num === 16) return 'טז';

    let res = '';
    const tens = Math.floor(num / 10);
    const units = num % 10;

    res += TENS[tens];
    res += UNITS[units];

    if (res.length > 1) return res.slice(0, -1) + '"' + res.slice(-1);
    return res + "'";
}

/**
 * Convert year number (e.g., 5786) to Hebrew Gematria
 */
export function yearToGematria(y) {
    let num = parseInt(y);
    if (isNaN(num)) return y;
    if (num >= 5000) num -= 5000;

    let res = '';
    const th = Math.floor(num / 400);
    for (let i = 0; i < th; i++) res += 'ת';
    num %= 400;

    if (num >= 300) { res += 'ש'; num -= 300; }
    if (num >= 200) { res += 'ר'; num -= 200; }
    if (num >= 100) { res += 'ק'; num -= 100; }

    const remainder = num;
    if (remainder === 15) {
        res += 'טו';
    } else if (remainder === 16) {
        res += 'טז';
    } else {
        res += TENS[Math.floor(num / 10)];
        res += UNITS[num % 10];
    }

    if (res.length > 1) return res.slice(0, -1) + '"' + res.slice(-1);
    return res + "'";
}

/**
 * Returns Shmita/Maaser status for a Hebrew year
 */
export function getShmitaYearStatus(year) {
    const y = parseInt(year);
    if (isNaN(y)) return '';
    const remainder = y % 7;

    let yearName = '';
    const gematriyaYears = ['', "א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"];
    const yearNum = remainder === 0 ? 7 : remainder;
    yearName = `שנה ${gematriyaYears[yearNum]}`;

    if (remainder === 0) return `${yearName} - שנת שמיטה`;
    if (remainder === 3 || remainder === 6) return `${yearName} - שנת מעשר עני`;
    return `${yearName} - שנת מעשר שני`;
}

/**
 * Calculates the next Birkat HaChama date
 */
export function getNextBirkatHaChama(currentYear) {
    let year = currentYear;
    // Birkat HaChama occurs when (year % 28 === 1)
    while (year % 28 !== 1) {
        year++;
    }

    // The date is always Tekufat Nisan (Shmuel), which corresponds to 
    // April 8 (Gregorian) during the years 1901-2099.
    // Let's create a date for April 8 of the Gregorian year corresponding to this Hebrew year.
    // A Hebrew year Y starts in Gregorian year Y-3761 (roughly).
    // Specifically, Tekufat Nisan of Year Y is in the spring of Gregorian year Y-3760.
    const gregYear = year - 3760;
    const birkatDate = new Date(gregYear, 3, 8); // April 8
    const hd = new HDate(birkatDate);

    return hd.renderGematriya(true);
}

/**
 * Gematria / Letter to Number conversion for days
 */
export function gematriaToNum(str) {
    if (!str) return 0;
    let clean = str.replace(/["'״׳]/g, '');

    // Handle thousands prefix (e.g., ה'תשפ"ד)
    let thousands = 0;
    if (clean.length > 3 && (clean.startsWith('ה') || clean.startsWith('ו'))) {
        // Thousands digit in Hebrew years (usually 'ה' for 5000)
        // If it's a long string like 'התשפד', the first char might be 5000
        const firstChar = clean[0];
        if (firstChar === 'ה') {
            thousands = 5000;
            clean = clean.substring(1);
        }
    }

    let num = 0;
    for (const char of clean) {
        num += GEMATRIA_VALUES[char] || 0;
    }
    return num + thousands;
}

/**
 * Normalizes Hebrew strings for comparison (quotes, spaces, etc.)
 */
export function normalizeHebrewString(str) {
    if (!str) return '';
    return str.trim()
        .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew vowels and cantillation marks
        .replace(/[״״""״״]/g, '"') // Normalize double quotes (variants)
        .replace(/[׳'׳'׳׳]/g, "'") // Normalize single quotes/geresh
        .replace(/\u200F/g, '') // Remove RTL mark
        .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Parses any Hebrew date string (Numeric or Gematria) into parts
 */
export function parseHebrewDate(str) {
    if (!str || typeof str !== 'string') return null;

    const normalized = normalizeHebrewString(str);

    // Check for DD/MM/YYYY format
    const numericMatch = normalized.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})$/);
    if (numericMatch) {
        let year = parseInt(numericMatch[3]);
        if (year > 0 && year < 100) year += 5700;
        else if (year > 0 && year < 1000) year += 5000;
        return {
            day: parseInt(numericMatch[1]),
            monthName: numericMatch[2],
            year: year
        };
    }

    // Check for DD/MM/YYYY or DD/MMMM/YYYY format with slashes
    if (normalized.includes('/')) {
        const parts = normalized.split('/');
        if (parts.length === 3) {
            const day = isNaN(parseInt(parts[0])) ? gematriaToNum(parts[0]) : parseInt(parts[0]);
            let year = isNaN(parseInt(parts[2])) ? gematriaToNum(parts[2]) : parseInt(parts[2]);
            if (year > 0 && year < 1000) year += 5000;

            // Alignment starting from Tishrei (Civil numbering)
            // If it's numeric month and year looks like Hebrew, map 1->7 (Tishrei)
            let monthName = parts[1];
            let hMonth = getHebrewMonthNumber(monthName, year);
            return { day, month: hMonth, year };
        }
    }

    const parts = normalized.split(/\s+/);
    if (parts.length < 2) return null;

    // Identify Year - search from the end for something that looks like a year
    let year = null;
    let yearIndex = -1;

    for (let i = parts.length - 1; i >= 1; i--) {
        const part = parts[i];
        const numPart = parseInt(part.replace(/[^0-9]/g, ''));
        if (!isNaN(numPart) && numPart > 5000 && numPart < 6000) {
            year = numPart;
            yearIndex = i;
            break;
        }
        if (!isNaN(numPart) && numPart > 700 && numPart < 900) {
            year = numPart + 5000;
            yearIndex = i;
            break;
        }
        if (!isNaN(numPart) && numPart > 70 && numPart < 90) {
            year = numPart + 5700;
            yearIndex = i;
            break;
        }
        if (part.length >= 2) {
            const gNum = gematriaToNum(part);
            if (gNum >= 5700 && gNum < 5900) {
                year = gNum;
                yearIndex = i;
                break;
            }
            if (gNum > 700 && gNum < 900) {
                year = gNum + 5000;
                yearIndex = i;
                break;
            }
            if (gNum >= 70 && gNum < 95) {
                year = gNum + 5700;
                yearIndex = i;
                break;
            }
        }
    }

    // Identify Day - usually the first part
    let firstPart = parts[0];
    let day = 1; // Default to 1 if not clearly a day
    let monthStartIndex = 0;

    const dayNum = isNaN(parseInt(firstPart)) ? gematriaToNum(firstPart) : parseInt(firstPart);

    // If first part is a known month name, it's not a day
    const isMonth = !!HEBREW_MONTH_MAP[normalizeHebrewString(firstPart).replace(/['"]/g, '')];

    if (dayNum > 0 && dayNum <= 31 && !isMonth) {
        day = dayNum;
        monthStartIndex = 1;
    } else {
        // Day might be missing or it's a month name
        day = 1;
        monthStartIndex = 0;
    }

    // Month is everything between day and year
    let monthName = '';
    if (yearIndex !== -1) {
        monthName = parts.slice(monthStartIndex, yearIndex).join(' ');
    } else {
        monthName = parts.slice(monthStartIndex).join(' ');
        year = new HDate().getFullYear();
    }

    return { day, monthName: monthName.trim(), year };
}

/**
 * Get Hebrew parts from Date object using HDate
 */
export function getIntlHebrewParts(date) {
    const hd = new HDate(date);
    const day = hd.getDate();
    const month = hd.getMonth();
    const year = hd.getFullYear();
    const isLeap = hd.isLeapYear();

    let monthName = '';
    const map = {
        7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט',
        1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול'
    };

    if (month === 12) {
        monthName = isLeap ? "אדר א'" : "אדר";
    } else if (month === 13) {
        monthName = "אדר ב'";
    } else {
        monthName = map[month] || '';
    }

    return {
        day,
        month,
        monthName: normalizeHebrewString(monthName),
        year: year,
        dayGematria: dayToGematria(day),
        yearGematria: yearToGematria(year),
        fullHDate: hd.renderGematriya()
    };
}

/**
 * Find Gregorian Date from Hebrew Parts using HDate
 */
export function findGregorianDate(day, month, year) {
    try {
        const monthNum = typeof month === 'number' ? month : getHebrewMonthNumber(month);
        if (!monthNum) {
            console.warn(`[hebrewDateUtils] Month not found: ${month}`);
            return null;
        }

        const hd = new HDate(day, monthNum, year);
        return hd.greg();
    } catch (e) {
        console.error('Error in findGregorianDate:', e);
        return null;
    }
}
const HEBREW_MONTH_MAP = {
    'תשרי': months.TISHREI,
    'חשון': months.CHESHVAN,
    'חשוון': months.CHESHVAN,
    'כסלו': months.KISLEV,
    'טבת': months.TEVET,
    'שבט': months.SHVAT,
    'אדר': months.ADAR_I,
    'אדרא': months.ADAR_I,
    'אדראדר': months.ADAR_I,
    'אדרב': months.ADAR_II,
    'אדר1': months.ADAR_I,
    'אדר2': months.ADAR_II,
    'אדר א': months.ADAR_I,
    'אדר ב': months.ADAR_II,
    'אדרא\'': months.ADAR_I,
    'אדרב\'': months.ADAR_II,
    'אדר א\'': months.ADAR_I,
    'אדר ב\'': months.ADAR_II,
    'ניסן': months.NISAN,
    'אייר': months.IYYAR,
    'סיוון': months.SIVAN,
    'תמוז': months.TAMUZ,
    'אב': months.AV,
    'אלול': months.ELUL
};

export function getHebrewMonthNumber(name, hYear) {
    if (!name) return 0;
    if (typeof name === 'number') return name;

    const normalized = normalizeHebrewString(name).replace(/['"]/g, '');

    // If it's a numeric string, handle "Tishrei=1" alignment
    const numValue = parseInt(normalized);
    if (!isNaN(numValue) && !normalized.includes(' ')) {
        const yr = hYear || new HDate().getFullYear();
        const isLeap = HDate.isLeapYear(yr);
        const map = isLeap ?
            [0, 7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6] :
            [0, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
        if (numValue >= 1 && numValue < map.length) return map[numValue];
        return numValue;
    }

    let month = HEBREW_MONTH_MAP[normalized];
    if (!month) {
        // Try removing prefix 'ב' (e.g., 'בניסן' -> 'ניסן')
        const noBet = normalized.replace(/^ב/, '');
        month = HEBREW_MONTH_MAP[noBet];
    }

    // Additional check for common variations if still not found
    if (!month) {
        if (normalized.includes('אדר א')) return months.ADAR_I;
        if (normalized.includes('אדר ב')) return months.ADAR_II;
    }

    return month || 0;
}

/**
 * Inverse mapping: Hebcal Month -> Tishrei-aligned index
 */
export function getTishreiAlignedMonthIndex(hMonth, hYear) {
    const yr = hYear || new HDate().getFullYear();
    const isLeap = HDate.isLeapYear(yr);
    const map = isLeap ?
        [0, 7, 8, 9, 10, 11, 12, 13, 1, 2, 3, 4, 5, 6] :
        [0, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

    const index = map.indexOf(hMonth);
    return index === -1 ? hMonth : index;
}

export function formatHebrewDateToNumeric(dateStr) {
    const parts = parseHebrewDate(dateStr);
    if (!parts) return dateStr;

    const { day, monthName, year } = parts;
    const hMonth = getHebrewMonthNumber(monthName || parts.month, year);

    if (!day || !hMonth || !year) return dateStr;

    // Use Tishrei-aligned index for numeric export
    const userMonth = getTishreiAlignedMonthIndex(hMonth, year);

    const dd = String(day).padStart(2, '0');
    const mm = String(userMonth).padStart(2, '0');
    return `${dd}/${mm}/${year}`;
}

/**
 * Format Hebrew date to traditional textual string: "י"ח בכסלו תשפ"ו"
 */
export function formatHebrewDateToTextual(dateStr, showRegularLabel = false) {
    if (!dateStr) return '';
    try {
        const parts = parseHebrewDate(dateStr);
        if (!parts) return dateStr;

        const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);
        if (!monthNum) return dateStr;

        const hd = new HDate(parts.day, monthNum, parts.year);
        const rend = hd.renderGematriya(true).split(' ');

        if (rend.length < 3) return hd.renderGematriya(true);

        const dayGem = rend[0];
        const yearGem = rend[rend.length - 1];
        let monthName = rend.slice(1, -1).join(' ').replace(/^ב/, '');

        // If it's Adar in a regular year and we want to show it, or if it's month 12/13 and year is not leap
        const isLeapYear = HDate.isLeapYear(parts.year);
        if (showRegularLabel && !isLeapYear && (monthNum === 12 || monthNum === 13)) {
            monthName = "אדר";
        }

        return `${dayGem} ${monthName} ${yearGem}`;
    } catch (e) {
        console.error("Error in formatHebrewDateToTextual:", e);
        return dateStr;
    }
}

let cachedShabbat = null;
let cachedShabbatDateStr = "";
const daysSinceAliyahCache = new Map();

/**
 * Calculates days passed from Aliyah date until the upcoming Shabbat relative to TODAY
 * Based on user snippet logic
 */
export function getDaysSinceAliyah(aliyahDate) {
    if (!aliyahDate) return null;

    const today = new Date();
    const todayDateString = today.toDateString();

    // Clear cache if day changed
    if (cachedShabbatDateStr !== todayDateString) {
        cachedShabbatDateStr = todayDateString;
        const todayHDate = new HDate(today);
        // Using onOrAfter(6) ensures that if today IS Shabbat, we consider it the CURRENT cycle (0 days passed if Aliyah was today)
        // instead of jumping to the NEXT Shabbat.
        cachedShabbat = todayHDate.onOrAfter(6);
        daysSinceAliyahCache.clear();
    }

    // Use string representation for cache key
    let cacheKey = null;
    if (typeof aliyahDate === 'string') {
        cacheKey = aliyahDate;
    } else if (aliyahDate instanceof Date) {
        cacheKey = aliyahDate.getTime().toString();
    } else if (aliyahDate instanceof HDate) {
        cacheKey = aliyahDate.abs().toString();
    }

    if (cacheKey && daysSinceAliyahCache.has(cacheKey)) {
        return daysSinceAliyahCache.get(cacheKey);
    }

    try {
        let hdAliyah;
        if (aliyahDate instanceof HDate) {
            hdAliyah = aliyahDate;
        } else if (aliyahDate instanceof Date) {
            hdAliyah = new HDate(aliyahDate);
        } else {
            const parts = parseHebrewDate(aliyahDate);
            if (!parts) {
                if (cacheKey) daysSinceAliyahCache.set(cacheKey, null);
                return null;
            }
            const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);
            hdAliyah = new HDate(parts.day, monthNum, parts.year);
        }

        const days = Math.floor(cachedShabbat.abs() - hdAliyah.abs());

        if (cacheKey) {
            daysSinceAliyahCache.set(cacheKey, days);
        }

        return days;
    } catch (e) {
        console.error("Error in getDaysSinceAliyah:", e);
        return null;
    }
}

/**
 * Calculates Aliyah Parasha and days passed until next Shabbat
 * Based on user snippet logic
 */
export function calculateAliyahInfo(aliyahDateInput) {
    if (!aliyahDateInput) return { parasha: '', days_since_aliyah: null, formattedDate: '' };

    try {
        let hDate;
        if (aliyahDateInput instanceof HDate) {
            hDate = aliyahDateInput;
        } else if (aliyahDateInput instanceof Date) {
            hDate = new HDate(aliyahDateInput);
        } else {
            const parts = parseHebrewDate(aliyahDateInput);
            if (!parts) return { parasha: '', days_since_aliyah: null, formattedDate: aliyahDateInput };
            const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);
            hDate = new HDate(parts.day, monthNum, parts.year);
        }

        // 1. Create format: י"ח/כסלו/תשפ"ו
        // Using renderGematriya(true) to avoid vowels
        const rend = hDate.renderGematriya(true).split(' ');
        const dayGem = rend[0];
        const yearGem = rend[rend.length - 1];
        const monthName = rend.slice(1, -1).join(' ').replace(/^ב/, '');
        const formattedDate = `${dayGem} ${monthName} ${yearGem}`;

        // 2. Find events on the specific date (Holiday/Rosh Chodesh)
        const dayOptions = {
            start: hDate,
            end: hDate,
            il: true,
            sedrot: true
        };
        const dayEvents = HebrewCalendar.calendar(dayOptions);

        let eventName = "";
        // Priority: Major Holiday, Minor Holiday, Fast Days, Rosh Chodesh, Special Shabbat
        // Priority: Major Holiday, Minor Holiday, Fast Days, Rosh Chodesh, Special Shabbat
        const interestingEvents = dayEvents.filter(e => {
            const f = e.getFlags();
            const d = e.getDesc();

            // Filter out unwanted technical events
            if (f & (flags.DAF_YOMI | flags.OMER_COUNT | flags.HEBREW_DATE | flags.MOLAD)) return false;

            // Filter out time-based purely informative events
            if (d === 'Candle lighting' || d === 'Havdalah' || d.startsWith('Chanukah: ')) return false;

            // Filter out Parasha (we handle that separately)
            if (f & flags.PARSHA_HASHAVUA) return false;

            return true;
        });

        if (interestingEvents.length > 0) {
            // Join multiple events if they happen on the same day (e.g. "Rosh Chodesh Tevet", "Chanukah")
            eventName = interestingEvents.map(e => e.render('he')).join(' / ');
        }

        // Handle Chanukah separately if it was filtered out by description but we want it
        const chanukahEvent = dayEvents.find(e => e.getFlags() & flags.CHANUKAH_CANDLES);
        if (chanukahEvent && !interestingEvents.includes(chanukahEvent)) {
            const hStr = "חנוכה";
            eventName = eventName ? `${eventName} / ${hStr}` : hStr;
        }

        // 3. Find Parasha (find Shabbat of that week) if no specific holiday, or append it?
        // User asked "Add the Holiday OR Parasha". Usually if it's a holiday, that's what we want.
        // If it's a regular weekday, we often want the upcoming Parasha.
        // If it IS Shabbat, we want the Parasha (and maybe special Shabbat name).

        let parashaName = "";
        const saturday = hDate.onOrAfter(6);
        const satOptions = {
            start: saturday,
            end: saturday,
            sedrot: true,
            il: true
        };
        const satEvents = HebrewCalendar.calendar(satOptions);
        const parashaEvent = satEvents.find(e => e.getFlags() & flags.PARSHA_HASHAVUA);

        if (parashaEvent) {
            // User requested to check if "Parashat" appears, so we keep the full name "פרשת X"
            parashaName = parashaEvent.render('he');
        } else {
            // Fallback
            const sedra = getSedra(hDate.getFullYear(), true);
            const lookup = sedra.lookup(hDate);
            if (lookup && lookup.parsha) {
                // sedra.lookup returns array of strings (e.g. ['Vayakhel', 'Pekudei'])
                const pName = lookup.parsha.join('-');
                parashaName = translateParashaName(pName);
            }
        }

        // Check if parashaName itself contains holiday name (Hebcal sometimes returns Parasha / Holiday)
        // Extract holiday from parashaName if it's like "פרשת X / Y"
        let parashaHolidayPart = "";
        if (parashaName.includes(' / ')) {
            const parts = parashaName.split(' / ');
            parashaName = parts[0];
            parashaHolidayPart = parts.slice(1).join(' / ');
        }

        // Logic:
        // 1. If strict Holiday exists on this day (e.g. Yom Kippur, Rosh Hashana, Sukkot), use it.
        // 2. If it is Shabbat AND a Holiday (e.g. Shabbat Chanukah), combine them.
        // 3. If it is just Shabbat, use Parasha.
        // 4. If it is weekday and NO holiday, use upcoming Parasha.

        // Logic:
        // 1. If Parasha exists (Shabbat), show ONLY Parasha (as per user request "delete what is written after Parasha").
        // 2. If NO Parasha (Weekday Holiday), show Holiday.

        let finalName = parashaName;
        const holidayStr = eventName || parashaHolidayPart
            ? (eventName && parashaHolidayPart && eventName !== parashaHolidayPart
                ? (parashaHolidayPart.includes(eventName) ? parashaHolidayPart : `${eventName} / ${parashaHolidayPart}`)
                : (eventName || parashaHolidayPart))
                .replace(/\s+\d+$/, '') // Remove trailing year
                .replace(/[אב]׳$/, (m) => m[0]) // Normalize ' or ׳
                .replace(/Chanukah: \d+ Candles/g, 'חנוכה')
                .replace(/Rosh Chodesh (\w+)/g, 'ראש חודש $1')
            : "";

        if (hDate.getDay() === 6) {
            // It is Shabbat
            if (holidayStr && parashaName && parashaName !== 'לא נמצאה פרשה') {
                // If parashaName is just holiday (e.g. "פרשת סוכות"), and holidayStr is "סוכות א"
                // avoid "פרשת סוכות / סוכות א"
                const cleanP = parashaName.replace('פרשת ', '');
                if (holidayStr.includes(cleanP) || cleanP.includes(holidayStr)) {
                    finalName = holidayStr;
                } else {
                    finalName = `${parashaName} / ${holidayStr}`;
                }
            } else if (holidayStr) {
                finalName = holidayStr;
            } else {
                finalName = parashaName || "לא נמצאה פרשה";
            }
        } else {
            // It is a weekday
            if (holidayStr) {
                finalName = holidayStr;
            } else {
                // If it's a weekday and they had an aliyah, we usually show the upcoming parasha
                finalName = parashaName || "לא נמצאה פרשה";
            }
        }

        return {
            parasha: finalName,
            days_since_aliyah: getDaysSinceAliyah(hDate),
            formattedDate: formattedDate
        };
    } catch (error) {
        console.error("Error in calculateAliyahInfo:", error);
        return { parasha: 'שגיאה', days_since_aliyah: null, formattedDate: '' };
    }
}

/**
 * Checks if a Hebrew date's Yahrzeit (anniversary) falls between today and upcoming Shabbat.
 * Returns the HDate of the Yahrzeit if in range, otherwise null.
 */
export function getYahrzeitIfInCurrentWeek(birthOrDeathDateStr) {
    if (!birthOrDeathDateStr) return null;
    try {
        const parts = parseHebrewDate(birthOrDeathDateStr);
        if (!parts || !parts.day || (!parts.monthName && !parts.month)) return null;

        const today = new HDate();
        const upcomingShabbat = today.onOrAfter(6); // This coming Saturday
        const followingShabbat = upcomingShabbat.after(6); // Next Saturday

        const hYear = today.getFullYear();
        const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);

        const checkRanges = [];
        const addYahrzeits = (yr) => {
            const isTargetLeap = HDate.isLeapYear(yr);
            const deathYear = parts.year;
            const isDeathLeap = HDate.isLeapYear(deathYear);
            const normalizedMonth = normalizeHebrewString(parts.monthName || "").replace(/['"]/g, '');

            let targetMonth = monthNum;
            let isRegularAdar = false;

            if (isTargetLeap) {
                if (monthNum === 12 || monthNum === 13) {
                    if (!isDeathLeap) {
                        targetMonth = 13;
                        isRegularAdar = true;
                    } else if (normalizedMonth === 'אדר') {
                        targetMonth = 13;
                        isRegularAdar = true;
                    }
                }
            } else {
                if (monthNum === 12 || monthNum === 13) targetMonth = 12;
            }

            const refDate = new HDate(parts.day, targetMonth, 5700);
            const yahrzeitDate = HebrewCalendar.getYahrzeit(yr, refDate);
            if (yahrzeitDate) {
                checkRanges.push({ hdate: yahrzeitDate, isRegularAdar });
            }
        };

        addYahrzeits(hYear);
        addYahrzeits(hYear + 1);

        const getInRange = (yObj) => {
            if (!yObj || !yObj.hdate) return null;
            const abs = yObj.hdate.abs();
            return (abs >= upcomingShabbat.abs() && abs <= followingShabbat.abs()) ? yObj : null;
        };

        for (const y of checkRanges) {
            const result = getInRange(y);
            if (result) return result;
        }
        return null;
    } catch (e) {
        console.error("Error in getYahrzeitIfInCurrentWeek:", e);
        return null;
    }
}

/**
 * Checks if a Hebrew date's Yahrzeit falls within 30 days from the upcoming Shabbat.
 * Returns an object with the yahrzeit HDate and formatted date string, or null.
 */
export function getYahrzeitIfWithin30Days(birthOrDeathDateStr) {
    if (!birthOrDeathDateStr) return null;
    try {
        const parts = parseHebrewDate(birthOrDeathDateStr);
        if (!parts || !parts.day || (!parts.monthName && !parts.month)) return null;

        const today = new HDate();
        const upcomingShabbat = today.onOrAfter(6); // This coming Saturday
        const thirtyDaysLater = upcomingShabbat.add(30, 'd'); // 30 days from upcoming Shabbat

        const hYear = today.getFullYear();
        const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);

        const checkRanges = [];
        const addYahrzeits = (yr) => {
            const isTargetLeap = HDate.isLeapYear(yr);
            const deathYear = parts.year;
            const isDeathLeap = HDate.isLeapYear(deathYear);
            const normalizedMonth = normalizeHebrewString(parts.monthName || "").replace(/['"]/g, '');

            let targetMonth = monthNum;
            let isRegularAdar = false;

            if (isTargetLeap) {
                if (monthNum === 12 || monthNum === 13) {
                    if (!isDeathLeap) {
                        targetMonth = 13;
                        isRegularAdar = true;
                    } else if (normalizedMonth === 'אדר') {
                        targetMonth = 13;
                        isRegularAdar = true;
                    }
                }
            } else {
                if (monthNum === 12 || monthNum === 13) targetMonth = 12;
            }

            const refDate = new HDate(parts.day, targetMonth, 5700);
            const yahrzeitDate = HebrewCalendar.getYahrzeit(yr, refDate);
            if (yahrzeitDate) {
                checkRanges.push({ hdate: yahrzeitDate, isRegularAdar });
            }
        };

        addYahrzeits(hYear);
        addYahrzeits(hYear + 1);

        const getInRange = (yObj) => {
            if (!yObj || !yObj.hdate) return null;
            const hd = yObj.hdate;
            const abs = hd.abs();
            if (abs >= upcomingShabbat.abs() && abs <= thirtyDaysLater.abs()) {
                const rendered = hd.renderGematriya(true, true);
                let formattedDate = rendered;

                if (yObj.isRegularAdar && HDate.isLeapYear(hd.getFullYear())) {
                    formattedDate = formattedDate.replace(/אדר ב׳$/, 'אדר');
                }

                return { hdate: hd, formatted: formattedDate, isRegularAdar: yObj.isRegularAdar };
            }
            return null;
        };

        for (const y of checkRanges) {
            const result = getInRange(y);
            if (result) return result;
        }
        return null;
    } catch (e) {
        console.error("Error in getYahrzeitIfWithin30Days:", e);
        return null;
    }
}

/**
 * Checks if any day in the week following the given Saturday is Rosh Chodesh.
 */
export function getMevarchimInfo(saturdayHDate) {
    if (!saturdayHDate) return { isMevarchim: false };

    // Check next 6 days for Rosh Chodesh (Sunday to Friday)
    const start = saturdayHDate.next();
    const end = saturdayHDate.add(6, 'd');

    const options = {
        start: start,
        end: end,
        sedrot: false,
        il: true
    };

    const events = HebrewCalendar.calendar(options);
    const rcEvent = events.find(e => e.getFlags() & flags.ROSH_CHODESH);

    if (rcEvent) {
        // Description is usually "Rosh Chodesh Adar I" or "Rosh Chodesh Nisan"
        // We want to extract the month name and clean vowels
        let desc = rcEvent.render('he');
        let month = desc.replace('ראש חודש ', '').replace("א' ", '').replace("ב' ", '').trim();
        // Remove vowels (niqqud)
        month = normalizeHebrewString(month);
        return { isMevarchim: true, month: month };
    }
    return { isMevarchim: false };
}

/**
 * Returns the Pirkei Avot chapter for a given Shabbat HDate.
 * Pirkei Avot is studied on Shabbat afternoons from the first Shabbat
 * after Pesach (21 Nisan) until the Shabbat before Rosh Hashanah.
 * Chapters cycle 1-6 repeatedly. Returns null if outside the season.
 */
export function getPirkeiAvotChapter(shabbatHDate) {
    if (!shabbatHDate) return null;
    try {
        const year = shabbatHDate.getFullYear();
        const month = shabbatHDate.getMonth();
        const day = shabbatHDate.getDate();

        // Determine which Hebrew year's Pirkei Avot cycle we're in
        // If we're between Nisan and Elul, use current year
        // If we're in Tishrei+, the cycle already ended
        let cycleYear = year;
        if (month >= 7 && day >= 1) {
            // We're in Tishrei or later - no Pirkei Avot
            // (Tishrei=7 in hebcal numbering)
            return null;
        }

        // Pesach 7th day (end of Pesach in Israel) = 21 Nisan
        const pesachEnd = new HDate(21, 1, cycleYear); // 1 = Nisan
        const firstShabbat = pesachEnd.onOrAfter(6);

        // Rosh Hashanah of next year = 1 Tishrei of cycleYear+1
        // But Tishrei is month 7 of the SAME Hebrew year in hebcal
        // Actually in hebcal, Tishrei of the next civil year is the start of cycleYear+1
        const roshHashana = new HDate(1, 7, cycleYear + 1);
        const lastShabbat = roshHashana.prev().onOrBefore(6);

        const currentAbs = shabbatHDate.abs();

        // Check if this Shabbat is in the Pirkei Avot season
        if (currentAbs < firstShabbat.abs() || currentAbs > lastShabbat.abs()) {
            return null;
        }

        // Count which Shabbat number this is (0-indexed)
        const weeksDiff = Math.round((currentAbs - firstShabbat.abs()) / 7);
        const chapterIndex = weeksDiff % 6; // 0-5

        const CHAPTER_NAMES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
        return {
            chapter: chapterIndex + 1,
            chapterHebrew: CHAPTER_NAMES[chapterIndex],
            display: `פרקי אבות פרק ${CHAPTER_NAMES[chapterIndex]}`
        };
    } catch (e) {
        console.error('Error in getPirkeiAvotChapter:', e);
        return null;
    }
}

/**
 * Internal helper to format information for a single significant day
 */
export function getSingleDayInfo(hd, holidayNameOverride = null) {
    let holidayName = holidayNameOverride;

    // Get Parasha and events
    const options = { start: hd, end: hd, sedrot: true, il: true };
    const events = HebrewCalendar.calendar(options);
    const parashaEvent = events.find(e => e.getFlags() & flags.PARSHA_HASHAVUA);

    let parashaName = holidayName;
    if (!parashaName) {
        if (parashaEvent) {
            parashaName = parashaEvent.render('he').replace("פרשת ", "");
        } else {
            const holidayEvent = events.find(e => (e.getFlags() & (flags.CHAG | flags.SPECIAL_SHABBAT)) && !e.getDesc().includes('Chanukah'));
            if (holidayEvent) {
                parashaName = holidayEvent.render('he')
                    .replace(/\s+\d+$/, '')
                    .replace(/[אב]׳$/, (m) => m[0]);
            } else {
                parashaName = "לא נמצאה פרשה";
            }
        }
    }

    let specialShabbatType = null;
    const specialShabbatEvent = events.find(e => e.getFlags() === 512); // SPECIAL_SHABBAT_FLAG
    if (specialShabbatEvent) {
        specialShabbatType = specialShabbatEvent.render('he');
    }

    // Add Rosh Chodesh or Machar Chodesh detection for Shabbat
    if (hd.getDay() === 6) {
        const rcEvent = events.find(e => e.getFlags() & flags.ROSH_CHODESH);
        if (rcEvent) {
            if (specialShabbatType) {
                specialShabbatType += ' / שבת ראש חודש';
            } else {
                specialShabbatType = 'שבת ראש חודש';
            }
        } else {
            // Check for Machar Chodesh (Tomorrow is Rosh Chodesh)
            const tomorrow = hd.next();
            const tomorrowOptions = { start: tomorrow, end: tomorrow, il: true };
            const tomorrowEvents = HebrewCalendar.calendar(tomorrowOptions);
            const tomorrowRC = tomorrowEvents.find(e => e.getFlags() & flags.ROSH_CHODESH);
            if (tomorrowRC) {
                if (specialShabbatType) {
                    specialShabbatType += ' / שבת ערב ראש חודש (מחר חודש)';
                } else {
                    specialShabbatType = 'שבת ערב ראש חודש (מחר חודש)';
                }
            }
        }
    }

    const rend = hd.renderGematriya(true).split(' ');
    const formattedDateForDisplay = `${rend[0]} ${rend.slice(1, -1).join(' ').replace(/^ב/, '')} ${rend[rend.length - 1]}`;

    return {
        date: hd,
        parasha: parashaName,
        shabbatDate: hd.render('he'),
        shabbatDateFormatted: formattedDateForDisplay,
        specialShabbatType: specialShabbatType,
        haftarah: getHaftarahForParasha(parashaName, specialShabbatType, hd),
        pirkeiAvot: getPirkeiAvotChapter(hd),
        isBiurMaaserot: parashaName === 'שביעי של פסח' && (hd.getFullYear() % 7 === 4 || hd.getFullYear() % 7 === 0)
    };
}

/**
 * Returns info about the upcoming Shabbat (Date and Parasha)
 * If Friday is a holiday, also returns info for that Friday.
 */
export function getUpcomingShabbatInfo() {
    const today = new HDate();
    const nextShabbat = today.onOrAfter(6);

    const daysToPrint = [];

    // Check all days from today up to (but not including) the upcoming Shabbat.
    // If any of these days is a major holiday, include it in the print list.
    let checkDate = today;
    while (checkDate.abs() < nextShabbat.abs()) {
        const holiday = getHolidayInfo(checkDate);
        if (holiday) {
            daysToPrint.push(getSingleDayInfo(checkDate, holiday.name));
        }
        checkDate = checkDate.next();
    }

    // Always include Shabbat itself
    const shabbatInfo = getSingleDayInfo(nextShabbat);
    daysToPrint.push(shabbatInfo);

    // Filter out duplicates (possible if today is already Shabbat)
    const uniqueDays = [];
    const seenAbs = new Set();
    for (const d of daysToPrint) {
        if (!seenAbs.has(d.date.abs())) {
            uniqueDays.push(d);
            seenAbs.add(d.date.abs());
        }
    }

    // For backward compatibility and for the root properties of the returned object:
    // If there is a holiday in the list, used the first one as primary, otherwise use Shabbat.
    const primaryDayInfo = uniqueDays.length > 1 ? uniqueDays[0] : shabbatInfo;

    const mevarchim = getMevarchimInfo(nextShabbat);
    const shmitaStatus = getShmitaYearStatus(nextShabbat.getFullYear());
    const nextBirkatHaChama = getNextBirkatHaChama(nextShabbat.getFullYear());

    return {
        ...primaryDayInfo,
        daysToPrint: uniqueDays,
        shmitaStatus,
        nextBirkatHaChama,
        ...mevarchim
    };
}

export const PARASHA_HEBREW_MAP = {
    'Bereshit': 'בראשית', 'Noach': 'נח', 'Lech-Lecha': 'לך-לך', 'Vayera': 'וירא',
    'Chayei Sara': 'חיי שרה', 'Toldot': 'תולדות', 'Vayetzei': 'ויצא', 'Vayishlach': 'וישלח',
    'Vayeshev': 'וישב', 'Miketz': 'מקץ', 'Vayigash': 'ויגש', 'Vayechi': 'ויחי',
    'Shemot': 'שמות', 'Vaera': 'וארא', 'Bo': 'בא', 'Beshalach': 'בשלח',
    'Yitro': 'יתרו', 'Mishpatim': 'משפטים', 'Terumah': 'תרומה', 'Tetzaveh': 'תצוה',
    'Ki Tisa': 'כי תשא', 'Vayakhel': 'ויקהל', 'Pekudei': 'פקודי', 'Vayikra': 'ויקרא',
    'Tzav': 'צו', 'Shmini': 'שמיני', 'Tazria': 'תזריע', 'Metzora': 'מצורע',
    'Achrei Mot': 'אחרי מות', 'Kedoshim': 'קדושים', 'Emor': 'אמור', 'Behar': 'בהר',
    'Bechukotai': 'בחוקותי', 'Bamidbar': 'במדבר', 'Nasso': 'נשא', 'Beha\'alotcha': 'בהעלותך',
    'Sh\'lach': 'שלח', 'Korach': 'קרח', 'Chukat': 'חוקת', 'Balak': 'בלק',
    'Pinchas': 'פנחס', 'Matot': 'מטות', 'Masei': 'מסעי', 'Devarim': 'דברים',
    'Vaetchanan': 'ואתחנן', 'Eikev': 'עקב', 'Re\'eh': 'ראה', 'Shoftim': 'שופטים',
    'Ki Teitzei': 'כי תצא', 'Ki Tavo': 'כי תבוא', 'Nitzavim': 'נצבים', 'Vayeilech': 'וילך',
    'Ha\'Azinu': 'האזינו', 'Vezot Haberakhah': 'וזאת הברכה',
    // Combined Parashot
    'Vayakhel-Pekudei': 'ויקהל-פקודי', 'Tazria-Metzora': 'תזריע-מצורע',
    'Achrei Mot-Kedoshim': 'אחרי מות-קדושים', 'Behar-Bechukotai': 'בהר-בחוקותי',
    'Matot-Masei': 'מטות-מסעי', 'Nitzavim-Vayeilech': 'נצבים-וילך',
    'Shekalim': 'שקלים', 'Zachor': 'זכור', 'Parah': 'פרה', 'HaChodesh': 'החודש', 'HaGadol': 'הגדול',
    'Shabbat Shekalim': 'שבת שקלים', 'Shabbat Zachor': 'שבת זכור', 'Shabbat Parah': 'שבת פרה', 'Shabbat HaChodesh': 'שבת החודש', 'Shabbat HaGadol': 'שבת הגדול',
    // Holidays
    'Rosh Hashana': 'ראש השנה', 'Rosh Hashana I': 'ראש השנה א׳', 'Rosh Hashana II': 'ראש השנה ב׳',
    'Yom Kippur': 'יום כיפור', 'Yom Kippur I': 'יום כיפור', 'Yom HaKippurim': 'יום הכיפורים',
    'Sukkot': 'סוכות', 'Sukkot I': 'סוכות א׳', 'Sukkot II': 'סוכות ב׳', 'Sukkot III': 'חול המועד סוכות', 'Sukkot VII': 'הושענא רבה',
    'Shmini Atzeret': 'שמיני עצרת', 'Simchat Torah': 'שמחת תורה',
    'Chanukah': 'חנוכה', 'Chanukah I': 'חנוכה', 'Chanukah II': 'חנוכה', 'Chanukah VIII': 'זאת חנוכה',
    'Purim': 'פורים', 'Shushan Purim': 'שושן פורים',
    'Pesach': 'פסח', 'Pesach I': 'פסח א׳', 'Pesach II': 'פסח ב׳', 'Pesach VII': 'שביעי של פסח', 'Pesach VIII': 'אחרון של פסח',
    'Shavuot': 'שבועות', 'Shavuot I': 'שבועות א׳', 'Shavuot II': 'שבועות ב׳',
    'Rosh Chodesh': 'ראש חודש',
    // Variations
    'Chayei Sarah': 'חיי שרה', 'Lech Lecha': 'לך-לך', 'Beha\'alotcha': 'בהעלותך', 'Behaalotcha': 'בהעלותך'
};

/**
 * Robustly checks if a Hebrew date is a major holiday (Yom Tov) or significant day requiring a separate list.
 */
export function getHolidayInfo(hdate) {
    if (!hdate) return null;

    const options = { start: hdate, end: hdate, il: true };
    const events = HebrewCalendar.calendar(options);

    // Look for major holidays (CHAG)
    // We filter out Chanukah because it's usually not a "Chag" requiring a separate aliyah list in the same way,
    // though this is configurable. The user's focus is on major days like Pesach, Shavuot, Sukkot, RH.
    const holidayEvent = events.find(e => (e.getFlags() & flags.CHAG) && !e.getDesc().includes('Chanukah'));

    if (holidayEvent) {
        return {
            name: holidayEvent.render('he')
                .replace(/\s+\d+$/, '') // Remove year if present
                .replace(/[אב]׳$/, (m) => m[0]) // Normalize quote characters
                .replace(/פֶּסַח/g, 'פסח') // Remove vowels if they appear
                .replace(/שָׁבוּעוֹת/g, 'שבועות')
                .replace(/רֹאשׁ הַשָּׁנָה/g, 'ראש השנה')
                .replace(/סֻכּוֹת/g, 'סוכות')
                .replace(/יוֹם כִּפּוּר/g, 'יום כיפור')
                .replace(/שְׁמִינִי עֲצֶרֶת/g, 'שמיני עצרת')
                .replace(/שִׂמְחַת תּוֹרָה/g, 'שמחת תורה')
                .trim()
        };
    }

    // Special check for Shabbat Chol HaMoed
    if (hdate.getDay() === 6) {
        const cholHaMoedEvent = events.find(e => e.getDesc().includes('Chol HaMoed'));
        if (cholHaMoedEvent) {
            let name = cholHaMoedEvent.render('he').replace(/\s+\d+$/, '');
            if (name.includes('סוכות')) return { name: 'שבת חוה"מ סוכות' };
            if (name.includes('פסח')) return { name: 'שבת חוה"מ פסח' };
            return { name };
        }
    }

    return null;
}

export const HAFTARAH_MAP = {
    // Bereshit
    "בראשית": "ישעיהו מ\"ב, ה - מ\"ג, י (מנהג הספרדים עד מ\"ב, כ\"א)",
    "נח": "ישעיהו נ\"ד, א - נ\"ה, ה",
    "לך לך": "ישעיהו מ', כ\"ז - מ\"א, ט\"ז",
    "וירא": "מלכים ב ד', א-ל\"ז",
    "חיי שרה": "מלכים א א', א-ל\"א",
    "תולדות": "מלאכי א', א - ב', ז'",
    "ויצא": "הושע י\"א, ז' - י\"ב, י\"ב",
    "וישלח": "עובדיה א', א-כ\"א (או הושע י\"א-י\"ב)",
    "וישב": "עמוס ב', ו' - ג', ח'",
    "מקץ": "מלכים א ג', ט\"ו - ד', א'",
    "ויגש": "יחזקאל ל\"ז, ט\"ו-כ\"ח",
    "ויחי": "מלכים א ב', א-י\"ב",
    // Shemot
    "שמות": "ישעיהו כ\"ז, ו - כ\"ח, י\"ג; כ\"ט, כ\"ב-כ\"ג",
    "וארא": "יחזקאל כ\"ח, כ\"ה - כ\"ט, כ\"א",
    "בא": "ירמיהו מ\"ו, י\"ג-כ\"ח",
    "בשלח": "שופטים ד', ד' - ה', ל\"א",
    "יתרו": "ישעיהו ו', א - ז', ו; ט', ה-ו",
    "משפטים": "ירמיהו ל\"ד, ח-כ\"ב; ל\"ג, כ\"ה-כ\"ו",
    "תרומה": "מלכים א ה', כ\"ו - ו', י\"ג",
    "תצווה": "יחזקאל מ\"ג, י-כ\"ז",
    "כי תשא": "מלכים א י\"ח, א-ל\"ט",
    "ויקהל": "מלכים א ז', מ-נ (או ז', י\"ג-כ\"ו)",
    "פקודי": "מלכים א ז', נ\"א - ח', כ\"א (או ז', מ-נ)",
    // Vayikra
    "ויקרא": "ישעיהו מ\"ג, כ\"א - מ\"ד, כ\"ג",
    "צו": "ירמיהו ז', כ\"א - ח', ג; ט', כ\"ב-כ\"ג",
    "שמיני": "שמואל ב ו', א - ז', י\"ז",
    "תזריע": "מלכים ב ד', מ\"ב - ה', י\"ט",
    "מצורע": "מלכים ב ז', ג-כ",
    "אחרי מות": "עמוס ט', ז-ט\"ו (או יחזקאל כ\"ב, א-ט\"ז)",
    "קדושים": "יחזקאל כ', ב-כ' (או עמוס ט', ז-ט\"ו)",
    "אמור": "יחזקאל מ\"ד, א-ל",
    "בהר": "ירמיהו ל\"ב, ו-כ\"ז",
    "בחוקותי": "ירמיהו י\"ז, ה-י\"ד",
    // Bamidbar
    "במדבר": "הושע ב', א-כ\"ב",
    "נשא": "שופטים י\"ג, ב-כ\"ה",
    "בהעלותך": "זכריה ב', י\"ד - ד', ז'",
    "שלח לך": "יהושע ב', א-כ\"ד",
    "קרח": "שמואל א י\"א, י\"ד - י\"ב, כ\"ב",
    "חקת": "שופטים י\"א, א-ל\"ג",
    "בלק": "מיכה ה', ו - ו', ח'",
    "פנחס": "מלכים א י\"ח, מ\"ו - י\"ט, כ\"א",
    "מטות": "ירמיהו א', א - ב', ג'",
    "מסעי": "ירמיהו ב', ד-כ\"ח; ג', ד (או מ\"ב, א-ט\"ז)",
    // Devarim
    "דברים": "ישעיהו א', א-כ\"ז",
    "ואתחנן": "ישעיהו מ', א-כ\"ו",
    "עקב": "ישעיהו מ\"ט, י\"ד - נ\"א, ג'",
    "ראה": "ישעיהו נ\"ד, י\"א - נ\"ה, ה'",
    "שופטים": "ישעיהו נ\"א, י\"ב - נ\"ב, י\"ב",
    "כי תצא": "ישעיהו נ\"ד, א-י",
    "כי תבוא": "ישעיהו ס', א-כ\"ב",
    "נצבים": "ישעיהו ס\"א, י - ס\"ג, ט",
    "וילך": "ישעיהו נ\"ה, ו - נ\"ו, ח'",
    "האזינו": "שמואל ב כ\"ב, א-נ\"א",
    "וזאת הברכה": "יהושע א', א-י\"ח",
    // Combined
    "ויקהל-פקודי": "מלכים א ז', נ\"א - ח', כ\"א",
    "תזריע-מצורע": "מלכים ב ז', ג-כ",
    "אחרי מות-קדושים": "עמוס ט', ז-ט\"ו",
    "בהר-בחוקותי": "ירמיהו י\"ז, ה-י\"ד",
    "מטות-מסעי": "ירמיהו ב', ד-כ\"ח; ג', ד'",
    "נצבים-וילך": "ישעיהו ס\"א, י - ס\"ג, ט",
    // Special Shabbatot
    "שקלים": "מלכים ב י\"ב, א-י\"ז",
    "זכור": "שמואל א ט\"ו, ב-ל\"ד",
    "פרה": "יחזקאל ל\"ו, ט\"ז-ל\"ח",
    "החודש": "יחזקאל מ\"ה, י\"ח - מ\"ו, ט\"ו",
    "הגדול": "מלאכי ג', ד-כ\"ד",
    "חזון": "ישעיהו א', א-כ\"ז",
    "נחמו": "ישעיהו מ', א-כ\"ו",
    // Holidays and Special occasions
    "ראש השנה": "שמואל א א', א - ב', י'",
    "ראש השנה א": "שמואל א א', א - ב', י'",
    "ראש השנה ב": "ירמיהו ל\"א, א-י\"ט",
    "פסח א": "יהושע ה', ב - ו', א",
    "פסח ב": "מלכים ב כ\"ג, א-ט; כ\"א-כ\"ה",
    "פסח ז": "שמואל ב כ\"ב, א-נ\"א",
    "שבועות א": "יחזקאל א', א-כ\"ח; ג', י\"ב",
    "שבועות ב": "חבקוק ב', כ' - ג', י\"ט",
    "יום כיפור": "ישעיהו נ\"ז, י\"ד - נ\"ח, י\"ד",
    "סוכות א": "זכריה י\"ד, א-כ\"א",
    "סוכות ב": "מלכים א ח', ב-כ\"א",
    "שמיני עצרת": "מלכים א ח', נ\"ד-ס\"ו",
    "שמחת תורה": "יהושע א', א-י\"ח",
    "שבת ראש חודש": "ישעיהו ס\"ו, א-כ\"ד",
    "מחר חודש": "שמואל א כ', י\"ח-מ\"ב",
    "שבת חוה\"מ סוכות": "יחזקאל ל\"ח, י\"ח - ל\"ט, ט\"ז",
    "שבת חוה\"מ פסח": "יחזקאל ל\"ז, א-י\"ד",
    "שבועות א": "יחזקאל א', א-כ\"ח; ג', י\"ב",
    "א' סוכות": "זכריה י\"ד, א-כ\"א",
    "א' פסח": "יהושע ה', ב - ו', א",
    "שביעי של פסח": "שמואל ב כ\"ב, א-נ\"א",
    "שבועות": "יחזקאל א', א-כ\"ח; ג', י\"ב"
};

export function getHaftarahForParasha(parashaName, specialShabbatType, saturdayHDate) {
    let cleanSpecial = null;
    if (specialShabbatType) {
        cleanSpecial = normalizeHebrewString(specialShabbatType).replace(/^(שבת|פרשת)\s+/i, '').replace(/שמחת תורה/, 'שמיני עצרת').trim();
    }

    // 1. Check for Holiday or Special Shabbat on this day
    if (saturdayHDate) {
        const options = { start: saturdayHDate, end: saturdayHDate, il: true };
        const events = HebrewCalendar.calendar(options);

        // Priority 1: Special Shabbat (512)
        const specialEvent = events.find(e => e.getFlags() === 512);
        if (specialEvent) {
            const name = normalizeHebrewString(specialEvent.render('he')).replace(/^(שבת|פרשת)\s+/i, '').trim();
            if (HAFTARAH_MAP[name]) return HAFTARAH_MAP[name];
        }

        // Priority 2: Holiday (Chag)
        const holidayEvent = events.find(e => (e.getFlags() & flags.CHAG) && !e.getDesc().includes('Chanukah'));
        if (holidayEvent) {
            const holidayName = normalizeHebrewString(holidayEvent.render('he')).replace(/\s+\d+$/, '').replace(/[אב]׳$/, (m) => m[0]).trim();
            if (HAFTARAH_MAP[holidayName]) return HAFTARAH_MAP[holidayName];
            // Try base name
            const baseHoliday = holidayName.replace(/\s+[אב]$/, '');
            if (HAFTARAH_MAP[baseHoliday]) return HAFTARAH_MAP[baseHoliday];
        }

        // Priority 3: Shabbat Rosh Chodesh / Machar Chodesh
        const rcEvent = events.find(e => e.getFlags() & flags.ROSH_CHODESH);
        if (rcEvent) return HAFTARAH_MAP["שבת ראש חודש"];

        const tomorrow = saturdayHDate.next();
        const tomorrowEvents = HebrewCalendar.calendar({ start: tomorrow, end: tomorrow, il: true });
        if (tomorrowEvents.find(e => e.getFlags() & flags.ROSH_CHODESH)) {
            return HAFTARAH_MAP["מחר חודש"];
        }
    }

    if (cleanSpecial && HAFTARAH_MAP[cleanSpecial]) return HAFTARAH_MAP[cleanSpecial];

    // 4. Default Parasha Haftarah
    if (!parashaName) return '';
    const cleanParasha = normalizeHebrewString(parashaName).replace(/^(Parashat|פרשת)\s+/i, '').trim();
    return HAFTARAH_MAP[cleanParasha] || '';
}

export function translateParashaName(name) {
    if (!name) return '-';
    if (name === 'לא נמצאה פרשה') return name;

    // Handle strings like "פרשת Shmini Atzeret" or "פרשת Bereshit"
    let cleanName = name;
    let hadPrefix = false;
    if (name.startsWith('פרשת ')) {
        cleanName = name.replace('פרשת ', '');
        hadPrefix = true;
    }

    // If it's already Hebrew (contains mostly Hebrew characters), don't prefix with "פרשת "
    // unless it's a single parasha name from the map that we want to prefix.
    const isMainlyHebrew = /[\u0590-\u05FF]/.test(cleanName);

    if (isMainlyHebrew) {
        return hadPrefix ? "פרשת " + cleanName : cleanName;
    }

    // Handle combined parashot or Parasha / Holiday
    if (cleanName.includes('/') || (cleanName.includes('-') && PARASHA_HEBREW_MAP[cleanName])) {
        const separator = cleanName.includes('/') ? ' / ' : '-';
        return cleanName.split(separator === ' / ' ? '/' : '-')
            .map(p => translateParashaName(p.trim()))
            .join(separator);
    }

    const translated = PARASHA_HEBREW_MAP[cleanName]
        || Object.entries(PARASHA_HEBREW_MAP).find(([k]) => k.toLowerCase() === cleanName.toLowerCase())?.[1]
        || cleanName;

    // Only add "פרשת " if it's a known parasha and not a holiday from the map
    const holidays = ['Rosh Hashana', 'Yom Kippur', 'Sukkot', 'Chanukah', 'Purim', 'Pesach', 'Shavuot', 'Rosh Chodesh', 'Atzeret', 'Torah'];
    const isHoliday = holidays.some(h => cleanName.toLowerCase().includes(h.toLowerCase()));

    if (isHoliday) return translated;
    return "פרשת " + translated;
}

/**
 * Quick helper to get absolute day number for sorting and comparisons
 */
export function getAbsDate(dateStr) {
    if (!dateStr) return 0;
    try {
        const parts = parseHebrewDate(dateStr);
        if (!parts) return 0;
        const monthNum = getHebrewMonthNumber(parts.monthName || parts.month, parts.year);
        if (!monthNum) return 0;
        return new HDate(parts.day, monthNum, parts.year).abs();
    } catch (e) {
        return 0;
    }
}

export function getParashaForDate(dateString) {
    const info = calculateAliyahInfo(dateString);
    return info && info.parasha ? info.parasha : '';
}
