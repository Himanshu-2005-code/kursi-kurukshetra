// The cast. Every character here is fictional: invented names, invented
// faces, satire of political *types* rather than any real person.
//
// Special input slots: fwdP (→+Punch), fwdK (→+Kick), downP (↓+Punch).
// ↓+Kick is the shared sweep. Super is L / Space when the meter is full.

export const ROSTER = [
  {
    id: 'bhashan',
    name: 'BHASHAN SINGH',
    title: 'THE ORATOR · 40 YEARS IN THE HOUSE',
    stats: { speed: 0.9, power: 1.1, health: 1050 },
    voice: { pitch: 0.75, rate: 0.95 },
    color: '#ff9a1f',
    look: {
      height: 0.98, build: 1.04, belly: 0.65, age: 0.85, jowl: 0.6,
      skin: '#c68e63',
      hair: { style: 'baldSides', color: '#ece8df', beard: '#f2efe8', brow: '#d9d4ca' },
      moustache: 'thick', glasses: 'round',
      top: { type: 'kurta', color: '#efe6cf', trim: '#b9a77d' },
      vest: { style: 'nehru', color: '#6e1f2a' },
      bottom: { type: 'pajama', color: '#f1ead8' },
      shoes: '#5a3a22', garland: true, prop: 'mic',
    },
    specials: {
      fwdP: { kind: 'projectile', name: 'MIC DROP WAVE', proj: 'wave', speed: 9, dmg: 70, startup: 14, recovery: 22 },
      fwdK: { kind: 'rush', name: 'WALKOUT', dmg: 90, speed: 13, frames: 18, startup: 8, recovery: 20 },
      downP: { kind: 'uppercut', name: 'POINT OF ORDER!', dmg: 100, startup: 5, recovery: 26 },
    },
    super: { kind: 'beam', name: 'THE 3-HOUR SPEECH', dmg: 330 },
    lines: {
      intro: [
        'Bhaiyon aur behno... this will be a short speech. Three hours only.',
        'I have been fighting since before your party was founded!',
        'Mic check, mic check... perfect acoustics for your defeat.',
      ],
      taunt: ['Point of order!', 'Sit down, sit down!', 'Shaanti! Shaanti!'],
      super: 'Bhaiyon aur behno... THE 3-HOUR SPEECH!',
      win: [
        'The House accepts the resignation of your career.',
        'Speech khatam. You also khatam.',
        'Next time bring a chair. You will need to sit down.',
      ],
      lose: ['I demand a recount!', 'This is a foreign conspiracy!'],
    },
  },
  {
    id: 'manifesto',
    name: 'MANIFESTO DEVI',
    title: 'QUEEN OF PROMISES',
    stats: { speed: 1.05, power: 0.95, health: 980 },
    voice: { pitch: 1.35, rate: 1.05 },
    color: '#1fb5a8',
    look: {
      height: 0.93, build: 0.92, belly: 0.25, age: 0.45,
      skin: '#b97a52',
      hair: { style: 'bun', color: '#1d1512' },
      bindi: true, glasses: 'gold',
      top: { type: 'saree', color: '#127a78', trim: '#e7b93c', pallu: '#0f6664', sleeves: 'short' },
      sleeve: '#a8323a',
      bottom: { type: 'saree', color: '#127a78' },
      shoes: '#7a2b2b', prop: 'scroll', watch: true,
    },
    specials: {
      fwdP: { kind: 'whip', name: 'PROMISE SCROLL', dmg: 85, reach: 230, startup: 12, recovery: 22 },
      fwdK: { kind: 'projectile', name: 'FREEBIE TOSS', proj: 'gift', speed: 7, arc: true, dmg: 75, startup: 12, recovery: 22 },
      downP: { kind: 'uppercut', name: 'COALITION SPIN', dmg: 95, startup: 6, recovery: 24 },
    },
    super: { kind: 'rain', name: 'FREE EVERYTHING!', dmg: 320 },
    lines: {
      intro: [
        'Free WiFi, free laptops, free defeat. All for you!',
        'Section 4, Point 12 of my manifesto: you lose.',
        'I promise this will not hurt. I also promised roads.',
      ],
      taunt: ['Pakka promise!', 'Read the fine print!', 'Terms and conditions apply!'],
      super: 'Election season special... FREE EVERYTHING!',
      win: [
        'Promise fulfilled. First time ever!',
        'Your deposit is forfeited, darling.',
        'Manifesto page one: Win. Done.',
      ],
      lose: ['That promise was... a printing mistake!'],
    },
  },
  {
    id: 'babu',
    name: 'BABU FILEWALA',
    title: 'PENDING SINCE 1987',
    stats: { speed: 0.88, power: 1.0, health: 1040 },
    voice: { pitch: 0.95, rate: 0.85 },
    color: '#c9a86a',
    look: {
      height: 0.96, build: 0.98, belly: 0.4, age: 0.65,
      skin: '#d1a07a',
      hair: { style: 'slick', color: '#1b1a18' },
      moustache: 'thin', glasses: 'rect',
      top: { type: 'safari', color: '#b9a27a', sleeves: 'short' },
      bottom: { type: 'trousers', color: '#a8916a' },
      shoes: '#3a2a1e', pens: true, prop: 'file', watch: true,
    },
    specials: {
      fwdP: { kind: 'projectile', name: 'PENDING FILE', proj: 'file', speed: 10, dmg: 65, stun: 22, startup: 12, recovery: 20 },
      fwdK: { kind: 'whip', name: 'RED TAPE LASH', dmg: 80, reach: 210, startup: 11, recovery: 22, color: '#d0262b' },
      downP: { kind: 'overhead', name: 'RUBBER STAMP', dmg: 105, startup: 16, recovery: 20 },
    },
    super: { kind: 'bind', name: 'RED TAPE', dmg: 330 },
    lines: {
      intro: [
        'Fill Form 27-B. In triplicate. Then we fight.',
        'Come back tomorrow. Actually, stay. I will finish you today.',
        'Your application for victory is... pending.',
      ],
      taunt: ['Lunch break!', 'Where is your NOC?', 'Not my department!'],
      super: 'Application REJECTED! RED TAPE!',
      win: [
        'File closed. Case closed. You closed.',
        'Your victory application is rejected. Kindly reapply in 2047.',
        'Stamp. Sign. Done.',
      ],
      lose: ['I will be transferred for this...'],
    },
  },
  {
    id: 'thekedar',
    name: 'THEKEDAR TOLANI',
    title: 'BUILDER OF FLYOVERS (SOME STILL STANDING)',
    stats: { speed: 0.8, power: 1.25, health: 1120 },
    voice: { pitch: 0.65, rate: 1.0 },
    color: '#ffcc00',
    look: {
      height: 1.02, build: 1.14, belly: 1.0, age: 0.4, jowl: 0.8, smirk: true,
      skin: '#a86f46',
      hair: { style: 'short', color: '#151210' },
      moustache: 'handlebar', headwear: 'hardhat',
      top: { type: 'shirt', color: '#f4f2ec', sleeves: 'short' },
      bottom: { type: 'trousers', color: '#2b2d33' },
      shoes: '#4a2a14', chain: true, watch: true, prop: 'trowel',
    },
    specials: {
      fwdP: { kind: 'projectile', name: 'CEMENT SACK', proj: 'cement', speed: 7.5, arc: true, dmg: 95, startup: 16, recovery: 26 },
      fwdK: { kind: 'rush', name: 'BULLDOZER CHARGE', dmg: 110, speed: 11, frames: 24, startup: 10, recovery: 24, armor: true },
      downP: { kind: 'projectile', name: 'GROUND BREAKING', proj: 'crack', speed: 8, dmg: 80, low: true, startup: 14, recovery: 24 },
    },
    super: { kind: 'trap', name: 'POTHOLE OF DOOM', dmg: 350 },
    lines: {
      intro: [
        'This road was built in one night. So will your defeat.',
        'Quality? Sab first class. Mostly.',
        'Commission first, fight later.',
      ],
      taunt: ['Tender is mine!', 'Cement is cement, bhai!', 'Under construction!'],
      super: 'Inaugurating your new road... POTHOLE OF DOOM!',
      win: [
        'Flyover inaugurated. On top of you.',
        'Budget overrun? You were the overrun.',
        'Contract renewed for five more years.',
      ],
      lose: ['The bridge fell? It was the rain! Always the rain!'],
    },
  },
  {
    id: 'yuva',
    name: 'CHIRAG "YUVA" KUMAR',
    title: 'YOUTH ICON · 2M FOLLOWERS',
    stats: { speed: 1.22, power: 0.9, health: 950 },
    voice: { pitch: 1.15, rate: 1.2 },
    color: '#4fc3ff',
    look: {
      height: 1.0, build: 0.94, belly: 0, age: 0,
      skin: '#c48a60',
      hair: { style: 'quiff', color: '#231a14' },
      beard: 'stubble',
      top: { type: 'kurta', color: '#e9f1f6', trim: '#7aa9c7' },
      bottom: { type: 'jeans', color: '#2c4a72' },
      shoes: '#f2f2f2', prop: 'phone', watch: true, lanyard: '#ff5a36',
    },
    specials: {
      fwdP: { kind: 'projectile', name: 'SELFIE FLASH', proj: 'flash', speed: 14, dmg: 50, stun: 34, life: 18, startup: 9, recovery: 20 },
      fwdK: { kind: 'rush', name: 'ROADSHOW RUSH', dmg: 80, speed: 16, frames: 16, startup: 6, recovery: 18, pose: 'jumpKick' },
      downP: { kind: 'uppercut', name: 'TRENDING UPPERCUT', dmg: 95, startup: 4, recovery: 24 },
    },
    super: { kind: 'stream', name: 'GOING VIRAL', dmg: 310 },
    lines: {
      intro: [
        'Hey guys! Like, share, and get defeated!',
        'This fight is live-streamed. Smile for your downfall!',
        'Fresh energy. Old politics. New outfit.',
      ],
      taunt: ['Hashtag Defeated!', 'Swipe up!', 'Live from the arena!'],
      super: 'Smash that like button... GOING VIRAL!',
      win: [
        'Uploading your defeat in 4K.',
        'Two million likes. Zero sympathy.',
        'Youth power! Also, follow me.',
      ],
      lose: ['Delete that video. Delete it right now!'],
    },
  },
  {
    id: 'dalbadlu',
    name: 'DAL-BADLU LAL',
    title: 'MEMBER OF EVERY PARTY',
    stats: { speed: 1.05, power: 1.0, health: 1000 },
    voice: { pitch: 1.0, rate: 1.1 },
    color: '#9b59b6',
    look: {
      height: 0.97, build: 1.0, belly: 0.45, age: 0.55, smirk: true,
      skin: '#bb8259',
      hair: { style: 'silver', color: '#8f8c86' },
      moustache: 'thin',
      top: { type: 'kurta', color: '#f0e2c4', trim: '#b49c6c' },
      vest: { style: 'reversible', color: '#6a3d9a', color2: '#e1b12c' },
      bottom: { type: 'pajama', color: '#efe4cc' },
      shoes: '#4b2e1c', badge: '#e1b12c',
    },
    specials: {
      fwdP: { kind: 'teleport', name: 'SWITCH SIDES', dmg: 85, startup: 14, recovery: 20 },
      fwdK: { kind: 'rush', name: 'FLOOR CROSSING', dmg: 75, speed: 12, frames: 18, startup: 8, recovery: 20, low: true, pose: 'sweep' },
      downP: { kind: 'counter', name: 'FENCE SITTER', dmg: 120, window: 26, recovery: 18 },
    },
    super: { kind: 'stampede', name: 'HORSE TRADING', dmg: 320 },
    lines: {
      intro: [
        'I was on your side yesterday. Let us not talk about it.',
        'Ideology? I have seven. Pick one.',
        'Whichever side wins, I am already on it.',
      ],
      taunt: ['Which party am I in today?', 'Resort is booked!', 'Make me an offer!'],
      super: 'Bring the horses... HORSE TRADING!',
      win: [
        'Joined the winning side. As always.',
        'Thank you for your support. And your seat.',
        'Same chair. New party.',
      ],
      lose: ['Okay okay, I am joining your party now!'],
    },
  },
  {
    id: 'highcommand',
    name: 'HIGH COMMAND',
    title: 'DECIDES EVERYTHING · SAYS NOTHING',
    boss: true,
    stats: { speed: 1.0, power: 1.2, health: 1300 },
    voice: { pitch: 0.55, rate: 0.85 },
    color: '#e33b3b',
    look: {
      height: 1.06, build: 1.05, belly: 0.15, age: 0.75, smirk: true,
      skin: '#c08a62',
      hair: { style: 'slick', color: '#c9c9c9' },
      glasses: 'shades',
      top: { type: 'shirt', color: '#1a1c22' },
      vest: { style: 'suit', color: '#1a1c22', long: true, shirt: '#e9e9e9', tie: '#5a0f12' },
      sleeve: '#1a1c22',
      bottom: { type: 'trousers', color: '#15161b' },
      shoes: '#0b0b0d', watch: true,
    },
    specials: {
      fwdP: { kind: 'projectile', name: 'TICKET DENIED', proj: 'ticket', speed: 13, dmg: 70, startup: 10, recovery: 18 },
      fwdK: { kind: 'whip', name: 'WHIP ISSUED', dmg: 95, reach: 250, startup: 10, recovery: 20, color: '#111' },
      downP: { kind: 'teleport', name: 'SILENT ORDER', dmg: 100, startup: 12, recovery: 18 },
    },
    super: { kind: 'cinematic', name: 'CABINET RESHUFFLE', dmg: 360 },
    lines: {
      intro: [
        'Nobody told me you would be here. So nobody will remember.',
        'I do not contest elections. I decide them.',
        'Your ticket? Cancelled.',
      ],
      taunt: ['Noted.', 'We will see.', 'No comments.'],
      super: 'The decision has been made... CABINET RESHUFFLE!',
      win: ['Your services are no longer required.', 'Resignation accepted. Effective immediately.'],
      lose: ['...This meeting never happened.'],
    },
  },
];

export const byId = (id) => ROSTER.find((c) => c.id === id);

// Mirror-match palette swap so two copies of the same neta are distinguishable.
export function altLook(look) {
  const swap = (c) => {
    if (!c) return c;
    const h = c.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return '#' + [b, r, g].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const out = JSON.parse(JSON.stringify(look));
  out.top.color = swap(out.top.color);
  if (out.vest) out.vest.color = swap(out.vest.color);
  out.bottom.color = swap(out.bottom.color);
  if (out.sleeve) out.sleeve = swap(out.sleeve);
  return out;
}
