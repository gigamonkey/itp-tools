const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

const horizonY = canvas.height * 0.625;
const landingY = horizonY + canvas.height * 0.125;
const ballX = canvas.width / 2;

const drawBackground = () => {
  drawSky();
  drawGround();
  drawHorizon();
};

const drawSky = () => {
  ctx.fillStyle = "#d6feff";
  ctx.fillRect(0, 0, canvas.width, horizonY);
};

const drawGround = () => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);
};

const drawHorizon = () => {
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(canvas.width, horizonY);
  ctx.stroke();
};

/*
 * Called from script.js to draw the shadow at the given size and darkness.
 */
const drawShadow = (size, darkness) => {
  const h = Math.round(darkness).toString(16).padStart(2, "0");
  ctx.fillStyle = `#${h}${h}${h}`;
  ctx.beginPath();
  ctx.ellipse(ballX, landingY, size, 10, 0, 0, 2 * Math.PI);
  ctx.fill();
};

/*
 * Called from script.js to draw the ball at the right place and size.
 */
const drawBall = (height, size) => {
  // Since height increases when the ball goes up, we need
  // to translate to a y coordinate that increases as the
  // ball goes down.
  let y = landingY - height - size / 2;
  ctx.fillStyle = "#4775ff";
  ctx.beginPath();
  ctx.ellipse(ballX, y, size, size, 0, 0, 2 * Math.PI);
  ctx.fill();
};

/*
 * Called from script.js to kick off the animation.
 */
const animate = (drawFrame) => {
  let running = true;

  const step = () => {
    drawBackground();
    drawFrame(performance.now());
    maybeStep();
  };

  const maybeStep = () => {
    if (running) {
      requestAnimationFrame(step);
    }
  };

  document.documentElement.onclick = (e) => {
    running = !running;
    maybeStep();
  };

  maybeStep();
};
