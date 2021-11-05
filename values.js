import { $, clear, findDescendant, withClass } from "./whjqah.js";
import { forBlank, type } from "./questions.js";
import { random as g } from "./random.js";
import { first } from "./async.js";
import { Value } from "./expressions.js";


//////////////////////////////////////////////////////////////////////
// HTML

let model = {
  currentQuestion: null,
  answeredCorrectly: false,
  currentFilter: "all",
  level: 3, // N.B. we're not doing anything with this at the moment.
  correct: 0,
  asked: 0,
  tries: 0,
};

function init() {
  clear($("#results"));
  $("#toggle_info").onclick = visibilityToggler("#info");
  $("#close_info").onclick = (e) => ($("#info").style.display = "none");
  $("#toggle_results").onclick = visibilityToggler("#log");
  $("#results_header").onclick = changeFilter;
  setQuestion();
}

function visibilityToggler(id) {
  return function (e) {
    const element = $(id);
    element.style.display = element.style.display == "none" ? "block" : "none";
  };
}

let filters = ["all", "pass", "fail"];
let filterLabels = {
  all: "All",
  pass: "✅",
  fail: "❌",
};

function changeFilter(e) {
  let f = filters[(filters.indexOf(model.currentFilter) + 1) % filters.length];
  let result = $("#results");
  for (let row = result.firstChild; row; row = row.nextSibling) {
    let c = row.className;
    row.style.display = rowVisible(f, c) ? "table-row" : "none";
  }
  e.target.innerText = filterLabels[f];
  model.currentFilter = f;
}

function rowVisible(filter, className) {
  return filter === "all" || filter === className;
}

function typeTiles() {
  clear($("#answers"));
  for (let t of ["number", "string", "boolean", "array"]) {
    addTile(t);
  }
}

function maybeSetQuestion() {
  if (model.answeredCorrectly) {
    setQuestion();
  } else {
    resetQuestion();
  }
}

function setQuestion() {
  clear($("#commentary"));
  typeTiles();
  model.asked++;
  model.answeredCorrectly = false;
  let v = new Value(g.value());
  model.currentQuestion = v;
  showValue(v, clear($("#question")));
}

function resetQuestion() {
  showValue(model.currentQuestion, clear($("#question")));
}

function onAnswer(e) {
  model.tries++;
  const answer = e.target.value;
  const result = processAnswer(model.currentQuestion, answer);
  if (!result.passed) {
    disableTile(e.target);
  } else {
    model.correct++;
    model.answeredCorrectly = true;
  }
  updateScore();
  animateExpression(result, $("#question"));
  maybeHideTip();
}

function plural(word, n) {
  if (n === 1) {
    return word;
  } else {
    if (word[word.length - 1] == "y") {
      return word.substring(0, word.length - 1) + "ies";
    } else {
      return word + "s";
    }
  }
}

function updateScore() {
  let a = model.asked;
  let c = model.correct;
  let t = model.tries;
  let accuracy = Math.round((100 * c) / t);

  $("#score").innerHTML = `${accuracy}% accuracy over ${a} ${plural("question", a)}.`;
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

function processAnswer(question, answer) {
  return {
    expr: question,
    answer: answer,
    passed: type(question.evaluate()) == answer
  }
}

function a(t) {
  // Hard wired for the type names. Kludge.
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

function addCommentary(result, where, prefix) {
  const p = $("<p>");
  if (prefix) p.append(prefix);
  where.append(p);

  p.append(withClass("mono", $("<span>", result.answer)));

  if (result.passed) {
    p.append($(" is correct!"));
  } else {
    p.append($(" is not correct."));
  }
}

function logResult(result) {
  const row = $("#results").insertRow(0);
  row.className = result.passed ? "pass" : "fail";

  let [ok, question, notes] = Array(3)
    .fill()
    .map(() => row.insertCell());

  ok.append($(result.passed ? "✅" : "❌"));
  showValue(result.expr, question);
  addCommentary(result, notes);
}


function animateExpression(result, where) {
  function checkmark() {
    if (result.passed) {
      where.append($(" ✅"));
    } else {
      addCommentary(result, $("#commentary"), $("❌ "));
    }
  }

  first(checkmark).after(500, maybeSetQuestion).run();
}

function showValue(value, where) {
  const s1 = withClass("mono", $("<span>"));
  value.render(s1);
  where.append(s1);
}

function addTile(v) {
  let b = $("<button>", v);
  b.value = v
  b.onclick = onAnswer;
  $("#answers").append(b);
}

function disableTile(t) {
  t.className = "disabled";
  t.onclick = null;
}

document.addEventListener("DOMContentLoaded", init);
