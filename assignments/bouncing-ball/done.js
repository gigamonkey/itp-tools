// Change these to change the physics of our world.
let bounce = 0.7;
let gravity = 0.001;
let ballSize = 15;

// The framework will draw the background for us. It also provides three
// functions we can use:
//
// drawShadow(size, darkness) - draws an elliptical shadow on the ground below
// the ball at the given size and darkness.
//
// drawBall(height, size) - draws the ball at the given height and size.
//
// now() - returns the current time in milliseconds.

// Implement this in terms of drawShadow(), drawBall() and the functions below.
// May also need to define a variable to keep track of when each bounce starts
// as the time value that is passed in is just the current time, i.e. the same
// thing we would get from calling now().

let start = now();

const drawFrame = (time) => {
  const h = height(time - start);
  drawShadow(shadowSize(h), shadowDarkness(h));
  drawBall(h, ballSize);
  if (h <= 0) {
    start = time;
  }
};

// Compute the height in pixels at time t after the ball hit the ground
const height = (t) => Math.max(0, t * (bounce - (gravity * t) / 2));

// The higher we are, the lighter the shadow.
const shadowDarkness = (h) => 148 + 1.015 ** h;

// The higher we are, the bigger the shadow.
const shadowSize = (h) => 0.1 * (h + ballSize) + ballSize / 2;

// Call the animate function from the framework.
animate(drawFrame);
