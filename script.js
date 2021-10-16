import { $, clear, findChild, findDescendant, withClass } from "./whjqah.js";
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
  $("#next").onclick = setQuestion;
  for (let i = 0; i < model.tiles; i++) {
    addTile(newAnswer());
  }
  clear($("#results"));
  setQuestion();
}

function setQuestion() {
  clear($("#commentary"));
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
  animateExpression(result, $("#question"));
  //logResult(result);
  addTile(newAnswer());
  maybeHideTip();
}

function maybeHideTip() {
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

  const blankValue = expr.blankValue();
  const expectedValue = expr.evaluate();
  const filled = expr.fillBlank(answer);
  const answeredValue = filled.evaluate();
  const typeOk = expr.okTypes.indexOf(type(answer)) != -1;
  const valueRight = answeredValue === expectedValue;

  return {
    expr: expr,
    inBlank: blankValue,
    answer: answer,
    filled: filled,
    expectedValue: expectedValue,
    answeredValue: answeredValue,
    typeOk: typeOk,
    exactType: type(blankValue) === type(answer),
    valueRight: valueRight,
    passed: typeOk && valueRight,
  };
}

function a(t) {
  return (t === "array" ? "an " : "a ") + t;
}

function or(things) {
  if (things.length == 1) {
    return things[0];
  } else if (things.length == 2) {
    return things.join(" or ");
  } else {
    return things.slice(0, things.length - 1).join(", ") + ", or " + things[things.length - 1];
  }
}

function addCommentary(result, where) {
  if (!result.passed) {
    if (!result.typeOk) {
      where.append($(typeCommentary(result)));
    } else {
      if (result.exactType) {
        where.append($("Value is the right type but the value itelf isn't quite right. "));
      } else {
        // Type is acceptable for the operator but not the right type
        // in this specific case.
        where.append(
          $("Value is an ok type for the operator but in this case you probably needed " + a(type(result.blankValue)))
        );
      }
    }

    const p = $("<p>");
    p.append(withClass("mono", $("<span>", JSON.stringify(result.inBlank))));
    p.append($(" would have worked"));
    where.append(p);
  }
}

function typeCommentary(result) {
  if (!results.typeOk) {
    let expectation = or(result.expr.okTypes.map(a));
    return `Should have been ${expectation}.`;
  }
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
    addCommentary(result, notesCell);
    resultCell.append($("❌"));
  }
}

class Link {
  constructor(fn, delay = 0, previous = null) {
    this.fn = fn;
    this.delay = delay;
    this.previous = previous;
  }

  after(delay, fn) {
    return new Link(fn, delay, this);
  }

  run() {
    const me = this.possiblyDelayed(this.fn);
    if (this.previous) {
      this.previous.runAndThen(me);
    } else {
      me();
    }
  }

  runAndThen(next) {
    let me = this.possiblyDelayed(() => {
      this.fn();
      next();
    });
    if (this.previous) {
      this.previous.runAndThen(me);
    } else {
      me();
    }
  }

  possiblyDelayed(fn) {
    return this.delay === 0 ? fn : () => setTimeout(fn, this.delay);
  }
}

function first(fn) {
  return new Link(fn);
}

function animateExpression(result, where) {
  // blank out result of evaluation
  let hole = findDescendant(where, (c) => c.className == "hole");
  let value = findDescendant(where, (c) => c.className == "value");

  function clearValue() {
    clear(value);
  }
  function fillAnswer() {
    clear(hole).append(JSON.stringify(result.answer));
  }
  function fillResult() {
    if (result.typeOk) {
      value.append(JSON.stringify(result.answeredValue));
    } else {
      value.append($("<i>", "Wrong type"));
    }
  }
  function checkmark() {
    const green = $("✅");
    const red = $("❌");
    value.append($("  "));
    value.append(result.passed ? green : red);
    addCommentary(result, $("#commentary"));
  }

  first(clearValue).after(10, fillAnswer).after(500, fillResult).after(200, checkmark).run();
  //.after(2000, setQuestion).run();

  //animateRandomValues(value, 100, 100, result.answeredValue);
}

function animateRandomValues(where, rate, times, finalValue) {
  let id;
  let iters = 0;

  function a() {
    if (iters == times) {
      clearInterval(id);
      clear(where).append(JSON.stringify(finalValue));
      setTimeout(setQuestion, 1000);
    } else {
      clear(where).append(JSON.stringify(g.value()));
      iters++;
    }
  }

  id = setInterval(a, rate);
}

function showExpression(expr, where) {
  const s1 = withClass("mono", $("<span>"));
  const s2 = withClass("mono", $("<span>"));
  expr.render(s1);
  s2.append(withClass("value", $("<span>", JSON.stringify(expr.evaluate()))));
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
