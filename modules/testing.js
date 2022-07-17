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
  if (results.length === 0) {
    return 'no_results';
  } else if (results.every((x) => x.passed)) {
    return 'all_passing';
  } else {
    return 'some_failing';
  }
};

class Testing {
  constructor(div) {
    this.div = div;
    this.pills = withClass('pills', $('<div>'));
    this.div.append(this.pills);
  }

  makePills(testCases) {
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
    const pre = $('<pre>');
    pre.append(JSON.stringify(results, null, 2));
    this.div.appendChild(pre);
  }
}

const testing = (div) => new Testing(div);

export default testing;
