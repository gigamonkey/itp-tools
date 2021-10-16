import { $, clear, withClass } from "./whjqah.js";
import { forBlank, type } from "./questions.js";
import { random as g } from "./random.js";

// Basic functionality:
//
//  - Generate some number of potential answers.
//  - Choose one at random and then create an expression using that answer.
//  - Present the question with the answer blanked out.
//  - User clicks on button to select answer and then we report whether it was correct.
//  - Any answer that produces the same result is ok.

//////////////////////////////////////////////////////////////////////
// HTML

let model = {
  currentAnswers: {},
  currentQuestion: null,
  tiles: 4,
  level: 3,
};

function init() {
  for (let i = 0; i < model.tiles; i++) {
    addTile(newAnswer());
  }
  clear($("#results"));
  setQuestion();
}

function setQuestion() {
  const answers = Object.values(model.currentAnswers);
  if (answers.length > 0) {
    let a = g.choice(answers);
    let expr = forBlank(a);
    model.currentQuestion = expr;
    showExpression(expr, clear($("#question")));
  } else {
    init();
  }
}

function onAnswer(e) {
  const answer = JSON.parse(e.target.value);
  delete model.currentAnswers[e.target.value];
  e.target.parentElement.removeChild(e.target);
  logAnswer(model.currentQuestion, answer);
  addTile(newAnswer());
  hideTip();
  setQuestion();
}

function hideTip() {
  $("#tip").style.display = "none";
}

function logAnswer(expr, got) {
  // We can't just compare the answer we got to the answer
  // we used to create the question because there could be
  // multiple answers that would get the same result (e.g.
  // consider ? * 0 ==> 0.)

  // Things to check:
  //
  // - Was the selected answer an acceptable type for the operator
  //   given the other value.
  //
  // - Does evaluating the expression with the selected answer
  //   yield the same result.
  //
  // The former does not necessarily require that the answer is the same type
  // as the value in the blank--in an === or !== any value is a plausible type.
  // (I'm ignoring the legality of types after coercion so no numbers to && or
  // booleans to +, etc.)
  //
  const typeOk = expr.okTypes.indexOf(type(got)) != -1;
  const withGot = expr.fillBlank(got);
  const valueRight = withGot.evaluate() === expr.evaluate();
  const passed = typeOk && valueRight;

  const row = $("#results").insertRow(0);
  row.className = passed ? "pass" : "fail";
  showExpression(expr, row.insertCell());
  row.insertCell().append(withClass("mono", $("<span>", JSON.stringify(got))));
  const notesCell = row.insertCell();
  const resultCell = row.insertCell();

  if (passed) {
    notesCell.append($("Looks good!"));
    resultCell.append($("✅"));
  } else {
    if (typeOk) {
      notesCell.append($("Value is an ok type for the operator but the value itelf isn't quite right. "));
    } else {
      let expectation;
      if (expr.okTypes.length == 1) {
        expectation = expr.okTypes[0];
      } else {
        expectation = `either ${expr.okTypes[0]} or ${expr.okTypes[1]}`;
      }
      notesCell.append($(`Wrong type of value. Should have been ${expectation}.`));
    }
    notesCell.append(withClass("mono", $("<span>", JSON.stringify(expr.blankValue()))));
    notesCell.append($(" would have worked"));
    resultCell.append($("❌"));
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


function addTile(v) {
  let json = JSON.stringify(v);
  let b = $("<button>", json);
  b.value = json;
  b.onclick = onAnswer;
  $("#answers").append(b);
}


function newAnswer() {
  for (let i = 0; i < 200; i++) {
    let v = g.valueForLevel(model.level);
    let json = JSON.stringify(v);
    if (!(json in model.currentAnswers)) {
      model.currentAnswers[json] = v;
      return v;
    }
  }
  throw Error("Couldn't find an unused value!");
}

document.addEventListener("DOMContentLoaded", init);
