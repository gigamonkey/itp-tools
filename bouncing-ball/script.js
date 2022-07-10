// Change these to change the physics of our world.
const bounce = 1.0;
const gravity = 0.002;
const ballSize = 15;

// The framework will draw the background for us. It also provides two
// functions:
//
// drawShadow(size, darkness) - draws an elliptical shadow on the ground below
// the ball at the given size and darkness.
//
// drawBall(height, size) - draws the ball at the given height and size.

let start = performance.now();

const drawFrame = (time) => {
  let h = height(time - start);
  drawShadow(shadowSize(h), shadowDarkness(h));
  drawBall(h, ballSize);
  if (h <= 0) {
    start = time;
  }
};

// Ball gets instantly accelerated to `bounce` when it hits the ground but
// gravity is also accelerating it downward. Thus average velocity from time 0
// to time t is `bounce - (gravity * t) / 2` and therefore the height at time t
// is t times the average velocity.
const height = (t) => Math.max(0, t * (bounce - (gravity * t) / 2));

// The higher we are, the lighter the shadow.
const shadowDarkness = (h) => 148 + 1.015 ** h;

// The higher we are, the bigger the shadow.
const shadowSize = (h) => 0.1 * (h + ballSize) + ballSize / 2;

// Call the animate function from the framework.
animate(drawFrame);
