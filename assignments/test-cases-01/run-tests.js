(() => {
  // Kludge to get the function assuming it was defined with const or let and
  // thus not on the window object.
  const get = (name) => {
    try {
      return Function(`return ${name}`)();
    } catch {
      return void 0;
    }
  };

  const runTestCase = (fn, test) => {
    const { args, expected } = test;
    const { got, exception } = runFn(fn, args);
    const passed = exception === null && JSON.stringify(got) === JSON.stringify(expected);
    return { args, expected, got, exception, passed };
  };

  const runFn = (fn, args) => {
    try {
      // Copy arg so test function can't mutate the test data.
      const got = fn(...JSON.parse(JSON.stringify(args)));
      return { got, exception: null };
    } catch (exception) {
      return { got: null, exception };
    }
  };

  const fnResults = (fn, cases) => {
    if (fn) {
      return cases.map((test) => runTestCase(fn, test));
    } else {
      return null; // i.e. function doesn't exist.
    }
  };

  const allResults = (testCases) =>
    Object.fromEntries(
      testCases.map((spec) => {
        return [spec.name, fnResults(get(spec.name), spec.cases)];
      }),
    );

  // kludge? maybe.
  window.parent.runTests = (testCases, callback) => callback(allResults(testCases));
})();
