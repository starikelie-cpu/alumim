
const members = [
    { id: 1, letter: 'A', aliyah_date: '01/01/2020', father_death_date: '', mother_death_date: '', lastName: 'Regular', firstName: 'BelowLimit', mockDays: 10 },
    { id: 2, letter: 'B', aliyah_date: '01/01/2020', father_death_date: '', mother_death_date: '', lastName: 'Regular', firstName: 'AboveLimit', mockDays: 30 }
];

function testFilter(limitInput, member) {
    const limit = parseInt(limitInput) || 0;

    // Mock Helpers
    const getDaysSinceAliyah = () => member.mockDays || 0;
    const getYahrzeitIfInCurrentWeek = () => false; // No Yahrzeit for these tests

    // Logic from Component
    // 1. אןת ריק (Empty letter)
    const isEmptyLetter = !member.letter || member.letter.trim() === '';
    if (isEmptyLetter) return { result: true, reason: 'Empty Letter' };

    const daysPassed = getDaysSinceAliyah(member.aliyah_date) || 0;
    const isYahrzeit = getYahrzeitIfInCurrentWeek(member.father_death_date) || getYahrzeitIfInCurrentWeek(member.mother_death_date);

    // 2. Yahrzeit
    if (isYahrzeit) return { result: true, reason: 'Yahrzeit' };

    // 3. Days passed > limit
    // If limit is 0 (empty), check if daysPassed > 0
    if (daysPassed > limit) return { result: true, reason: 'Days > Limit' };

    return { result: false, reason: `Days (${daysPassed}) <= Limit (${limit})` };
}

console.log("--- Testing Limit: 20 ---");
members.forEach(m => console.log(`${m.lastName} ${m.firstName}:`, testFilter("20", m)));
