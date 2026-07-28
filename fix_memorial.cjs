const fs = require('fs');
let content = fs.readFileSync('d:/bc/src/components/MembersListModal.jsx', 'utf-8');

// Normalize to LF for easier matching
content = content.replace(/\r\n/g, '\n');

// Replace 1: Memorial section - add status and daysUntil to push objects
const oldPush = [
    '                    const upcomingMemorials = [];',
    '                    members.forEach(m => {',
    '                        const fatherYahrzeit = getYahrzeitIfWithin30Days(m.father_death_date);',
    '                        const motherYahrzeit = getYahrzeitIfWithin30Days(m.mother_death_date);',
    '',
    '                        const isFatherThisWeek = getYahrzeitIfInCurrentWeek(m.father_death_date);',
    '                        const isMotherThisWeek = getYahrzeitIfInCurrentWeek(m.mother_death_date);',
    '',
    '                        if (fatherYahrzeit && !isFatherThisWeek) {',
    '                            upcomingMemorials.push({',
    "                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),",
    '                                date: fatherYahrzeit.formatted,',
    '                                absDate: fatherYahrzeit.hdate.abs(),',
    "                                type: '\u05d0\u05d1'",
    '                            });',
    '                        }',
    '',
    '                        if (motherYahrzeit && !isMotherThisWeek) {',
    '                            upcomingMemorials.push({',
    "                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),",
    '                                date: motherYahrzeit.formatted,',
    '                                absDate: motherYahrzeit.hdate.abs(),',
    "                                type: '\u05d0\u05dd'",
    '                            });',
    '                        }',
    '                    });',
].join('\n');

const newPush = [
    '                    const upcomingMemorials = [];',
    '                    const _today = new HDate();',
    '                    const _upcomingShabbat = _today.onOrAfter(6);',
    '                    members.forEach(m => {',
    '                        const fatherYahrzeit = getYahrzeitIfWithin30Days(m.father_death_date);',
    '                        const motherYahrzeit = getYahrzeitIfWithin30Days(m.mother_death_date);',
    '',
    '                        const isFatherThisWeek = getYahrzeitIfInCurrentWeek(m.father_death_date);',
    '                        const isMotherThisWeek = getYahrzeitIfInCurrentWeek(m.mother_death_date);',
    '',
    "                        const _statusStr = String(m.status || '').trim();",
    '',
    '                        if (fatherYahrzeit && !isFatherThisWeek) {',
    '                            const daysUntil = fatherYahrzeit.hdate.abs() - _upcomingShabbat.abs();',
    '                            upcomingMemorials.push({',
    "                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),",
    '                                date: fatherYahrzeit.formatted,',
    '                                absDate: fatherYahrzeit.hdate.abs(),',
    '                                daysUntil: daysUntil,',
    "                                type: '\u05d0\u05d1',",
    '                                status: _statusStr',
    '                            });',
    '                        }',
    '',
    '                        if (motherYahrzeit && !isMotherThisWeek) {',
    '                            const daysUntil = motherYahrzeit.hdate.abs() - _upcomingShabbat.abs();',
    '                            upcomingMemorials.push({',
    "                                name: `${m.firstName || ''} ${m.lastName || ''}`.trim(),",
    '                                date: motherYahrzeit.formatted,',
    '                                absDate: motherYahrzeit.hdate.abs(),',
    '                                daysUntil: daysUntil,',
    "                                type: '\u05d0\u05dd',",
    '                                status: _statusStr',
    '                            });',
    '                        }',
    '                    });',
].join('\n');

if (content.includes(oldPush)) {
    content = content.replace(oldPush, newPush);
    console.log('Push replacement OK');
} else {
    console.log('Push pattern NOT found');
    // Debug: find the closest match
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const upcomingMemorials = []')) {
            console.log('Found upcomingMemorials at line', i + 1);
            for (let j = i; j < Math.min(i + 30, lines.length); j++) {
                console.log(j + 1 + ':', JSON.stringify(lines[j]));
            }
            break;
        }
    }
}

// Replace 2: Table headers - add status column
const oldHeaders = [
    '                                    <th style="color: #0066cc;">\u05e9\u05dd</th>',
    '                                    <th style="color: #0066cc;">\u05ea\u05d0\u05e8\u05d9\u05da</th>',
    '                                    <th style="color: #0066cc;">\u05e1\u05d5\u05d2</th>',
].join('\n');

const newHeaders = [
    '                                    <th style="color: #0066cc;">\u05e9\u05dd</th>',
    '                                    <th style="color: #0066cc;">\u05de\u05e2\u05de\u05d3</th>',
    '                                    <th style="color: #0066cc;">\u05ea\u05d0\u05e8\u05d9\u05da</th>',
    '                                    <th style="color: #0066cc;">\u05e1\u05d5\u05d2</th>',
].join('\n');

if (content.includes(oldHeaders)) {
    content = content.replace(oldHeaders, newHeaders);
    console.log('Headers replacement OK');
} else {
    console.log('Headers pattern NOT found');
}

// Replace 3: Table rows - add status and days
const oldRows = [
    '                                        <td style="color: #0066cc;">${memorial.name}</td>',
    '                                        <td style="color: #0066cc;">${memorial.date}</td>',
    '                                        <td style="color: #0066cc;">${memorial.type}</td>',
].join('\n');

const newRows = [
    '                                        <td style="color: #0066cc;">${memorial.name}</td>',
    '                                        <td style="color: #0066cc;">${memorial.status}</td>',
    '                                        <td style="color: #0066cc;">${memorial.date} <span style="font-size: 10pt;">(${memorial.daysUntil} \u05d9\u05de\u05d9\u05dd)</span></td>',
    '                                        <td style="color: #0066cc;">${memorial.type}</td>',
].join('\n');

if (content.includes(oldRows)) {
    content = content.replace(oldRows, newRows);
    console.log('Rows replacement OK');
} else {
    console.log('Rows pattern NOT found');
}

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');
fs.writeFileSync('d:/bc/src/components/MembersListModal.jsx', content);
console.log('File saved successfully');
