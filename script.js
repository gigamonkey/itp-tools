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

  const result = processAnswer(model.currentQuestion, answer);
  logResult(result);
  addTile(newAnswer());
  hideTip();
  setQuestion();
}

function hideTip() {
  const tip = $("#tip");

  if (tip.style.display != "none") {
    let iters = 50;
    let h = tip.clientHeight;
    let w = tip.clientWidth;
    let hd = h / iters;
    let wd = w / iters;

    let id = null;
    function shrinkTip() {
      tip.innerHTML = "";
      if (iters == 0) {
        tip.style.display = "none";
        clearInterval(id);
      } else {
        iters--;
        h -= hd;
        w -= wd;
        tip.style.height = h + "px";
        tip.style.width = w + "px";
      }
    }
    id = setInterval(shrinkTip, 10);
  }
}


function processAnswer(expr, answer) {
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

  const expectedValue =  expr.evaluate();
  const filled = expr.fillBlank(answer);
  const answeredValue = filled.evaluate();
  const typeOk = expr.okTypes.indexOf(type(answer)) != -1;
  const valueRight = answeredValue === expectedValue;

  return {
    expr: expr,
    inBlank: expr.blankValue(),
    answer: answer,
    filled: filled,
    expectedValue: expectedValue,
    answeredValue: answeredValue,
    typeOk: typeOk,
    valueRight: valueRight,
    passed: typeOk && valueRight,
  };
}


function logResult(result) {
  const row = $("#results").insertRow(0);
  row.className = result.passed ? "pass" : "fail";
  showExpression(result.expr, row.insertCell());
  row.insertCell().append(withClass("mono", $("<span>", JSON.stringify(result.answer))));
  const notesCell = row.insertCell();
  const resultCell = row.insertCell();

  if (result.passed) {
    notesCell.append($("Looks good!"));
    resultCell.append($("✅"));
  } else {
    if (result.typeOk) {
      notesCell.append($("Value is an ok type for the operator but the value itelf isn't quite right. "));
    } else {
      let expectation;
      if (result.expr.okTypes.length == 1) {
        expectation = result.expr.okTypes[0];
      } else {
        expectation = `either ${result.expr.okTypes[0]} or ${result.expr.okTypes[1]}`;
      }
      notesCell.append($(`Wrong type of value. Should have been ${expectation}.`));
    }
    notesCell.append(withClass("mono", $("<span>", JSON.stringify(result.inBlank))));
    notesCell.append($(" would have worked"));
    resultCell.append($("❌"));
  }
}


function animateExpression() {
  // blank out result of evaluation
  // replace blank with the answer.
  // show new evaluation (possibly a type error)
  // display a green checkmark or a red X
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


function showFilledExpression(expr, where) {
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
