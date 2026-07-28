
const mockMembers = [
    { id: 1, firstName: 'A', lastName: 'A', letter: "א'", aliyah_date: '01/01/5784' }, // Alef, very old
    { id: 2, firstName: 'B', lastName: 'B', letter: "א", aliyah_date: '01/01/5784' },  // Alef (no tag), very old
    { id: 3, firstName: 'C', lastName: 'C', letter: "ג'", aliyah_date: '01/01/5784' }, // Gimel, very old
    { id: 4, firstName: 'D', lastName: 'D', letter: "", aliyah_date: '01/01/5784' },   // None, very old
    { id: 5, firstName: 'E', lastName: 'E', letter: "א'", aliyah_date: '10/06/5784' }, // Alef, recent (assume < 90 days)
    { id: 6, firstName: 'F', lastName: 'F', letter: "", aliyah_date: '10/06/5784' },   // None, recent
];

function getDaysSinceAliyahMock(date) {
    if (date === '01/01/5784') return 200;
    if (date === '10/06/5784') return 10;
    return Infinity;
}

function getYahrzeitMock(id) {
    return false; // For basic filter test
}

function testFilter(daysLimitStr) {
    const limitAmount = parseInt(daysLimitStr) || 0;
    console.log(`Testing with daysLimit: ${daysLimitStr} (parsed: ${limitAmount})`);

    const hasAlefFn = (m) => {
        return (Array.isArray(m.letter) && (m.letter.includes("א'") || m.letter.includes("א"))) || 
               (typeof m.letter === 'string' && (m.letter.includes("א'") || m.letter.includes("א")));
    };

    const alefMembers = mockMembers.filter(m => {
        const daysPassed = getDaysSinceAliyahMock(m.aliyah_date);
        return hasAlefFn(m) && daysPassed > limitAmount;
    });

    const printableMembers = mockMembers.filter(m => {
        const daysPassed = getDaysSinceAliyahMock(m.aliyah_date);
        const isYahrzeit = getYahrzeitMock(m.id);
        if (isYahrzeit) return true;
        
        const hasAlef = hasAlefFn(m);
        return !hasAlef && daysPassed > limitAmount;
    });

    console.log('--- Alef Members (Group C) ---');
    alefMembers.forEach(m => console.log(`${m.lastName} ${m.firstName} (${m.letter})`));
    
    console.log('--- Printable Members (Group A) ---');
    printableMembers.forEach(m => console.log(`${m.lastName} ${m.firstName} (${m.letter})`));
}

testFilter("90");
testFilter("");
testFilter("0");
