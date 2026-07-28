import hebcal from 'hebcal';
const { HDate } = hebcal;

// פונקציה לבדיקה האם שבת מסוימת היא "שבת מברכים"
function checkMevarchim(date) {
    const hDate = new HDate(date);

    // בדיקה אם היום הוא שבת
    if (hDate.getDay() !== 6) {
        return "התאריך שנבחר אינו יום שבת.";
    }

    // חיפוש אירועים ביום זה
    const events = hDate.getEvents();
    const mevarchimEvent = events.find(e => e.desc.includes("Mevarchim Chodesh"));

    if (mevarchimEvent) {
        return `כן! זוהי שבת מברכים עבור חודש ${mevarchimEvent.desc.split(' ').pop()}.`;
    } else {
        return "לא, זו אינה שבת מברכים.";
    }
}

// בדיקה עבור שבת הקרובה שבה מברכים (14 בפברואר 2026)
const testDate = new Date('2026-02-14');
console.log(`בדיקה לתאריך ${testDate.toDateString()}:`, checkMevarchim(testDate));
