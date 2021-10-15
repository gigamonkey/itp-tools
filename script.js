import { $, clear, withClass } from "./whjqah.js";
import { shuffleArray } from "./shuffle.js";

// Basic plan.

// Generate a bunch of random expressions whose complexity is based on
// the current level. (E.g. initially just simple values, maybe of one type;
// later more complex expressions.) These make up the palette for a level.

// Levels (values):
//  0: just numbers
//  1: just strings and numbers for indices.
//  2: just booleans
//  3: numbers and strings
//  4: homogeneous arrays
//  5: numbers, strings, booleans, and homogenous arrays
//  6: add heterogenous arrays but no nesting
//  7: add nested heterogenous arrays
//  8: arithmetic expressions
//  9: string expressions

// Then generate random questions: pick one or more expressions at random
// and then generate a random expression with that many holes in it and
// evaluate it with the selected expressions to get the result. By construction
// the expressions needed to fill the holes exist.

let types = ["number", "string", "boolean", "array"];

let minNumber = 0;
let maxNumber = 10;
let words = ["food", "orange", "duck", "computer", "grue"];
let maxArrayLength = 3;

class Generator {
  number() {
    return this.int(minNumber, maxNumber);
  }

  nonZeroNumber() {
    return this.int(1, maxNumber);
  }

  string() {
    return this.choice(words);
  }

  boolean() {
    return Math.random() < 0.5;
  }

  array() {
    return Array(this.int(maxArrayLength + 1))
      .fill()
      .map(this.arrayTypeFunction().bind(this));
  }

  value() {
    return this.typeFunction().bind(this)();
  }

  valueOf(type) {
    return this[type]();
  }

  oneOf(types) {
    return this.valueOf(this.choice(types));
  }

  valueForLevel(level) {
    switch (level) {
      case 0:
        return this.number();
      case 1:
        return this.oneOf(["number", "string"]);
      default:
        console.log("level " + level + " nyi");
    }
  }

  values(n) {
    return Array(n).fill().map(this.value.bind(this));
  }

  int(min, max) {
    if (max === undefined) {
      [min, max] = [0, min];
    }
    return min + Math.floor(Math.random() * (max - min));
  }

  choice(choices) {
    return choices[this.int(choices.length)];
  }

  arrayTypeFunction() {
    return this.choice([this.number, this.string, this.boolean]);
  }

  typeFunction() {
    return this.choice([this.number, this.string, this.boolean, this.array]);
  }
}

let g = new Generator();

class Value {
  constructor(value) {
    this.value = value;
  }
  evaluate() {
    return this.value;
  }
  render(parent) {
    parent.append($(JSON.stringify(this.value)));
  }

  fillBlank(value) {
    return this;
  }

  blankValue() {
    return undefined;
  }
}

/*
 * A blank spot in an expression that needs to be filled in though it does
 * have a particular value associated with it.
 */
class Blank extends Value {
  render(parent) {
    parent.append(withClass("hole", $("<span>", "?")));
  }
  fillBlank(value) {
    return new Value(value);
  }
  blankValue() {
    return this.value;
  }
}

class BinaryOp {
  constructor(left, right, op) {
    this.left = left;
    this.right = right;
    this.op = op;
  }
  evaluate() {
    return ops[this.op](this.left.evaluate(), this.right.evaluate());
  }
  render(parent) {
    this.left.render(parent);
    if (this.op === "[]") {
      parent.append($("["));
      this.right.render(parent);
      parent.append($("]"));
    } else {
      parent.append($(" " + this.op + " "));
      this.right.render(parent);
    }
  }

  /*
   * Produce a BinaryOp with the blank value filled in with the given value.
   */
  fillBlank(value) {
    return new BinaryOp(
      this.left.fillBlank(value),
      this.right.fillBlank(value),
      this.op
    );
  }

  /*
   * Get the value of the blank spot in this expression.
   */
  blankValue() {
    return this.left.blankValue() ?? this.right.blankValue();
  }
}

class PrefixOp {
  constructor(operand, op) {
    this.operand = operand;
    this.op = op;
  }

  evaluate() {
    return ops[this.op](this.operand.evaluate());
  }

  render(parent) {
    parent.append($(this.op));
    this.operand.render(parent);
  }

  fillBlank(value) {
    return new PrefixOp(this.operand.fillBlank(value), this.op);
  }

  blankValue() {
    return this.operand.blankValue();
  }
}

function numeric(op) {
  return (blankValue) => pickASide(blankValue, g.number(), op);
}

function any(op) {
  return (blankValue) => pickASide(blankValue, g.value(), op);
}

function boolean(op) {
  return (blankValue) => pickASide(blankValue, g.boolean(), op);
}

function sameType(op) {
  return (blankValue) => pickASide(blankValue, g.valueOf(type(blankValue)), op);
}

function prefix(op) {
  return (blankValue) => new PrefixOp(blankValue, op);
}

function divide(op) {
  return (blankValue) => {
    if (blankValue === 0) {
      return blankOnLeft(blankValue, g.nonZeroNumber(), op);
    } else if (blankValue == 1) {
      return blankOnLeft(blankValue, g.choice([2, 3, 4]), op);
    } else {
      let fs = factors(blankValue);
      if (fs.length > 0) {
        return blankOnLeft(blankValue, g.choice(fs), op);
      } else {
        return blankOnRight(g.choice([2, 3]) * blankValue, blankValue, op);
      }
    }
  };
}

function modulus(op) {
  return (blankValue) => {
    if (blankValue === 0) {
      return blankOnLeft(blankValue, g.nonZeroNumber(), op);
    } else {
      return pickASide(blankValue, g.nonZeroNumber(), op);
    }
  };
}

function index(op) {
  return (blankValue) => {
    let t = type(blankValue);
    if (t === "string" || t === "array") {
      return blankOnLeft(blankValue, g.int(0, blankValue.length), op);
    } else {
      // FIXME: move to generator and add possibility of getting array
      let s = "abcdefghijklmnopqrstuvwxyz".substring(
        0,
        Math.floor(blankValue * 1.5)
      );
      return blankOnRight(s, blankValue, op);
    }
  };
}

function blankOnLeft(left, right, op) {
  return new BinaryOp(new Blank(left), new Value(right), op);
}

function blankOnRight(left, right, op) {
  return new BinaryOp(new Value(left), new Blank(right), op);
}

function pickASide(blankValue, otherValue, op) {
  if (Math.random() < 0.5) {
    return blankOnLeft(blankValue, otherValue, op);
  } else {
    return blankOnRight(otherValue, blankValue, op);
  }
}

let operatorsForType = {
  number: ["+", "-", "*", "/", "%", "<", "<=", ">", ">=", "===", "!=="],
  string: ["+", "[]", "===", "!=="],
  boolean: ["&&", "||", "!", "===", "!=="],
  array: ["[]", "===", "!=="],
};

function op(fn, constructor) {
  return { fn: fn, constructor: constructor };
}

const ops = {
  "+": op((a, b) => a + b, sameType),
  "-": op((a, b) => a - b, numeric),
  "*": op((a, b) => a * b, numeric),
  "/": op((a, b) => a / b, divide),
  "%": op((a, b) => a % b, modulus),
  "<": op((a, b) => a < b, numeric),
  "<=": op((a, b) => a <= b, numeric),
  ">": op((a, b) => a > b, numeric),
  ">=": op((a, b) => a >= b, numeric),
  "===": op((a, b) => a === b, any),
  "!==": op((a, b) => a !== b, any),
  "[]": op((a, b) => a[b], index),
  "&&": op((a, b) => a && b, boolean),
  "||": op((a, b) => a || b, boolean),
  "!": op((a) => !a, prefix),
};

function forBlank(blankValue) {
  const op = g.choice(operatorsForType[type(blankValue)]);
  return ops[op].constructor(op)(blankValue);
}

// Get the type as far as we are concerned.
function type(value) {
  let t = typeof value;
  switch (t) {
    case "number":
    case "string":
    case "boolean":
      return t;
    default:
      return Array.isArray(value) ? "array" : "unknown";
  }
}

let model = {
  currentAnswers: {},
  level: 1,
};

function init() {
  model.currentAnswers = uniqueAnswers();
  populateAnswers(model.currentAnswers);
  clear($("#results"));
  setQuestion();
}

function populateAnswers(currentAnswers) {
  const answers = Object.keys(currentAnswers);
  shuffleArray(answers);

  const div = $("#answers");
  for (const json of answers) {
    let v = answers[json];
    let b = $("<button>", json);
    b.value = json;
    b.onclick = onAnswer;
    div.append(b);
  }
}

function setQuestion() {
  const answers = Object.values(model.currentAnswers);
  if (answers.length > 0) {
    let a = g.choice(answers);
    let expr = forBlank(a);
    model.currentQuestion = expr;
    showExpression(expr, clear($("#question")));
  } else {
    //model.level++;
    init();
  }
}

function onAnswer(e) {
  const answer = JSON.parse(e.target.value);
  const answered = model.currentQuestion.fillBlank(answer);
  delete model.currentAnswers[e.target.value];
  e.target.parentElement.removeChild(e.target);
  logAnswer(model.currentQuestion, answer);
  setQuestion();
}

function logAnswer(expr, got) {
  // We can't just compare the answer we got to the answer
  // we used to create the question because there could be
  // multiple answers that would get the same result (e.g.
  // consider ? * 0 ==> 0.)
  const expected = expr.blankValue();
  const withGot = expr.fillBlank(got);
  const typeRight = type(got) === type(expected);
  const valueRight = withGot.evaluate() === expr.evaluate();
  const passed = typeRight && valueRight;

  const row = $("#results").insertRow(0);
  row.className = passed ? "pass" : "fail";
  showExpression(expr, row.insertCell());
  row.insertCell().append(withClass("mono", $("<span>", JSON.stringify(got))));
  const resultCell = row.insertCell();
  if (passed) {
    resultCell.append($("✅"));
  } else if (typeRight) {
    const e = JSON.stringify(expected);

    resultCell.append($("❌: right type but wrong value. "));
    resultCell.append(withClass("mono", $("<span>", e)));
    resultCell.append($(" would have worked"));
  } else {
    resultCell.append($(`❌: expected a ${type(expected)}`));
  }
}

function showExpression(expr, where) {
  const s1 = withClass("mono", $("<span>"));
  const s2 = withClass("mono", $("<span>"));
  expr.render(s1);
  s2.append($(JSON.stringify(expr.evaluate())));
  where.append(s1);
  where.append($(" ⟹ "));
  where.append(s2);
}

function uniqueAnswers() {
  let count = 0;
  let iters = 0;
  let answers = {};
  while (count < 20 && iters < 200) {
    let v = g.valueForLevel(model.level);
    let json = JSON.stringify(v);
    if (!(json in answers)) {
      answers[json] = v;
      count++;
    }
    iters++;
  }
  return answers;
}

// Factors of n. Does not include 1 or n.
function factors(n) {
  const fs = [];
  for (let i = 2; i < n; i++) {
    if (n % i === 0) {
      fs.push(i);
    }
  }
  return fs;
}

document.addEventListener("DOMContentLoaded", init);
