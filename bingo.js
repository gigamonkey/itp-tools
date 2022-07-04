import { $ } from "./whjqah.js";
import { Variable, BooleanAnd, BooleanOr, BooleanEquals, BooleanNotEquals, BooleanNot } from "./booleans.js";

class Bingo {
  constructor(size) {
    this.rows = Array(size).fill(0);
    this.columns = Array(size).fill(0);
    this.diagonals = Array(2).fill(0);
  }

  track(row, col) {
    this.rows[row]++;
    this.columns[col]++;
    if (row === col) {
      this.diagonals[0]++;
    }
    if (col + row === 3) {
      this.diagonals[1]++;
    }
  }

  hasBingo() {
    return this.rows.some((r) => r === 4) || this.columns.some((c) => c === 4) || this.diagonals.some((d) => d === 4);
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

  const shuffled = [];
  for (let i = 0; i < xs.length; i++) {
    let j = Math.floor(Math.random() * (i + 1)); // 0 <= j <= i
    if (j !== i) {
      // if j != i then j < i so this is safe.
      shuffled[i] = shuffled[j];
    }
    shuffled[j] = xs[i];
  }
  return shuffled;
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
              $("#question").innerText = "Bingo!";
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
  const parent = cell.parentElement;
  const rect = cell.getBoundingClientRect();

  const spacer = $("<span>");
  spacer.classList.add("spacer");
  parent.insertBefore(spacer, cell);

  makeAbsolute(cell, rect);

  let ts = Date.now();
  let startTs = ts;
  let start = rect.x;
  let pos = start;
  let goingLeft = true;
  const pxPerMilli = 0.1;

  const move = () => {
    const now = Date.now();
    const elapsed = now - ts;
    ts = now;

    pos += (goingLeft ? -1 : 1) * elapsed * pxPerMilli;
    cell.style.left = `${pos}px`;
    if (Math.abs(pos - start) >= 2) {
      goingLeft = !goingLeft;
    }
    if (now - startTs < 500) {
      requestAnimationFrame(move);
    } else {
      makeUnabsolute(cell);
      parent.replaceChild(cell, spacer);
    }
  };
  requestAnimationFrame(move);
};

const makeAbsolute = (e, rect) => {
  e.style.setProperty("position", "absolute");
  e.style.setProperty("left", `${rect.x}px`);
  e.style.setProperty("top", `${rect.y}px`);
};

const makeUnabsolute = (e) => {
  e.style.removeProperty("position");
  e.style.removeProperty("left");
  e.style.removeProperty("top");
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
