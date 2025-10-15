// --- sketch.js --------------------------------------------------------------

/*
 Layout: 9 slots across the row

 i:    0   1   2   3   4   5   6   7   8
 dir:  <   <   <   <   >   <   <   >   >
 col:  R   B   B   B   R   R   B   R   B

 Reds (0,4,5,7) always exist.
 Blues (1,2,3,6,8) can appear/disappear independently.
*/

const SLOT_COUNT = 9;

// Colors (updated)
const RED  = '#143E4C'; // formerly "red" triangles
const BLUE = '#FB263B'; // formerly "blue" triangles
const BG   = '#275869';

// Per-slot direction: true = left "<", false = right ">"
const DIR_LEFT = [true, true, true, true, false, true, true, false, false];

// Per-slot color: true = blue, false = red
const IS_BLUE = [false, true, true, true, false, false, true, false, true];

let sharesPrev = new Array(SLOT_COUNT).fill(0);
let sharesNext = new Array(SLOT_COUNT).fill(0);

// Reds present, Blues off at start
let present = IS_BLUE.map(isB => !isB ? true : false);

let active = 0;                // index of currently emphasized triangle
let phaseStart = 0;

// ---- knobs ----
let phaseSeconds      = 2.0;   // duration of each grow/shrink phase
let maxShare          = 0.40;  // width share of the active triangle (0..1)

let blueAppearProb    = 0.25;  // per-phase chance each OFF blue turns ON
let blueDisappearProb = 0.18;  // per-phase chance each ON  blue turns OFF

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();

  // random starting distribution over present slots (reds only at start)
  randomizeShares(sharesPrev, present);
  sharesNext = makeTarget(active, present);
  phaseStart = millis();
}

function draw() {
  background(BG);

  const u = constrain((millis() - phaseStart) / (phaseSeconds * 1000), 0, 1);
  const eased = easeInOutCubic(u);

  // interpolate current shares
  const s = new Array(SLOT_COUNT);
  for (let i = 0; i < SLOT_COUNT; i++) s[i] = lerp(sharesPrev[i], sharesNext[i], eased);

  // compute x boundaries from shares
  const x = [0];
  for (let i = 0; i < SLOT_COUNT; i++) x.push(x[i] + s[i] * width);

  // draw triangles per-slot with configured direction/color
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (s[i] <= 1e-6) continue; // zero width -> invisible

    fill(IS_BLUE[i] ? BLUE : RED);

    if (DIR_LEFT[i]) {
      // "<"
      triangle(x[i], height/2, x[i+1], 0, x[i+1], height);
    } else {
      // ">"
      triangle(x[i+1], height/2, x[i], 0, x[i], height);
    }
  }

  // end of phase → update state
  if (u >= 1) {
    sharesPrev = sharesNext.slice();

    // stochastic blue toggles (independent; may cluster or separate randomly)
    for (const j of blueIndices()) {
      if (!present[j] && random() < blueAppearProb) present[j] = true;
      else if (present[j] && random() < blueDisappearProb) present[j] = false;
    }

    // advance active to next *present* slot
    active = nextActive(active, present);

    // ensure active is present (in case an active blue just disappeared)
    if (!present[active]) active = nextActive(active, present);

    sharesNext = makeTarget(active, present);
    phaseStart = millis();
  }
}

/* ---------- helpers ---------- */

// Build next target shares (sum to 1 across *present* slots; 0 for absent).
function makeTarget(activeIdx, presentArr) {
  const t = new Array(SLOT_COUNT).fill(0);

  const count = presentArr.reduce((a, p) => a + (p ? 1 : 0), 0);
  const othersShare = (1 - maxShare) / max(1, count - 1);

  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!presentArr[i]) continue;
    t[i] = othersShare;
  }
  if (presentArr[activeIdx]) t[activeIdx] = maxShare;

  // Normalize defensively to 1.0 (floating point safety)
  const sum = t.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < SLOT_COUNT; i++) t[i] /= sum;
  }
  return t;
}

// Random starting distribution over present slots (sum to 1)
function randomizeShares(arr, presentArr) {
  let r = 0;
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (presentArr[i]) {
      arr[i] = random(0.1, 1.0);
      r += arr[i];
    } else arr[i] = 0;
  }
  if (r === 0) return;
  for (let i = 0; i < SLOT_COUNT; i++) if (presentArr[i]) arr[i] /= r;
}

// next present index after `i`
function nextActive(i, presentArr) {
  for (let k = 1; k <= SLOT_COUNT; k++) {
    const j = (i + k) % SLOT_COUNT;
    if (presentArr[j]) return j;
  }
  return i; // fallback (shouldn't happen)
}

// Color/indices helpers
function isBlue(i){ return IS_BLUE[i]; }
function* blueIndices(){ for (let i = 0; i < SLOT_COUNT; i++) if (IS_BLUE[i]) yield i; }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------- EASING CURVES ----------------

function easeInOutCubic(t){
  return t < 0.5 ? 4*t*t*t : 1 - pow(-2*t + 2, 3)/2;
}

/* Alternatives to try:

function easeInOutSine(t){ return 0.5 * (1 - cos(PI * t)); }
function easeInOutQuad(t){ return t < 0.5 ? 2*t*t : 1 - pow(-2*t + 2, 2)/2; }
function easeInOutQuint(t){ return t < 0.5 ? 16*t*t*t*t*t : 1 - pow(-2*t + 2, 5)/2; }

*/
