/*
 * Turn a div we are given into a widget for displaying test results. We are not
 * responsible for actually running the tests because that happens off in the
 * hidden iframe. (Hmmm, possibly we could pass this object the evaluator and
 * let it register with the evaluator to be notified when code is loaded so it
 * can do it's thing. That's probably better. FIXME.)
 */

/*
 * Poor man's jQuery.
 */
function $(s, t) {
  if (s === undefined) {
    return $('<i>', 'undefined');
  } else if (s[0] === '#') {
    return document.getElementById(s.substring(1));
  } else if (s[0] === '<') {
    const e = document.createElement(s.substring(1, s.length - 1));
    if (t !== undefined) {
      e.append($(t));
    }
    return e;
  } else {
    return document.createTextNode(s);
  }
}

function withClass(className, e) {
  e.className = className;
  return e;
}

const pill = (name) => {
  const b = withClass('no_results', $('<button>', name));
  b.value = name;
  return b;
};

const pillStyle = (results) => {
  if (results === null) {
    return 'no_results';
  } else if (results.every((x) => x.passed)) {
    return 'all_passing';
  } else {
    return 'some_failing';
  }
};

const resultsTable = () => {
  const table = withClass('results', $('<table>'));
  table.hidden = true;

  const colgroup = $('<colgroup>');
  colgroup.append(withClass('functionCall', $('<col>')));
  colgroup.append(withClass('got', $('<col>')));
  colgroup.append(withClass('expected', $('<col>')));
  colgroup.append(withClass('result', $('<col>')));
  table.append(colgroup);

  const thead = $('<thead>');
  const tr = $('<tr>');
  tr.append($('<th>', 'Invocation'));
  tr.append($('<th>', 'Got'));
  tr.append($('<th>', 'Expected'));
  tr.append($('<th>', 'Passed?'));
  thead.append(tr);
  table.append(thead);
  table.append($('<tbody>'));
  return table;
};

const resultsBody = (name, results) => {
  const tbody = $('<tbody>');
  results.forEach((result) => addResultRow(tbody, name, result));
  return tbody;
};

const addResultRow = (tbody, name, result) => {
  const { args, got, exception, expected, passed } = result;
  const row = tbody.insertRow();
  row.className = passed ? 'pass' : 'fail';
  row.insertCell().append(`${name}(${args.map(JSON.stringify).join(', ')})`);
  row.insertCell().append(exception === null ? $(JSON.stringify(got)) : `${exception}`);
  row.insertCell().append($(JSON.stringify(expected)));
  row.insertCell().append($(statusEmoji(passed, exception)));
};

const statusEmoji = (passed, exception) => {
  if (passed) {
    return '✅';
  } else if (exception) {
    return '💥';
  } else {
    return '❌';
  }
};

class Testing {
  constructor(div) {
    this.div = div;

    this.pills = withClass('pills', $('<div>'));
    this.description = withClass('description', $('<div>'));
    this.table = resultsTable();
    this.summary = withClass('summary', $('<div>'));

    this.div.append(this.pills);
    this.div.append(this.description);
    this.div.append(this.table);
    this.div.append(this.summary);

    this.testCases = null;
  }

  makePills(testCases) {
    this.testCases = testCases;
    this.descriptions = Object.fromEntries(testCases.map((o) => [o.name, o.description]));
    testCases.forEach((spec) => {
      this.pills.append(pill(spec.name));
    });
  }

  stylePills(testResults) {
    this.pills.querySelectorAll('button').forEach((b) => {
      const results = testResults[b.value];
      b.classList.remove('no_results', 'some_failing', 'all_passing');
      b.classList.add(pillStyle(results));
      b.onclick = () => this.displayResults(b.value, results);
    });
  }

  displayResults(name, results) {
    const p = $('<p>');
    p.append($('<b>', `${name}: `));
    p.append(this.descriptions[name]);
    this.description.replaceChildren(p);

    if (results !== null) {
      const old = this.table.querySelector('tbody');
      this.table.replaceChild(resultsBody(name, results), old);
      this.table.hidden = false;

      const passed = results.reduce((a, b) => a + (b.passed ? 1 : 0), 0);
      const stop = passed === results.length ? '!' : '.';

      this.summary.replaceChildren(
        $('<p>', `${passed} of ${results.length} test cases passed${stop}`),
      );
    } else {
      this.table.hidden = true;
      this.summary.replaceChildren();
    }
  }
}

const testing = (div) => new Testing(div);

export default testing;
