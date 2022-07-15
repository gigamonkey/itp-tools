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
  constructor(config, scriptConfig, repl, message) {
    this.config = config ?? DEFAULT_CONFIG;
    this.scriptConfig = scriptConfig ?? {};
    this.repl = repl;
    this.repl.evaluate = (code, source) => this.evaluate(code, source);
    this.message = message;
    this.iframe = null;
    this.resetIframe(() => repl.start());
  }

  /*
   * Evaluate code in the current iframe. The code can use the functions in the
   * iframe's repl object (see newIframe) to communicate back.
   */
  evaluate(code, source) {
    console.log('here in evaluate');
    const d = this.iframe.contentDocument;
    const s = d.createElement('script');
    Object.entries(this.scriptConfig).forEach(([k, v]) => {
      s.setAttribute(k, v);
    });
    s.append(d.createTextNode(`"use strict";\n//# sourceURL=${source}\n${code}\n`));
    d.documentElement.append(s);

    console.log(d.querySelectorAll('script'));
    console.log('end of evaluate');
  }

  /*
   * Load the code from the editor into a new iframe. This wipes out all old
   * definitions.
   */
  load(code, source) {
    console.log('here in load');

    this.resetIframe(() =>
      this.evaluate(`\n${code}\nminibuffer.message('Loaded.', 1000);`, source),
    );
  }

  /*
   * Create a new iframe to use for evaluating code, evaluating a function after
   * it is fully loaded.
   */
  resetIframe(after) {
    const f = document.createElement('iframe');

    f.addEventListener('load', () => console.log(`iframe loaded src=${f.src}`));

    Object.entries(this.config).forEach(([k, v]) => {
      f.setAttribute(k, v);
    });

    // Note: need to add the new frame to the document before we try to
    // manipulate it's contentWindow but after we set it's src. When we set
    // hidden doesn't seem to matter.

    // Because we can't attach the DOMContentLoaded event listener until after
    // the window is created there's a race where it might have finished loading
    // before we add the listener. So we wrap our actual callback in this
    // closure to make sure it only runs once and then we'll check the document
    // readyState at the end of this function and run this if it's complete.
    // Which way we end up calling this seems to perhaps  depend on whether the
    // iframe is created with about:blank or something that actually has to load
    // something over the network.
    let done = false;
    const once = (where) => {
      console.log(`once: ${where}; done: ${done}`);
      if (!done) after();
      done = true;
    };

    (this.iframe ?? placeholder()).replaceWith(f);

    const origDoc = f.contentDocument;
    console.log(`just after added readyState: ${f.contentDocument.readyState}`);

    f.contentDocument.onreadystatechange = (e) => {
      console.log(e);
    };

    f.contentWindow.repl = this.repl;
    f.contentWindow.console = this.repl.console;
    f.contentWindow.minibuffer = { message: this.message };
    f.contentWindow.onerror = (...args) => this.showError(...args);

    // FIXME: maybe this should be onload event.
    f.contentWindow.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded');
      console.log(f.contentDocument.querySelectorAll('script'));
      once('content loaded');
    });
    f.contentWindow.onload = () => {
      console.log('onload fired');
      console.log(f.contentDocument.querySelectorAll('script'));
      console.log(`same document: ${f.contentDocument === origDoc}`);
    };

    this.iframe = f;

    // In case we got ready before we were able to add the DOMContentLoaded
    // event listener.
    if (f.contentDocument.readyState === 'complete') {
      console.log(f.contentDocument.querySelectorAll('script'));
      once('main thread');
    }
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

const evaluator = (config, scriptConfig, repl, message) =>
  new Evaluator(config, scriptConfig, repl, message);

export default evaluator;
