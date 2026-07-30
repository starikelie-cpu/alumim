import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import { getIntlHebrewParts, yearToGematria, findGregorianDate, parseHebrewDate, getHebrewMonthNumber } from '../utils/hebrewDateUtils';

const REGULAR_MONTHS = [
    { monthNum: 7, monthName: 'תשרי' },
    { monthNum: 8, monthName: 'חשוון' },
    { monthNum: 9, monthName: 'כסלו' },
    { monthNum: 10, monthName: 'טבת' },
    { monthNum: 11, monthName: 'שבט' },
    { monthNum: 12, monthName: 'אדר' },
    { monthNum: 1, monthName: 'ניסן' },
    { monthNum: 2, monthName: 'אייר' },
    { monthNum: 3, monthName: 'סיוון' },
    { monthNum: 4, monthName: 'תמוז' },
    { monthNum: 5, monthName: 'אב' },
    { monthNum: 6, monthName: 'אלול' }
];

const LEAP_MONTHS = [
    { monthNum: 7, monthName: 'תשרי' },
    { monthNum: 8, monthName: 'חשוון' },
    { monthNum: 9, monthName: 'כסלו' },
    { monthNum: 10, monthName: 'טבת' },
    { monthNum: 11, monthName: 'שבט' },
    { monthNum: 12, monthName: 'אדר א\'' },
    { monthNum: 13, monthName: 'אדר ב\'' },
    { monthNum: 1, monthName: 'ניסן' },
    { monthNum: 2, monthName: 'אייר' },
    { monthNum: 3, monthName: 'סיוון' },
    { monthNum: 4, monthName: 'תמוז' },
    { monthNum: 5, monthName: 'אב' },
    { monthNum: 6, monthName: 'אלול' }
];

export function HebrewCalendarComponent({ isOpen, onClose, onSelect, selectedValue }) {
    const todayH = new HDate();
    const [hYear, setHYear] = useState(todayH.getFullYear());
    const [hMonth, setHMonth] = useState(todayH.getMonth());
    const [holidays, setHolidays] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (selectedValue) {
                const parts = parseHebrewDate(selectedValue);
                if (parts) {
                    let year = parts.year;
                    let mName = parts.monthName || parts.month;
                    let monthNum = getHebrewMonthNumber(mName, year);

                    // If month is numeric and year is missing or defaulted, ensure we have a valid monthNum
                    if (!monthNum && !isNaN(parseInt(mName))) {
                        monthNum = parseInt(mName);
                    }

                    if (monthNum) {
                        setHYear(year || todayH.getFullYear());
                        setHMonth(monthNum);
                    }
                }
            } else {
                setHYear(todayH.getFullYear());
                setHMonth(todayH.getMonth());
            }
        }
    }, [isOpen, selectedValue]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchHolidaysForHYear = async (year) => {
            const yearKey = `h${year}`;
            if (holidays[yearKey]) return;

            try {
                const options = {
                    year: year,
                    isHebrewYear: true,
                    sedrot: true,
                    il: true,
                    mevarchim: true,
                };

                const events = HebrewCalendar.calendar(options);
                const mapped = {};

                events.forEach(ev => {
                    const flagsVal = ev.getFlags();
                    if (flagsVal & (flags.DAF_YOMI | flags.OMER_COUNT | flags.HEBREW_DATE)) return;
                    if (ev.getDesc() === 'Candle lighting' || ev.getDesc() === 'Havdalah') return;

                    const date = ev.getDate();
                    const isParasha = flagsVal & flags.PARSHA_HASHAVUA;
                    const shabbatDate = isParasha ? date.onOrAfter(6).greg() : date.greg();

                    const dateKey = `${shabbatDate.getFullYear()}-${(shabbatDate.getMonth() + 1).toString().padStart(2, '0')}-${shabbatDate.getDate().toString().padStart(2, '0')}`;
                    if (!mapped[dateKey]) mapped[dateKey] = [];
                    mapped[dateKey].push({
                        desc: ev.render('he'),
                        category: ev.getCategories()[0] || 'holiday',
                        isMajor: flagsVal & (flags.MAJOR_HOLIDAY | flags.ROSH_CHODESH | flags.MAJOR_FAST),
                        isParasha: isParasha
                    });
                });

                setHolidays(prev => ({ ...prev, [yearKey]: mapped }));
            } catch (e) {
                console.error(`Failed to fetch holidays for HYear ${year}`, e);
            }
        };

        fetchHolidaysForHYear(hYear);
    }, [isOpen, hYear]);

    const calendarData = useMemo(() => {
        if (!isOpen) return { days: [], monthName: '', yearName: '' };
        try {
            const firstOfHebMonth = new HDate(1, hMonth, hYear).greg();
            const days = [];
            const startDow = firstOfHebMonth.getDay();
            for (let i = 0; i < startDow; i++) days.push(null);

            let tempGreg = new Date(firstOfHebMonth);
            for (let d = 1; d <= 32; d++) {
                const hd = new HDate(tempGreg);
                if (hd.getMonth() !== hMonth) break;

                const tempYear = tempGreg.getFullYear();
                const yearHolidays = holidays[`h${hYear}`] || {};
                const dateKey = `${tempYear}-${(tempGreg.getMonth() + 1).toString().padStart(2, '0')}-${tempGreg.getDate().toString().padStart(2, '0')}`;

                const dayEvents = yearHolidays[dateKey] || [];
                const parasha = dayEvents.find(e => e.isParasha)?.desc || '';
                const holidayEvents = dayEvents.filter(e => !e.isParasha);

                let majorHoliday = holidayEvents.find(e => e.isMajor && !e.desc.startsWith('ראש חודש'));
                if (!majorHoliday) majorHoliday = holidayEvents.find(e => e.isMajor);

                const minorHoliday = holidayEvents.find(e => !e.isMajor);
                const parts = getIntlHebrewParts(tempGreg);

                days.push({
                    day: parts.day,
                    month: parts.month,
                    year: parts.year,
                    hDayDisplay: parts.dayGematria,
                    gDay: tempGreg.getDate(),
                    fullHDate: parts.fullHDate,
                    isToday: new Date().toDateString() === tempGreg.toDateString(),
                    parasha,
                    holiday: majorHoliday?.desc || minorHoliday?.desc || '',
                    isMajorHoliday: !!majorHoliday,
                    isMinorHoliday: !!minorHoliday && !majorHoliday
                });
                tempGreg.setDate(tempGreg.getDate() + 1);
            }
            const currentParts = getIntlHebrewParts(firstOfHebMonth);
            return { days, monthName: currentParts.monthName, yearName: currentParts.yearGematria };
        } catch (e) {
            console.error('Calendar data error:', e);
            return { days: [], monthName: 'שגיאה', yearName: '' };
        }
    }, [isOpen, hYear, hMonth, holidays]);

    const handleYearChange = (e) => {
        const newHYear = parseInt(e.target.value);
        setHYear(newHYear);
    };

    const handleMonthChange = (e) => {
        const newHMonth = parseInt(e.target.value);
        if (newHMonth) setHMonth(newHMonth);
    };

    if (!isOpen) return null;
    const { days, monthName, yearName } = calendarData;

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }} onClick={onClose}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '95%', maxWidth: '750px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>בחר תאריך עברי (שנת {yearName})</h3>
                    <X size={24} style={{ cursor: 'pointer' }} onClick={onClose} />
                </div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                    <select value={hMonth} onChange={handleMonthChange} style={{ flex: 1, padding: '8px', fontSize: '1.1rem' }}>
                        {(HDate.isLeapYear(hYear) ? LEAP_MONTHS : REGULAR_MONTHS).map(m => (
                            <option key={m.monthNum} value={m.monthNum}>{m.monthName}</option>
                        ))}
                    </select>
                    <select value={hYear} onChange={handleYearChange} style={{ flex: 1, padding: '8px', fontSize: '1.1rem' }}>
                        {Array.from({ length: 240 }, (_, i) => 5600 + i).map(y => (
                            <option key={y} value={y}>{y} ({yearToGematria(y)})</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            setHYear(todayH.getFullYear());
                            setHMonth(todayH.getMonth());
                        }}
                        style={{ padding: '8px 15px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                    >
                        היום
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                    {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px', minWidth: 0 }}>{d}</div>)}
                    {days.map((d, i) => d ? (
                        <button
                            key={i}
                            onClick={() => {
                                onSelect({
                                    hYear: d.year,
                                    hMonthName: calendarData.monthName,
                                    hDayGematria: d.hDayDisplay,
                                    hYearGematria: calendarData.yearName
                                });
                                onClose();
                            }}
                            style={{
                                padding: '5px',
                                border: '1px solid #f0f0f0',
                                background: d.isToday ? '#e6f7ff' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '85px',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                gap: '2px',
                                minWidth: 0,
                                boxSizing: 'border-box',
                                width: '100%'
                            }}
                        >
                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{d.hDayDisplay}</span>
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>{d.gDay}</span>
                            {d.parasha && <span style={{ fontSize: '0.75rem', color: '#fa8c16', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>{d.parasha.replace('פרשת ', '')}</span>}
                            {d.holiday && <span style={{ fontSize: '0.7rem', color: d.isMajorHoliday ? '#f5222d' : '#1890ff', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%', lineHeight: '1.1' }} title={d.holiday}>{d.holiday}</span>}
                        </button>
                    ) : <div key={i} style={{ minWidth: 0, height: '85px' }} />)}
                </div>
            </div>
        </div>
    );
}
