import hebcal from 'hebcal';

const today = new hebcal.HDate();
console.log('Today:', today.toString());
const shabbat = today.onOrAfter(6);
console.log('Shabbat:', shabbat.toString());
console.log('Haftarah:', shabbat.getHaftarah());
