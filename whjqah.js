/*
 * We have jQuery at home!
 */

function $(s, t) {
  if (s === undefined) {
    return $("<i>", "undefined");
  } else if (s[0] === "#") {
    return document.getElementById(s.substring(1));
  } else if (s[0] === "<") {
    const e = document.createElement(s.substring(1, s.length - 1));
    if (t != undefined) {
      e.append($(t));
    }
    return e;
  } else {
    return document.createTextNode(s);
  }
}

/*
 * Remove all the children from the given DOM element.
 */
function clear(e) {
  while (e.firstChild) {
    e.removeChild(e.lastChild);
  }
  return e;
}

/*
 * Decorate a DOM element with a CSS class.
 */
function withClass(className, e) {
  e.className = className;
  return e;
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
