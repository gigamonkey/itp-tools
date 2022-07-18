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

const fill = (parent, selector, ...what) => {
  const e = parent.querySelector(selector);
  e.replaceChildren(...what);
};

function withClass(className, e) {
  e.className = className;
  return e;
}

const makePills = (testCases) => {
  const pills = withClass('pills', $('<div>'));
  testCases.forEach((spec) => {
    pills.append(pill(spec.name));
  });
  return pills;
};

const pill = (name) => {
  const b = withClass('no_results', $('<button>', name));
  b.value = name;
  b.append(withClass('marker', $('<span>', '')));
  return b;
};

const pillStyle = (results) => {
  if (results === null) {
    return { style: 'no_results', marker: '' };
  } else if (results.every((x) => x.passed)) {
    return { style: 'all_passing', marker: '✅' };
  } else {
    return { style: 'some_failing', marker: '❌' };
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

const noResults = () => {
  const div = withClass(
    'no-results',
    $('<div>', 'No test results. You need to define the function.'),
  );
  div.hidden = true;
  return div;
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

const functionDescription = (name, description) => {
  const desc = withClass('description', $('<div>'));
  const prefix = $('<b>', `${name}: `);
  if (typeof description === 'string') {
    const p = $('<p>');
    p.replaceChildren(prefix, $(description));
    desc.append(p);
  } else {
    const ps = description.map((d) => $('<p>', d));
    ps[0].prepend(prefix);
    desc.replaceChildren(...ps);
  }
  return desc;
};

class Testing {
  constructor(div, testCases) {
    this.div = div;
    this.testCases = testCases;
    this.descriptions = Object.fromEntries(testCases.map((o) => [o.name, o.description]));

    this.pills = makePills(testCases);
    this.description = withClass('description', $('<div>'));
    this.table = resultsTable();
    this.noResults = noResults();
    this.summary = withClass('summary', $('<div>'));

    this.div.append(this.pills);
    this.div.append(this.description);
    this.div.append(this.table);
    this.div.append(this.noResults);
    this.div.append(this.summary);

    this.selected = testCases[0].name;
  }

  update(testResults) {
    this.pills.querySelectorAll('button').forEach((b) => {
      const results = testResults[b.value];
      b.classList.remove('no_results', 'some_failing', 'all_passing');

      const { style, marker } = pillStyle(results);
      b.classList.add(style);
      fill(b, '.marker', $(marker));

      b.onclick = () => this.displayResults(b.value, results);
    });

    if (this.selected) {
      this.displayResults(this.selected, testResults[this.selected]);
    }
  }

  displayResults(name, results) {
    this.selected = name;

    const newDesc = functionDescription(name, this.descriptions[name]);
    this.description.replaceWith(newDesc);
    this.description = newDesc;

    if (results !== null) {
      const old = this.table.querySelector('tbody');
      this.table.replaceChild(resultsBody(name, results), old);
      this.table.hidden = false;
      this.noResults.hidden = true;

      const passed = results.reduce((a, b) => a + (b.passed ? 1 : 0), 0);
      const all = passed === results.length ? 'All ' : '';
      const stop = passed === results.length ? '!' : '.';

      this.summary.replaceChildren(
        $('<p>', `${all}${passed} of ${results.length} test cases passed${stop}`),
      );
    } else {
      this.noResults.hidden = false;
      this.table.hidden = true;
      this.summary.hidden = true;
    }
  }
}

const testing = (div, testCases) => new Testing(div, testCases);

export default testing;
