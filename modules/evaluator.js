const DEFAULT_CONFIG = {
  hidden: true,
  src: 'about:blank',
};

const placeholder = () => {
  let ph = document.querySelector('iframe');
  if (!ph) {
    ph = document.createElement('div');
    document.querySelector('body').appendChild(ph);
  }
  return ph;
};

class Evaluator {
  constructor(config, repl, message) {
    this.config = config ?? DEFAULT_CONFIG;
    this.repl = repl;
    this.repl.evaluate = (code, source) => this.evaluate(code, source);
    this.message = message;
    this.iframe = null;
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
    const f = document.createElement('iframe');

    Object.entries(this.config).forEach(([k, v]) => {
      f.setAttribute(k, v);
    });

    // Note: need to add the new frame to the document before we try to
    // manipulate it's contentWindow but after we set it's src. When we set
    // hidden doesn't seem to matter.
    (this.iframe ?? placeholder()).replaceWith(f);

    f.contentWindow.repl = this.repl;
    f.contentWindow.console = this.repl.console;
    f.contentWindow.minibuffer = { message: this.message };
    f.contentWindow.onerror = (...args) => this.showError(...args);

    this.iframe = f;
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

const evaluator = (config, repl, message) => new Evaluator(config, repl, message);

export default evaluator;
