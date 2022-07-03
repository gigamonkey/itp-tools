import { $ } from "./whjqah.js";
import { Variable, BooleanAnd, BooleanOr, BooleanEquals, BooleanNotEquals, BooleanNot } from "./booleans.js";

class Bingo {
  constructor() {
    this.rows = [[], [], [], []];
    this.columns = [[], [], [], []];
    this.diagonals = [[], []];
  }

  track(row, col) {
    this.rows[row].push([row, col]);
    this.columns[col].push([row, col]);
    if (row === col) {
      this.diagonals[0].push([row, col]);
    }
    if (col + row === 3) {
      this.diagonals[1].push([row, col])
    }
  }

  hasBingo() {
    return this.rows.some((r) => r.length === 4) ||
      this.columns.some((c) => c.length === 4) ||
      this.diagonals.some((d) => d.length === 4);
  }
}

const ops = [BooleanAnd, BooleanOr, BooleanEquals, BooleanNotEquals];
const a = new Variable("a");
const b = new Variable("b");

const andNot = (v) => [v, new BooleanNot(v)];

const flip = () => Math.random() < 0.5;

const choices = ops.flatMap((op) => andNot(a).flatMap((left) => andNot(b).map((right) => new op(left, right))));

const board = $("#board");

// The values of a and b and the desired value
let question = null;

// The positions that have been correctly identified
let correct = [];

let bingos = new Bingo();

const shuffled = (xs) => {
  // Based on pseudo code from
  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_%22inside-out%22_algorithm
  const sxs = [];
  for (let i = 0; i < xs.length; i++) {
    let j = Math.floor(Math.random() * (i + 1)); // 0 <= j <= i
    if (j !== i) {
      // if j != i then j < i so this is safe.
      sxs[i] = sxs[j];
    }
    sxs[j] = xs[i];
  }
  return sxs;
};

const fillBoard = () => {
  const cs = shuffled(choices);

  for (let i = 0; i < 4; i++) {
    const row = $("<div>");
    for (let j = 0; j < 4; j++) {
      const cell = $("<span>");
      const expr = cs[i * 4 + j];
      cell.classList.add("box");
      cell.innerText = expr.code();
      cell.onclick = (e) => {
        if (!cell.classList.contains("correct")) {
          if (expr.evaluate(question) === question.want) {
            cell.classList.add("correct");
            bingos.track(i, j);
            correct.push([i, j]);
            if (bingos.hasBingo()) {
              $("#question").innerText = 'Bingo!';
            } else {
              nextQuestion();
            }
          } else {
            shake(cell);
          }
        }
      };
      row.appendChild(cell);
    }
    board.appendChild(row);
  }
};

const shake = (cell) => {
  const rect = cell.getBoundingClientRect();
  const parent = cell.parentElement;

  const spacer = $("<span>");
  spacer.classList.add("spacer");

  cell.style.setProperty("position", "absolute");
  cell.style.setProperty("left", `${rect.x}px`);
  cell.style.setProperty("top", `${rect.y}px`);

  parent.replaceChild(spacer, cell);
  parent.appendChild(cell);

  let ts = Date.now();
  let startTs = ts;
  let start = rect.x;
  let pos = start;
  let goingLeft = true;
  const pxPerMilli = 0.1;

  const move = () => {
    const now = Date.now();
    const elapsed = now - ts;
    pos += (goingLeft ? -1 : 1) * elapsed * pxPerMilli;
    cell.style.left = `${pos}px`;
    if (Math.abs(pos - start) >= 2) {
      goingLeft = !goingLeft;
    }
    ts = now;
    if (now - startTs < 500) {
      requestAnimationFrame(move);
    } else {
      cell.style.removeProperty("position");
      cell.style.removeProperty("left");
      cell.style.removeProperty("top");
      parent.replaceChild(cell, spacer);
    }
  };
  requestAnimationFrame(move);
};


const nextQuestion = () => {
  $("#question").replaceChildren();
  question = { a: flip(), b: flip(), want: flip() };
  const ab = $("<p>");
  ab.innerHTML = `<code>a</code> is <code>${question.a}</code>; <code>b</code> is <code>${question.b}</code>`;
  const v = $("<p>");
  v.innerHTML = `Looking for <code>${question.want}</code>.`;
  $("#question").appendChild(ab);
  $("#question").appendChild(v);
};



fillBoard();
nextQuestion();
