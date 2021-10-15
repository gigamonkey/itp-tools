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

  valueForLevel(level) {
    if (level === 0) {
      return this.number();
    } else {
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

let operators = {
  number: ["+", "-", "*", "/", "%", "<", "<=", ">", ">=", "===", "!="],
  string: ["+", "[]"],
  boolean: ["!", "&&", "||"],
  array: ["[]"],
};

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

  fillBlank(value) { return this; }
}

/*
 * A blank spot in an expression that needs to be filled in.
 */
class Blank extends Value {
  render(parent) {
    parent.append(withClass("hole", $("<span>")));
  }
  fillBlank(value) {
    return new Value(value);
  }
}

class NumberPlus {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  evaluate() {
    return this.a.evaluate() + this.b.evaluate();
  }
  render(parent) {
    this.a.render(parent);
    parent.append($(" + "));
    this.b.render(parent);
  }

  fillBlank(value) {
    return new NumberPlus(this.a.fillBlank(value), this.b.fillBlank(value));
  }
}

function forBlank(blank) {
  return new NumberPlus(blank, new Value(g.valueOf("number")));
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
  currentAnswers: [],
  level: 0,
};

function init() {
  $("#log").append(makeResultsTable());
  model.currentAnswers = uniqueAnswers();
  populateAnswers(model.currentAnswers);
  setQuestion();
}

function populateAnswers(answers) {
  const div = $("#answers");
  for (const v of answers) {
    let json = JSON.stringify(v);
    let b = $("<button>", json);
    b.value = json;
    b.onclick = onAnswer;
    div.append(b);
  }
}

function setQuestion() {
  let a = g.choice(model.currentAnswers);
  let expr = forBlank(new Blank(a));
  model.currentQuestion = expr;
  showExpression(expr, clear($("#question")));
}


function onAnswer(e) {
  const answer = JSON.parse(e.target.value);
  const answered = model.currentQuestion.fillBlank(answer);
  e.target.parentElement.removeChild(e.target);
  logAnswer(model.currentQuestion, answer);
  setQuestion();
}

function logAnswer(expr, answer) {
  const answered = expr.fillBlank(answer);
  const got = answered.evaluate();
  const expected = expr.evaluate();
  const passed = answered.evaluate() === expr.evaluate();
  const row = $("#results").insertRow(0);
  row.className = passed ? "pass" : "fail";
  showExpression(expr, row.insertCell());;
  row.insertCell().append($(JSON.stringify(got)));
  row.insertCell().append($(JSON.stringify(expected)));
  row.insertCell().append($(passed ? "✅" : "❌"));
 }

function showExpression(expr, where) {
  expr.render(where);
  where.append($(" ⟹ "));
  where.append($(JSON.stringify(expr.evaluate())));
}

function uniqueAnswers() {
  let count = 0;
  let iters = 0;
  let seen = {};
  let answers = [];
  while (count < 20 && iters < 200) {
    let v = g.valueForLevel(model.level);
    let json = JSON.stringify(v);
    if (!(json in seen)) {
      seen[json] = true;
      count++;
      answers.push(v);
    }
    iters++;
  }
  return answers;
}


/*
 * Make a table to told the results of running the tests for one function.
 */
function makeResultsTable() {
  const table = $("<table>");
  const colgroup = $("<colgroup>");
  colgroup.append(withClass("question", $("<col>")));
  colgroup.append(withClass("got", $("<col>")));
  colgroup.append(withClass("expected", $("<col>")));
  colgroup.append(withClass("result", $("<col>")));
  table.append(colgroup);

  const thead = $("<thead>");
  const tr = $("<tr>");
  tr.append($("<th>", "Question"));
  tr.append($("<th>", "Got"))
  tr.append($("<th>", "Expected"));
  tr.append($("<th>", "Passed?"));
  thead.append(tr);
  table.append(thead);
  const tbody = $("<tbody>");
  tbody.id = "results";
  table.append(tbody);
  return table;
}

function addResultRow(tbody, fn, input, got, expected, passed) {
  const row = tbody.insertRow();
  row.className = passed ? "pass" : "fail";
  row.insertCell().append(fn + "(" + input.map(JSON.stringify).join(", ") + ")");
  row.insertCell().append($(JSON.stringify(got)));
  row.insertCell().append($(JSON.stringify(expected)));
  row.insertCell().append($(passed ? "✅" : "❌"));
  return passed;
}
