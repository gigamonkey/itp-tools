class Variable {
  constructor(name) {
    this.name = name;
  }

  code() { return this.name; }

  evaluate(env) {
    return env[this.name];
  }
}

class BooleanValue {
  constructor(value) {
    this.value = value;
  }

  code() { return this.value; }

  evaluate(env) { return this.value; }

}

class BooleanAnd {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() { return `${this.left.code()} && ${this.right.code()}`; }

  evaluate(env) {
    return this.left.evaluate(env) && this.right.evaluate(env);
  }
}


class BooleanOr {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() { return `${this.left.code()} || ${this.right.code()}`; }

  evaluate(env) {
    return this.left.evaluate(env) || this.right.evaluate(env);
  }
}

class BooleanEquals {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() { return `${this.left.code()} === ${this.right.code()}`; }

  evaluate(env) {
    return this.left.evaluate(env) === this.right.evaluate(env);
  }
}

class BooleanNotEquals {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() { return `${this.left.code()} !== ${this.right.code()}`; }

  evaluate(env) {
    return this.left.evaluate(env) !== this.right.evaluate(env);
  }
}

class BooleanNot {
  constructor(operand) {
    this.operand = operand;
  }

  code() { return `!${this.operand.code()}`; }

  evaluate(env) {
    return !this.operand.evaluate(env);
  }
}


const randomValue = () => new BooleanValue(Math.random() < 0.5);
const randomOp = () => [BooleanAnd, BooleanOr][Math.floor(Math.random() * 2)];

const a = new Variable("a");
const b = new Variable("b");

const choices =
      [BooleanAnd, BooleanOr, BooleanEquals, BooleanNotEquals].flatMap((op) =>
        [a, new BooleanNot(a)].flatMap((left) =>
          [b, new BooleanNot(b)].map((right) => new op(left, right))));


const board = document.getElementById("board");

const shuffled = (xs) => {
  const sxs = []
  for (let i = 0; i < xs.length; i++) {
    let j = Math.floor(Math.random() * (i + 1)); // 0 <= j <= i
    if (j !== i) {
      // if j != i then j < i so this is safe.
      sxs[i] = sxs[j];
    }
    sxs[j] = xs[i];
  }
  return sxs;
}

const cs = shuffled(choices);

for (let i = 0; i < 4; i++) {
  const row = document.createElement("div");
  for (let j = 0; j < 4; j++) {
    const cell = document.createElement("span");
    cell.classList.add("box");
    console.log(`adding ${i * 4 + j}`);
    cell.innerText = cs[i * 4 + j].code();
    row.appendChild(cell);
  }
  board.appendChild(row);
}
