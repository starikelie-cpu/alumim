import React, { useState, useEffect } from 'react';
import { Zmanim, GeoLocation, HDate } from '@hebcal/core';
import { isMobile } from '../config';

export const ZmanimComponent = () => {
    const [zmanimData, setZmanimData] = useState(null);

    useEffect(() => {
        try {
            const location = new GeoLocation('Israel', 31.778, 35.235, 800, 'Asia/Jerusalem');
            const now = new Date();
            const zman = new Zmanim(location, now, false);

            const sunrise = zman.sunrise();
            const sunset = zman.sunset();

            if (sunrise && sunset) {
                const dayMs = sunset.getTime() - sunrise.getTime();
                const shaahZmanitMs = dayMs / 12;

                const shacharitStart = sunrise;
                const shacharitEnd = new Date(sunrise.getTime() + 4 * shaahZmanitMs);

                const minchaGedola = new Date(sunrise.getTime() + 6.5 * shaahZmanitMs);

                const minchaKetanaStart = new Date(sunrise.getTime() + 9.5 * shaahZmanitMs);
                const minchaKetanaEnd = sunset;

                const arvitStart = sunset;

                const formatTime = (d) => d.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });

                const hd = new HDate(now);
                const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];
                const dayName = days[now.getDay()];
                const hebDate = hd.renderGematriya(true);
                const gregDate = now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric' });

                setZmanimData({
                    dateTitle: `${dayName}, ${hebDate} (${gregDate})`,
                    shacharit: `זמן שחרית: מ- ${formatTime(shacharitStart)} (הנץ החמה) עד ${formatTime(shacharitEnd)} (סוף 4 שעות זמניות)`,
                    minchaGedola: `זמן מנחה גדולה: ${formatTime(minchaGedola)}`,
                    minchaKetana: `זמן מנחה קטנה: מ- ${formatTime(minchaKetanaStart)} עד ${formatTime(minchaKetanaEnd)} (זמן שקיעה)`,
                    arvit: `זמן ערבית: משקיעת החמה (${formatTime(arvitStart)})`
                });
            }
        } catch (e) {
            console.error('Error calculating Zmanim:', e);
        }
    }, []);

    if (!zmanimData) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f5ff 100%)',
            border: '1px solid #adc6ff',
            borderRadius: '12px',
            padding: isMobile() ? '12px 16px' : '16px 28px',
            boxShadow: '0 4px 12px rgba(0, 39, 102, 0.08)',
            marginBottom: '12px',
            width: '100%',
            maxWidth: isMobile() ? '100%' : '600px',
            textAlign: 'center',
            color: '#002766',
            boxSizing: 'border-box'
        }}>
            <div style={{
                fontSize: isMobile() ? '16px' : '18px',
                fontWeight: 'bold',
                color: '#1d39c4',
                marginBottom: '8px',
                borderBottom: '1px solid #d6e4ff',
                paddingBottom: '6px'
            }}>
                📅 {zmanimData.dateTitle}
            </div>
            <div style={{
                fontSize: isMobile() ? '13px' : '14px',
                lineHeight: '1.8',
                color: '#262626',
                fontWeight: '500',
                textAlign: 'right',
                direction: 'rtl',
                padding: '0 8px'
            }}>
                <div>{zmanimData.shacharit}</div>
                <div>{zmanimData.minchaGedola}</div>
                <div>{zmanimData.minchaKetana}</div>
                <div>{zmanimData.arvit}</div>
            </div>
        </div>
    );
};

export default ZmanimComponent;
