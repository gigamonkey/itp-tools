/*
 * Quick and dirty helper for async function calling.
 * 
 *   first(aFunction).after(100, anotherFunction).after(20, aThird).run();
 * 
 * will call aFunction immediately arranging to start anotherFunction 100ms
 * after it returns, and the aThird 20ms after anotherFunction finishes.
 */

function first(fn) {
  return new Link(fn);
}


/*
 * Under the covers implementation.
 */
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

export { first };