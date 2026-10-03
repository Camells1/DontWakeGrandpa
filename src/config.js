// Don't Wake Grandpa: every number in one place. You are a bean about the size of a mouse.
// One unit is roughly a bean's arm; a bean stands 1.7 tall and Grandpa stands 40.
export const VERSION = "0.2.0";

export const HOUSE = { x0: -90, x1: 90, z0: -70, z1: 70, ceil: 64, split: 22 };   // living room west of split, kitchen east
export const DEN = { x: -99, z: 50, hx: 9, hz: 8 };                                // the mouse hole: safe, and where loot is banked
export const CHAIR = { x: -40, z: -18, seat: 9 };                                  // Grandpa's armchair (he faces the TV, -z)

export const PLAYER = {
  walk: 5.2, sprint: 8.6, crouch: 2.6, accel: 50, airAccel: 12, friction: 10, jump: 7.4, gravity: 22, coyote: 0.12, jumpBuffer: 0.14,
  health: 100, stamina: 100, eye: 1.55, crouchEye: 0.95, slideSpeed: 10.5, slideTime: 0.7
};

// Six hours of night in real seconds, then the quota for each night and how sharp Grandpa's ears are
export const NIGHTS = [
  { quota: 120, seconds: 330, hearing: 1.0, loot: 16, title: 'Night One', sub: 'He sleeps like a log. Probably.' },
  { quota: 220, seconds: 340, hearing: 1.15, loot: 19, roomba: 1, title: 'The Roomba', sub: 'It has a schedule. It does not care about yours.' },
  { quota: 330, seconds: 350, hearing: 1.3, loot: 22, roomba: 1, title: 'Creaky Boards', sub: 'He had a nap today. Light sleeper tonight.', creaky: 1.6 },
  { quota: 460, seconds: 360, hearing: 1.45, loot: 25, roomba: 1, clock: 70, title: 'The Cuckoo Clock', sub: 'It goes off every hour. Loudly.' },
  { quota: 620, seconds: 380, hearing: 1.6, loot: 28, roomba: 2, clock: 60, title: 'The Big Score', sub: 'Everything that is not nailed down.' }
];

export const NOISE = { stir: 45, wake: 100, decay: 3.6, decayStir: 2.0, awake: 26, awakeMax: 46 };

// Everything a bean can pick up. w: how many beans it takes to carry properly. v: what it is worth in the den.
// hit: [knock power, noise] when you whack a friend with it. use: what the left button does instead of swinging.
export const ITEMS = {
  coin:     { name: 'Coin', v: 12, w: 1, size: 1.5, hit: [5, 6], snd: 'metal' },
  button:   { name: 'Button', v: 6, w: 1, size: 1.1, hit: [3, 2], snd: 'tick' },
  cookie:   { name: 'Cookie', v: 16, w: 1, size: 2.0, hit: [4, 2], snd: 'soft', fragile: 9 },
  sugar:    { name: 'Sugar Cube', v: 8, w: 1, size: 0.9, hit: [3, 2], snd: 'tick' },
  cheese:   { name: 'Cheese', v: 24, w: 1, size: 2.0, hit: [5, 2], snd: 'soft' },
  marble:   { name: 'Marble', v: 10, w: 1, size: 0.9, hit: [6, 5], snd: 'glass', roll: 1 },
  candy:    { name: 'Wrapped Candy', v: 10, w: 1, size: 1.4, hit: [3, 3], snd: 'soft' },
  key:      { name: 'House Key', v: 22, w: 1, size: 2.6, hit: [6, 7], snd: 'metal' },
  ring:     { name: 'Wedding Ring', v: 45, w: 1, size: 1.3, hit: [4, 6], snd: 'metal', roll: 1 },
  thimble:  { name: 'Thimble', v: 14, w: 1, size: 1.1, hit: [4, 5], snd: 'metal' },
  tooth:    { name: 'Gold Tooth', v: 34, w: 1, size: 0.9, hit: [3, 3], snd: 'tick' },
  medal:    { name: 'War Medal', v: 55, w: 1, size: 1.8, hit: [6, 7], snd: 'metal' },
  battery:  { name: 'Battery', v: 12, w: 1, size: 1.7, hit: [7, 5], snd: 'metal', roll: 1 },
  stamp:    { name: 'Rare Stamp', v: 30, w: 1, size: 1.4, hit: [1, 0], snd: 'soft' },
  sock:     { name: 'Smelly Sock', v: 4, w: 1, size: 3.0, hit: [7, 1], snd: 'soft' },
  hearing:  { name: 'Hearing Aid', v: 70, w: 1, size: 1.2, hit: [3, 3], snd: 'tick' },           // steal it and he hears worse all night
  watch:    { name: 'Pocket Watch', v: 65, w: 2, size: 2.8, hit: [9, 9], snd: 'metal' },
  teeth:    { name: 'False Teeth', v: 55, w: 2, size: 2.6, hit: [8, 6], snd: 'clack', chatter: 1 }, // they chatter while you carry them
  glasses:  { name: 'Reading Glasses', v: 38, w: 2, size: 4.6, hit: [5, 5], snd: 'glass', fragile: 11 },
  remote:   { name: 'TV Remote', v: 40, w: 2, size: 5.0, hit: [10, 6], snd: 'plastic', use: 'remote' },
  spoon:    { name: 'Silver Spoon', v: 28, w: 2, size: 5.5, hit: [11, 12], snd: 'metal' },
  plate:    { name: "Grandma's China", v: 80, w: 2, size: 4.4, hit: [8, 14], snd: 'glass', fragile: 6 },
  camel:    { name: 'Golden Camel', v: 160, w: 2, size: 2.8, hit: [9, 9], snd: 'metal' },
  wallet:   { name: 'Wallet', v: 90, w: 3, size: 4.2, hit: [9, 3], snd: 'soft' },
  // not worth a penny, but excellent for hitting your friends
  pan:      { name: 'Frying Pan', v: 0, w: 1, size: 4.6, hit: [22, 26], snd: 'pan', tool: 1 },
  pillow:   { name: 'Pillow', v: 0, w: 1, size: 3.6, hit: [15, 0], snd: 'poof', tool: 1 },            // completely silent
  swatter:  { name: 'Fly Swatter', v: 0, w: 1, size: 4.4, hit: [12, 7], snd: 'slap', tool: 1 },
  baguette: { name: 'Stale Baguette', v: 0, w: 1, size: 5.0, hit: [16, 8], snd: 'thwack', tool: 1 },
  chicken:  { name: 'Rubber Chicken', v: 0, w: 1, size: 3.0, hit: [13, 12], snd: 'squeak', tool: 1 },
  paper:    { name: 'Rolled Newspaper', v: 0, w: 1, size: 4.4, hit: [11, 5], snd: 'slap', tool: 1 },
  fish:     { name: 'A Fish', v: 0, w: 1, size: 3.6, hit: [14, 6], snd: 'slap', tool: 1 },
  glove:    { name: 'Boxing Glove', v: 0, w: 1, size: 2.2, hit: [30, 9], snd: 'boing', tool: 1 },       // sends them across the room
  mallet:   { name: 'Squeaky Mallet', v: 0, w: 1, size: 3.6, hit: [18, 14], snd: 'squeak', tool: 1 },
  banana:   { name: 'Banana', v: 0, w: 1, size: 2.6, hit: [6, 2], snd: 'soft', tool: 1, use: 'banana' }, // eat it, drop the peel
  horn:     { name: 'Air Horn', v: 0, w: 1, size: 1.8, hit: [4, 4], snd: 'plastic', tool: 1, use: 'horn' }, // why would you
  whoopee:  { name: 'Whoopee Cushion', v: 0, w: 1, size: 2.4, hit: [5, 9], snd: 'toot', tool: 1, use: 'place' },
  radio:    { name: 'Lullaby Radio', v: 0, w: 1, size: 2.2, hit: [6, 5], snd: 'plastic', tool: 1, use: 'lullaby' },
  // troll items: for doing terrible things to your friends
  pie:      { name: 'Cream Pie', v: 0, w: 1, size: 2.2, hit: [3, 3], snd: 'soft', tool: 1, troll: 'Throw it or whack with it: SPLAT, they cannot see' },
  spring:   { name: 'Big Spring', v: 0, w: 1, size: 2.0, hit: [9, 8], snd: 'boing', tool: 1, use: 'place', trap: 1, troll: 'Put it down. Whoever steps on it goes into orbit' },
  glue:     { name: 'Pot of Glue', v: 0, w: 1, size: 1.8, hit: [5, 3], snd: 'soft', tool: 1, use: 'place', trap: 1, troll: 'Put it down. Whoever steps in it is stuck' },
  jack:     { name: 'Jack-in-the-box', v: 0, w: 1, size: 2.0, hit: [6, 6], snd: 'plastic', tool: 1, use: 'place', trap: 1, troll: 'Put it down. It punches whoever walks past' },
  bubble:   { name: 'Bubble Wrap', v: 0, w: 1, size: 2.6, hit: [2, 4], snd: 'soft', tool: 1, use: 'place', trap: 1, troll: 'Put it down in a doorway. Pop pop pop pop' },
  alarm:    { name: 'Alarm Clock', v: 0, w: 1, size: 1.6, hit: [7, 8], snd: 'metal', tool: 1, use: 'zap', troll: 'Click on a friend to stick it on their back. It goes off in 5 seconds' },
  helium:   { name: 'Helium Balloons', v: 0, w: 1, size: 2.4, hit: [2, 1], snd: 'soft', tool: 1, use: 'zap', troll: 'Click on a friend to tie them on. Up they go' },
  shrink:   { name: 'Shrink Ray', v: 0, w: 1, size: 2.2, hit: [5, 4], snd: 'plastic', tool: 1, use: 'zap', keep: 1, troll: 'Click on a friend: tiny bean with a tiny voice for 20 seconds' },
  magnet:   { name: 'Thieving Magnet', v: 0, w: 1, size: 1.8, hit: [6, 6], snd: 'metal', tool: 1, use: 'zap', keep: 1, troll: 'Click on a friend to yank whatever they are holding into your hands' },
  blower:   { name: 'Leaf Blower', v: 0, w: 1, size: 2.6, hit: [8, 7], snd: 'plastic', tool: 1, use: 'blow', troll: 'Hold click to blow your friends across the room. It is not quiet' }
};
export const TOOLS = ['pan', 'pillow', 'swatter', 'baguette', 'chicken', 'paper', 'fish', 'glove', 'mallet', 'banana', 'banana', 'horn', 'whoopee', 'radio', 'pie', 'pie', 'spring', 'glue', 'jack', 'bubble', 'alarm', 'helium', 'shrink', 'magnet', 'blower'];
// How often each kind of loot turns up (the rest are placed by hand: hearing aid, golden camel, remote, wallet)
export const LOOT_POOL = ['coin', 'coin', 'coin', 'coin', 'button', 'button', 'cookie', 'cookie', 'sugar', 'cheese', 'marble', 'marble', 'candy', 'candy', 'key', 'ring', 'thimble', 'tooth', 'medal',
  'battery', 'stamp', 'sock', 'watch', 'teeth', 'glasses', 'spoon', 'plate', 'coin', 'cookie', 'cheese'];

export const UPGRADES = [
  { id: 'socks', name: 'Fluffy Socks', icon: '🧦', desc: 'Your footsteps are 30% quieter per level.', cost: 60, max: 2 },
  { id: 'shoes', name: 'Springy Shoes', icon: '👟', desc: 'Jump higher and run 8% faster per level.', cost: 70, max: 2 },
  { id: 'arms', name: 'Bean Biceps', icon: '💪', desc: 'Heavy loot slows you down a lot less.', cost: 80, max: 2 },
  { id: 'tea', name: 'Sleepy Tea', icon: '🍵', desc: 'Slip it in his mug: he calms down faster and gives up the hunt sooner.', cost: 110, max: 2 },
  { id: 'helmet', name: 'Colander Helmet', icon: '🪖', desc: 'The first slipper each night only knocks you flying instead of flattening you.', cost: 120, max: 1 }
];

// Everything Grandpa says out loud (he really says them: the game speaks these lines)
export const LINES = {
  dream: ['No, Mildred... not the good biscuits.', 'Put the kettle on, there is a good lad.', 'Back in my day... we had proper mice.', 'Zzz... forty winks... that is all.', 'I was not asleep. I was resting my eyes.', 'Who moved my teeth?', 'Lovely bit of cheese, that.',
    'Turn that telly down.', 'Not the hip. Not the hip again.', 'Mildred, the cat is looking at me funny.', 'One more biscuit. Just the one.', 'I fought in the war for this armchair.'],
  mumble: ['Mmf. Mildred?', 'Who is there?', 'Is that the cat?', 'Hmph. What was that?', 'Five more minutes.', 'Is that the fridge?', 'Somebody there?', 'I can hear you, you know.', 'Hmm? Hmm.', 'That had better be the wind.'],
  wake: ["WHO IS IN MY HOUSE?", 'I HEARD THAT!', 'MICE! I KNEW IT!', 'WHERE ARE MY SLIPPERS?', 'RIGHT. YOU ARE FOR IT NOW!', 'WHAT IN THE BLAZES?', 'THAT IS IT. I AM UP!', 'BEANS! IN MY HOUSE!', 'I WAS HAVING A LOVELY DREAM!'],
  miss: ['Hold still!', 'Come here, you!', 'Blasted beans!', 'I will get you!', 'Stop wriggling!', 'I can see you!', 'Get out from under there!', 'You little rascals!', 'Where did you go?'],
  hit: ['HA! Got one!', 'That is one!', 'Flat as a pancake!', 'Have that!', 'Splat!', 'And stay down!'],
  sleep: ['Must have been the wind.', 'Hmf. Nothing.', 'I am too old for this.', 'Back to bed, then.', 'Probably the cat.', 'Imagining things again.'],
  slip: ['WHOA! MY HIP!', 'WHO LEFT THAT THERE?', 'OH NO NO NO NO!'],
  horn: ['WHAT WAS THAT RACKET?', 'IS THAT A FOGHORN?'], tv: ['Turn that DOWN!', 'I was watching that!']
};
export const TIPS = ['Crouch (Ctrl) to tiptoe. Tiptoeing is silent.', 'He can hear your real microphone. Whisper near him.', 'The rug is quiet. Creaky boards are not.', 'Hide under furniture when he wakes up.',
  'A pillow makes no noise when you hit a friend with it. A frying pan does.', 'Flat friends can be pumped back up. Hold E on them.', 'Heavy loot is faster with two beans carrying it.',
  'Steal his hearing aid and he hears worse for the rest of the night.', 'Banana peels work on Grandpa too.', 'Step out of the slipper shadow before it lands.'];
