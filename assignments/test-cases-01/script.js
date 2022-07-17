const testCases = {
  add: [
    {args: [0, 0], expected: 0},
    {args: [0, 10], expected: 10},
    {args: [10, 0], expected: 10},
    {args: [10, 11], expected: 21},
    {args: [1,2], expected: 3},
    {args: [1,2], expected: 3},
  ],
  sub: [
    {args: [0, 0], expected: 0},
    {args: [0, 10], expected: -10},
    {args: [10, 0], expected: 10},
    {args: [10, 11], expected: -1},
    {args: [1,2], expected: 3},
    {args: [1,2], expected: 3},
  ],
};

// Kludge to get the function assuming it was named with const (or let) and thus
// not on the window object.
const get = (name) => Function(`return ${name}`)();

const testResults = (fn, cases) => cases.map((test) => runTestCase(fn, test));

const runTestCase = (fn, test) => {
  // Copy arg so test function can't mutate the test data.
  const got = fn(...JSON.parse(JSON.stringify(test.args)));
  const passed = JSON.stringify(got) === JSON.stringify(test.expected);
  return { ...test, got, passed };
};

const result = (name, r) => {
  const p = document.createElement("p");
  const {args, expected, got, passed } = r;
  const label = passed ? "PASS": "FAIL";
  p.innerText = `${label}: ${name}(${args.join(', ')}). Expected: ${JSON.stringify(expected)}; Got: ${JSON.stringify(got)}.`;
  return p;
};

const runTests = (testCases) => {

  const body = document.querySelector("body");
  body.replaceChildren();

  Object.entries(testCases).forEach(([name, cases]) => {
    const fn = get(name);
    if (fn) {
      testResults(fn, testCases[name]).forEach((r) => {
        body.appendChild(result(name, r));
      });
    } else {
      const p = document.createElement("p");
      p.innerText = `No ${name} function defined.`;
      body.appendChild(p);
    }
  });
};



window.onCodeLoaded = () => runTests(testCases);
