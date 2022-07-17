(() => {
  // Kludge to get the function assuming it was named with const or let and thus
  // not on the window object.
  const get = (name) => {
    try {
      return Function(`return ${name}`)();
    } catch {
      return void 0;
    }
  };

  const runTestCase = (fn, test) => {
    // Copy arg so test function can't mutate the test data.
    const got = fn(...JSON.parse(JSON.stringify(test.args)));
    const passed = JSON.stringify(got) === JSON.stringify(test.expected);
    return { ...test, got, passed };
  };

  const fnResults = (fn, cases) => cases.map((test) => runTestCase(fn, test));

  const allResults = (testCases) => {
    return Object.fromEntries(
      testCases.map((spec) => {
        const fn = get(spec.name);
        return [spec.name, fn ? fnResults(fn, spec.cases) : []];
      }),
    );
  };

  // kludge? maybe.
  window.parent.runTests = (testCases, callback) => callback(allResults(testCases));
})();
