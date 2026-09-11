import React, { useState, useEffect } from 'react';
import { HDate } from '@hebcal/core';
import { isMobile } from '../config';
import { calculateZmanim } from '../utils/zmanimUtils';

export const ZmanimComponent = ({ cityName = '' }) => {
    const [zmanimData, setZmanimData] = useState(null);

    useEffect(() => {
        try {
            const now = new Date();
            const z = calculateZmanim(now, cityName);

            if (z) {
                const hd = new HDate(now);
                const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];
                const dayName = days[now.getDay()];
                const hebDate = hd.renderGematriya(true);
                const gregDate = now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric' });

                setZmanimData({
                    dateTitle: `${dayName}, ${hebDate} (${gregDate}) - ${z.cityName}`,
                    shacharit: `זמן שחרית: מ- ${z.shacharitStartFormatted} (הנץ החמה) עד ${z.shacharitEndFormatted} (סוף 4 שעות זמניות)`,
                    chatzot: `זמן חצות היום: ${z.chatzotFormatted} (6 שעות זמניות מהנץ החמה)`,
                    minchaGedola: `זמן מנחה גדולה: ${z.minchaGedolaFormatted}`,
                    minchaKetana: `זמן מנחה קטנה: מ- ${z.minchaKetanaStartFormatted} עד ${z.minchaKetanaEndFormatted} (זמן שקיעה)`,
                    arvit: `זמן ערבית: משקיעת החמה (${z.arvitStartFormatted})`
                });
            }
        } catch (e) {
            console.error('Error calculating Zmanim:', e);
        }
    }, [cityName]);

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
                <div>{zmanimData.chatzot}</div>
                <div>{zmanimData.minchaGedola}</div>
                <div>{zmanimData.minchaKetana}</div>
                <div>{zmanimData.arvit}</div>
            </div>
        </div>
    );
};

export default ZmanimComponent;
