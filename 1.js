/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

function binarySubdivide (aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
 for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
   var currentSlope = getSlope(aGuessT, mX1, mX2);
   if (currentSlope === 0.0) {
     return aGuessT;
   }
   var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
   aGuessT -= currentX / currentSlope;
 }
 return aGuessT;
}

function LinearEasing (x) {
  return x;
}

function bezier (mX1, mY1, mX2, mY2) {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  if (mX1 === mY1 && mX2 === mY2) {
    return LinearEasing;
  }

  // Precompute samples table
  var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  for (var i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  function getTForX (aX) {
    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }

  return function BezierEasing (x) {
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0) {
      return 0;
    }
    if (x === 1) {
      return 1;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};

// https://easings.net/
// https://github.com/gre/bezier-easing
const easeInQuart = bezier(0.165, 0.84, 0.44, 1)

let DEBUG = false
const sx = 0
const sy = 0
const sw = 600
const sh = 600
const S = sw*4/600 // size
const SPACING = 2
const CX = sw/2
const CY = sh/2

const N_ROTATING = sw*0.8
const L_ROTATING = 100

const N_SHOOTING = sw*0.2
const L_SHOOTING = 100

const MAX_GRAY = 256
const MIN_GRAY = 34

// Golden Ratio
const PHI = (1 + Math.sqrt(5)) / 2
const ALPHA_SHOOTING = 0
const ALPHA_ROTATING = 2

const rand = (min, max) => min + ((max-min) * Math.random())
const arr = x => Array.from({
	length: x
}, () => 0)

let pRotating, pShooting

function mouseClicked() {
  DEBUG = ! DEBUG
}

function setup() {
  createCanvas(sw, sh)

	frameRate(30)

	background('#222')
  fill('#FFF5')
	noStroke()
  ellipseMode(CENTER)

  // sunflower seed arrangements http://demonstrations.wolfram.com/SunflowerSeedArrangements/
  // https://stackoverflow.com/questions/28567166/uniformly-distribute-x-points-inside-a-circle#28572551
  const radius = (k,n,b) => {
    if (k>n-b) return 1
    return sqrt(k-.5)/sqrt(n-(b+1)/2)
  }

  getInitShooting = (k) => {
    const n = N_SHOOTING
    const b = round(ALPHA_SHOOTING*sqrt(n)) // number of boundary points
    const sTheta = 2*Math.PI*k/PHI^2
    const sR = radius(k, n, b) * sw/2
    const dTheta = rand(0, 2*Math.PI)
    const dR = rand(0, sh/2)
    return {
      sx: CX+sR*Math.cos(sTheta),
      sy: CY+sR*Math.sin(sTheta),
      dx: CX+dR*Math.cos(dTheta),
      dy: CY+dR*Math.sin(dTheta),
    }
  }
  pShooting = arr(N_SHOOTING)
    .map((_, k) => {
      return {
        ...getInitShooting(k),
        t : floor(rand(0, L_SHOOTING)),
        gray: rand(.5,1),
        s: rand(1, S),
      }
    })

  const n = N_ROTATING
  const b = round(ALPHA_ROTATING*sqrt(n)) // number of boundary points
  pRotating = arr(n)
    .map((_, k) => ({
      r: sw/2*radius(k, n, b),
      theta: 2*Math.PI*k/PHI^2,
      rotation: rand(-Math.PI/400, PI/400),
      t: rand(0, L_ROTATING),
      gray: rand(.5,1),
      s: rand(1, S)
    }))
}

const limit = (i, lim) => i < lim ? i : lim

function draw() {
  clear()
  if (DEBUG) {
    noFill()
    stroke('green')
    ellipse(CX, CY, sw, sh)
    fill(200)
    noStroke()
    text(frameRate().toFixed(2) + "fps", 0, 10)
  }

  const initOpacity = limit(frameCount/50, 1)

  for (const p of pRotating) {
    p.theta += p.rotation
    p.t += 1
    if (p.t >= L_ROTATING) {
      p.t = 0
      // make particles appear in a different place
      p.theta = rand(0, 2*Math.PI)
    }
    const { r, theta } = p
    const x = r*Math.cos(theta)
    const y = r*Math.sin(theta)
    const life = p.t/L_ROTATING
    const lifeRad = life*Math.PI
    const size = Math.max(0.5,Math.sin(lifeRad))*p.s
    const gray = Math.sin(lifeRad)*MAX_GRAY*initOpacity*p.gray
    fill(Math.max(gray, MIN_GRAY))
    ellipse(CX+x, CY+y, size, size)
    if (DEBUG) {
      fill('blue')
      ellipse(CX+x, CY+y, size, size)
    }
  }

  for (const p of pShooting) {
    if (p.t === L_SHOOTING) {
      p.t = 0
      const { sx, sy, dx, dy } = getInitShooting(rand(0, N_SHOOTING))
      p.sx = sx
      p.sy = sy
      p.dx = dx
      p.dy = dy
    }
    p.t+=1
    const life = p.t/L_SHOOTING
    const lifeRad = life*Math.PI
    const eased = easeInQuart(life)
    const x = p.sx+(p.dx - p.sx)*eased
    const y = p.sy+(p.dy - p.sy)*eased

    const gray = Math.sin(lifeRad)*MAX_GRAY*initOpacity
    fill(gray)
    const size = Math.max(0.5,Math.sin(lifeRad))*p.s
    ellipse(x, y, size, size)

    if (DEBUG) {
      fill('red')
      ellipse(p.dx, p.dy, S, S)
      fill('yellow')
      ellipse(p.sx, p.sy, S, S)
    }
  }
}
