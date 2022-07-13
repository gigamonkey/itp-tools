class Evaluator {
  constructor(repl, message) {
    this.repl = repl;
    this.repl.evaluate = (code, source) => this.evaluate(code, source);
    this.message = message;
    this.resetIframe();
  }

  /*
   * Evaluate code in the current iframe. The code can use the functions in the
   * iframe's repl object (see newIframe) to communicate back.
   */
  evaluate(code, source) {
    const d = this.iframe.contentDocument;
    const s = d.createElement('script');
    s.append(d.createTextNode(`"use strict";\n${code}\n//# sourceURL=${source}`));
    d.documentElement.append(s);
  }

  /*
   * Load the code from the editor into a new iframe. This wipes out all old
   * definitions.
   */
  load(code, source) {
    this.resetIframe();
    this.evaluate(`\n${code}\nminibuffer.message('Loaded.', 1000);`, source);
  }

  /*
   * Create a new iframe to use for evaluating code.
   */
  resetIframe() {
    if (this.iframe) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('src', 'about:blank');
    document.querySelector('body').append(this.iframe);

    this.iframe.contentWindow.repl = this.repl;
    this.iframe.contentWindow.console = this.repl.console;
    this.iframe.contentWindow.minibuffer = { message: this.message };
    this.iframe.contentWindow.onerror = (...args) => this.showError(...args);
  }

  /*
   * Show errors from evaluating code.
   */
  showError(msg, source, line, column, error) {
    // This seems to be a Chrome bug. Doesn't always happen but probably safe to
    // filter this message.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1328008
    // https://stackoverflow.com/questions/72396527/evalerror-possible-side-effect-in-debug-evaluate-in-google-chrome
    if (error === 'EvalError: Possible side-effect in debug-evaluate') {
      return;
    }

    if (source === 'repl') {
      this.repl.error(error);
    } else {
      this.message(`${error} (line ${line - 2}, column ${column})`);
    }
  }
}

const evaluator = (repl, message) => new Evaluator(repl, message);

export default evaluator;
