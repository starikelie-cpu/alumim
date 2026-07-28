
function filterHebrew(text) {
    return text.replace('פרשת ', '').replace(/[^\u0590-\u05FF\s"\-'\u05F3\u05F4]/g, '').trim();
}

const testCases = [
    { input: "פרשת Bereshit", expected: "" },
    { input: "פרשת בראשית", expected: "בראשית" },
    { input: "פרשת Lech-Lecha (לך-לך)", expected: "לך-לך" },
    { input: "פרשת Vayera וירא", expected: "וירא" },
    { input: "שמחת תורה Simchat Torah", expected: "שמחת תורה" },
    { input: "א' סוכות", expected: "א' סוכות" }
];

console.log("Testing Hebrew Filter:");
testCases.forEach(({input, expected}) => {
    const result = filterHebrew(input);
    console.log(`Input: "${input}" -> Result: "${result}" (Match: ${result === expected})`);
});
