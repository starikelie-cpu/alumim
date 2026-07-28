import hebcal from 'hebcal';

const today = new hebcal.HDate();
const shabbat = today.onOrAfter(6);
console.log('Shabbat:', shabbat.toString());
const events = shabbat.getEvents();
events.forEach(ev => {
    console.log('Event:', ev.desc);
    console.log('Keys:', Object.keys(ev));
    // If it's a parasha event, maybe it has more info?
    console.log('Properties:', JSON.stringify(ev, null, 2));
});
