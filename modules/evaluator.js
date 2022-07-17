const DEFAULT_CONFIG = {
  hidden: true,
  src: 'about:blank',
};

/*
 * The placeholder for where we will add the first evaluation iframe. If the
 * document contains an iframe element we use it. Otherwise, just stick an empty
 * div at the end of the body which will be immediately replaced.
 */
const placeholder = () => {
  let ph = document.querySelector('iframe');
  if (!ph) {
    ph = document.createElement('div');
    document.querySelector('body').appendChild(ph);
  }
  return ph;
};

class Evaluator {
  constructor(config, scriptConfig, repl, message) {
    this.config = config ?? DEFAULT_CONFIG;
    this.scriptConfig = scriptConfig ?? {};
    this.repl = repl;
    this.repl.evaluate = (code, source) => this.evaluate(code, source);
    this.message = message;
    this.iframe = null;
    this.resetIframe(() => repl.start());
    this.fromRepl = false;
  }

  /*
   * Evaluate code in the current iframe. The code can use the functions in the
   * iframe's repl object (see restIframe) to communicate back.
   */
  evaluate(code, source) {
    this.fromRepl = source === 'repl';
    const d = this.iframe.contentDocument;
    const s = d.createElement('script');
    Object.entries(this.scriptConfig).forEach(([k, v]) => {
      s.setAttribute(k, v);
    });
    s.append(d.createTextNode(`"use strict";\n//# sourceURL=${source}\n${code}\n`));
    d.documentElement.append(s);
  }

  /*
   * Load the code from the editor into a new iframe. This wipes out all old
   * definitions.
   */
  load(code, source, fn) {
    this.resetIframe(() => {
      this.evaluate(`${code}\nminibuffer.message('Loaded.', 1000);`, source);
      if (fn && this.iframe.contentWindow.onCodeLoaded) {
        this.iframe.contentWindow.onCodeLoaded(fn);
      }
    });
  }

  /*
   * Create a new iframe to use for evaluating code, evaluating a function after
   * it is fully loaded.
   */
  resetIframe(after) {
    const f = document.createElement('iframe');

    // Depending on whether the iframe is purely local (i.e. about:blank) or
    // actually loaded over the network, the load event may fire as soon as we
    // add it to the document or at some later point. But we don't want to run
    // the after callback until all the setup in this function is complete.
    // Which is exactly what queueMicrotask is for, it seems. So here we are.
    f.onload = () => queueMicrotask(after);

    Object.entries(this.config).forEach(([k, v]) => {
      f.setAttribute(k, v);
    });

    (this.iframe ?? placeholder()).replaceWith(f);

    // Setup we can only do after adding the iframe to the document because
    // contentWindow doesn't exist until then.
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

    const e = errorMessage(error, line, column, source);

    if (this.fromRepl) {
      this.repl.error(e);
    } else {
      this.message(e);
    }
  }
}

const errorMessage = (error, line, column, source) => source === 'repl' ? error : `${error} (line ${line - 2}, column ${column}) of ${source}`;

const evaluator = (config, scriptConfig, repl, message) =>
  new Evaluator(config, scriptConfig, repl, message);

export default evaluator;
