import { GeoLocation, Zmanim, HebrewCalendar, HDate, flags } from '@hebcal/core';

// Coordinates dictionary for major cities and towns in Israel
export const ISRAEL_CITY_COORDINATES = {
    'ירושלים': { lat: 31.778, lon: 35.235, elevation: 800 },
    'בני ברק': { lat: 32.087, lon: 34.832, elevation: 40 },
    'תל אביב': { lat: 32.085, lon: 34.781, elevation: 10 },
    'תל אביב-יפו': { lat: 32.085, lon: 34.781, elevation: 10 },
    'חיפה': { lat: 32.794, lon: 34.989, elevation: 100 },
    'באר שבע': { lat: 31.253, lon: 34.791, elevation: 260 },
    'אשדוד': { lat: 31.801, lon: 34.643, elevation: 20 },
    'נתניה': { lat: 32.321, lon: 34.853, elevation: 35 },
    'פתח תקווה': { lat: 32.087, lon: 34.888, elevation: 50 },
    'פתח תקוה': { lat: 32.087, lon: 34.888, elevation: 50 },
    'ראשון לציון': { lat: 31.973, lon: 34.789, elevation: 45 },
    'חולון': { lat: 32.016, lon: 34.780, elevation: 25 },
    'רמת גן': { lat: 32.068, lon: 34.825, elevation: 30 },
    'רחובות': { lat: 31.893, lon: 34.811, elevation: 50 },
    'בת ים': { lat: 32.017, lon: 34.750, elevation: 15 },
    'אשקלון': { lat: 31.669, lon: 34.574, elevation: 25 },
    'בית שמש': { lat: 31.747, lon: 34.988, elevation: 220 },
    'אלעד': { lat: 32.052, lon: 34.951, elevation: 120 },
    'מודיעין': { lat: 31.899, lon: 35.007, elevation: 260 },
    'מודיעין-מכבים-רעות': { lat: 31.899, lon: 35.007, elevation: 260 },
    'מודיעין מכבים רעות': { lat: 31.899, lon: 35.007, elevation: 260 },
    'נתיבות': { lat: 31.424, lon: 34.588, elevation: 140 },
    'צפת': { lat: 32.965, lon: 35.498, elevation: 840 },
    'טבריה': { lat: 32.792, lon: 35.531, elevation: -200 },
    'קריית גת': { lat: 31.610, lon: 34.764, elevation: 120 },
    'קרית גת': { lat: 31.610, lon: 34.764, elevation: 120 },
    'עפולה': { lat: 32.607, lon: 35.289, elevation: 60 },
    'נהריה': { lat: 33.006, lon: 35.094, elevation: 15 },
    'אילת': { lat: 29.558, lon: 34.952, elevation: 10 },
    'הרצליה': { lat: 32.166, lon: 34.843, elevation: 20 },
    'כפר סבא': { lat: 32.175, lon: 34.907, elevation: 50 },
    'רעננה': { lat: 32.184, lon: 34.871, elevation: 50 },
    'חדרה': { lat: 32.434, lon: 34.919, elevation: 25 },
    'עכו': { lat: 32.926, lon: 35.083, elevation: 10 },
    'כרמיאל': { lat: 32.913, lon: 35.296, elevation: 250 },
    'עמנואל': { lat: 32.164, lon: 35.148, elevation: 430 },
    'ביתר עילית': { lat: 31.705, lon: 35.118, elevation: 780 },
    'מודיעין עילית': { lat: 31.934, lon: 35.044, elevation: 280 },
    'קריית ארבע': { lat: 31.528, lon: 35.113, elevation: 950 },
    'קרית ארבע': { lat: 31.528, lon: 35.113, elevation: 950 },
    'מעלה אדומים': { lat: 31.777, lon: 35.300, elevation: 480 },
    'שדרות': { lat: 31.522, lon: 34.596, elevation: 90 },
    'אופקים': { lat: 31.314, lon: 34.620, elevation: 140 },
    'דימונה': { lat: 31.068, lon: 35.033, elevation: 550 },
    'ירוחם': { lat: 30.988, lon: 34.918, elevation: 520 },
    'ערד': { lat: 31.261, lon: 35.214, elevation: 600 },
    'מגדל העמק': { lat: 32.673, lon: 35.240, elevation: 220 },
    'נוף הגליל': { lat: 32.705, lon: 35.307, elevation: 430 },
    'נצרת עילית': { lat: 32.705, lon: 35.307, elevation: 430 },
    'בית שאן': { lat: 32.497, lon: 35.498, elevation: -120 },
    'הוד השרון': { lat: 32.150, lon: 34.888, elevation: 45 },
    'רמת השרון': { lat: 32.146, lon: 34.839, elevation: 35 },
    'גבעתיים': { lat: 32.072, lon: 34.810, elevation: 50 },
    'אור יהודה': { lat: 32.029, lon: 34.856, elevation: 30 },
    'יהוד-מונוסון': { lat: 32.033, lon: 34.889, elevation: 40 },
    'יהוד': { lat: 32.033, lon: 34.889, elevation: 40 },
    'קריית אונו': { lat: 32.063, lon: 34.857, elevation: 45 },
    'גבעת שמואל': { lat: 32.078, lon: 34.848, elevation: 50 },
    'רכסים': { lat: 32.748, lon: 35.105, elevation: 120 }
};

export const getGeoLocationForCity = (cityName) => {
    let cleanName = (cityName || '').trim();

    if (cleanName && ISRAEL_CITY_COORDINATES[cleanName]) {
        const c = ISRAEL_CITY_COORDINATES[cleanName];
        return new GeoLocation(cleanName, c.lat, c.lon, c.elevation, 'Asia/Jerusalem');
    }

    if (cleanName) {
        for (const [key, coords] of Object.entries(ISRAEL_CITY_COORDINATES)) {
            if (cleanName.includes(key) || key.includes(cleanName)) {
                return new GeoLocation(key, coords.lat, coords.lon, coords.elevation, 'Asia/Jerusalem');
            }
        }
    }

    return new GeoLocation('Jerusalem', 31.778, 35.235, 800, 'Asia/Jerusalem');
};

export const calculateZmanim = (targetDate = new Date(), cityName = '') => {
    try {
        const location = getGeoLocationForCity(cityName);
        let dateObj;
        if (targetDate instanceof Date) {
            dateObj = targetDate;
        } else if (targetDate && typeof targetDate.greg === 'function') {
            dateObj = targetDate.greg();
        } else if (targetDate) {
            dateObj = new Date(targetDate);
        } else {
            dateObj = new Date();
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
            dateObj = new Date();
        }

        const zman = new Zmanim(location, dateObj, false);

        const sunrise = zman.sunrise();
        const sunset = zman.sunset();

        if (!sunrise || !sunset) return null;

        const dayMs = sunset.getTime() - sunrise.getTime();
        const shaahZmanitMs = dayMs / 12;
        const shaahZmanitMinutes = Math.round(shaahZmanitMs / 60000);

        const shacharitStart = sunrise;
        const shacharitEnd = new Date(sunrise.getTime() + 4 * shaahZmanitMs);
        const chatzot = new Date(sunrise.getTime() + 6 * shaahZmanitMs);
        const minchaGedola = new Date(sunrise.getTime() + 6.5 * shaahZmanitMs);
        const minchaKetanaStart = new Date(sunrise.getTime() + 9.5 * shaahZmanitMs);
        const minchaKetanaEnd = sunset;
        const arvitStart = sunset;

        const formatTime = (d) => d.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });

        return {
            cityName: location.locationName || cityName || 'ירושלים',
            shaahZmanitMinutes,
            shacharitStartFormatted: formatTime(shacharitStart),
            shacharitEndFormatted: formatTime(shacharitEnd),
            chatzotFormatted: formatTime(chatzot),
            minchaGedolaFormatted: formatTime(minchaGedola),
            minchaKetanaStartFormatted: formatTime(minchaKetanaStart),
            minchaKetanaEndFormatted: formatTime(minchaKetanaEnd),
            arvitStartFormatted: formatTime(arvitStart),
            shacharitStart,
            shacharitEnd,
            chatzot,
            minchaGedola,
            minchaKetanaStart,
            minchaKetanaEnd,
            arvitStart
        };
    } catch (e) {
        console.error('Error calculating Zmanim in zmanimUtils:', e);
        return null;
    }
};

export const getZmanimPrintHtml = (targetDate = new Date(), cityName = '') => {
    try {
        const z = calculateZmanim(targetDate, cityName);
        if (!z) return '';

        return `
            <div style="font-size: 9.5px; line-height: 1.25; text-align: right; direction: rtl; color: #222; font-weight: 500;">
                <div><strong>שעה זמנית:</strong> ${z.shaahZmanitMinutes} דקות</div>
                <div><strong>זמן שחרית:</strong> ${z.shacharitStartFormatted} - ${z.shacharitEndFormatted}</div>
                <div><strong>חצות היום:</strong> ${z.chatzotFormatted}</div>
                <div><strong>מנחה גדולה:</strong> ${z.minchaGedolaFormatted}</div>
                <div><strong>מנחה קטנה:</strong> ${z.minchaKetanaStartFormatted} - ${z.minchaKetanaEndFormatted}</div>
                <div><strong>זמן ערבית:</strong> משקיעת החמה (${z.arvitStartFormatted})</div>
            </div>
        `;
    } catch (e) {
        console.error('Error generating zmanim print HTML:', e);
        return '';
    }
};

export const getSpecialDaysAndFastsInfo = (shabbatDateInput = new Date(), cityName = '') => {
    try {
        const location = getGeoLocationForCity(cityName);
        let shabbatHDate;
        if (shabbatDateInput instanceof HDate) {
            shabbatHDate = shabbatDateInput;
        } else if (shabbatDateInput instanceof Date) {
            shabbatHDate = new HDate(shabbatDateInput).onOrAfter(6);
        } else if (shabbatDateInput) {
            shabbatHDate = new HDate(new Date(shabbatDateInput)).onOrAfter(6);
        } else {
            shabbatHDate = new HDate().onOrAfter(6);
        }

        // Scan from upcoming Shabbat to the following Shabbat (inclusive range)
        const nextShabbat = shabbatHDate.add(7, 'd');
        const events = HebrewCalendar.calendar({ start: shabbatHDate, end: nextShabbat, il: true });
        const results = [];
        const seenNames = new Set();

        events.forEach(e => {
            const f = e.getFlags();
            const rawTitle = e.render('he');
            const title = rawTitle.replace(/[\u0591-\u05C7]/g, '').trim();

            if (f & (flags.DAF_YOMI | flags.OMER_COUNT | flags.HEBREW_DATE | flags.MOLAD | flags.PARSHA_HASHAVUA)) return;
            if (rawTitle.includes('Candle lighting') || rawTitle.includes('Havdalah')) return;
            if (title.includes('ערב ראש חודש') || title.includes('ערב שבת')) return;

            const isFast = ((f & flags.MINOR_FAST) || (f & flags.MAJOR_FAST) || title.includes('כפור') || title.includes('כיפור')) && !title.includes('ערב');
            const isSpecial = isFast || (f & (flags.CHAG | flags.ROSH_CHODESH | flags.MINOR_HOLIDAY | flags.MODERN_HOLIDAY | flags.SPECIAL_SHABBAT)) ||
                title.includes('ראש חודש') || title.includes('חנוכה') || title.includes('פורים') || title.includes('שבועות') ||
                title.includes('פסח') || title.includes('סוכות') || title.includes('שמחת תורה') || title.includes('שמיני עצרת');

            if (isSpecial && !seenNames.has(title)) {
                seenNames.add(title);
                const evDate = e.getDate();
                const dayOfWeek = evDate.getDay();
                const daysArr = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
                const dayName = daysArr[dayOfWeek];

                const rend = evDate.renderGematriya(true).split(' ');
                const formattedEvDate = `${rend[0]} ${rend.slice(1, -1).join(' ').replace(/^ב/, '')}`;

                if (isFast) {
                    const zmanFast = new Zmanim(location, evDate.greg(), false);
                    let startTime = '', endTime = '';
                    const formatT = (d) => d ? d.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' }) : '';

                    if (title.includes('כפור') || title.includes('כיפור') || title.includes('תשעה באב')) {
                        const eveDate = evDate.add(-1, 'd');
                        const zmanEve = new Zmanim(location, eveDate.greg(), false);
                        startTime = formatT(zmanEve.sunset());
                        endTime = formatT(zmanFast.tzeit());
                    } else {
                        startTime = formatT(zmanFast.alotHaShachar());
                        endTime = formatT(zmanFast.tzeit());
                    }

                    results.push({
                        type: 'fast',
                        name: title,
                        dayName: dayName,
                        dateStr: formattedEvDate,
                        startTime: startTime,
                        endTime: endTime,
                        displayText: `חל השבוע: ${title} ב${dayName} (${formattedEvDate}) | תחילת הצום: ${startTime} | סיום הצום: ${endTime}`
                    });
                } else {
                    results.push({
                        type: 'holiday',
                        name: title,
                        dayName: dayName,
                        dateStr: formattedEvDate,
                        displayText: `אירוע מיוחד: ${title} ב${dayName} (${formattedEvDate})`
                    });
                }
            }
        });

        return results;
    } catch (e) {
        console.error('Error in getSpecialDaysAndFastsInfo:', e);
        return [];
    }
};

export const getWeeklyFastInfo = getSpecialDaysAndFastsInfo;
