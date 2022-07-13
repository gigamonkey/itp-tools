import * as acorn from 'acorn';

const textNode = (s) => document.createTextNode(s);

const pretty = (v) => {
  // This could be a lot better but I'd have to write an actual recursive pretty
  // printer.
  if (v === null || v === undefined) {
    return String(v);
  }

  switch (v.constructor.name) {
    case 'Boolean':
    case 'Function':
    case 'Number':
    case 'String':
      return v.toString();

    case 'Array':
    case 'Object':
      // ideally we'd use Javascript syntax (i.e. no quotes on properties that
      // don't need them but this will do for now.
      return JSON.stringify(v);

    default:
      return `${v.constructor.name} ${JSON.stringify(v)}`;
  }
};

const isExpression = (code) => {
  try {
    const parsed = acorn.parse(code, { ecmaVersion: 2022 });
    return parsed.body.length === 1 && parsed.body[0].type === 'ExpressionStatement';
  } catch (e) {
    return false;
  }
};

class Repl {
  constructor(id) {
    this.console = new Console((text) => this.log(text));

    this.div = document.getElementById(id);
    this.div.setAttribute('autofocus', true);
    this.div.setAttribute('tabindex', 0);

    this.prompt = document.createElement('span');
    this.prompt.classList.add('prompt');
    this.prompt.innerText = '»\u00a0';

    this.cursor = document.createElement('span');
    this.cursor.setAttribute('contenteditable', true);

    this.evaluate = () => {
      throw new Error('Must set repl.evaluate');
    };

    this.cursor.onkeydown = (e) => this.onEnter(e);
    this.div.onfocus = () => this.cursor.focus();
    this.newPrompt();
  }

  focus() {
    this.cursor.focus();
  }

  /*
   * Output a log line in the repl div.
   */
  log(text) {
    const div = document.createElement('div');
    div.classList.add('log');
    div.innerText = text;
    this.div.append(div);
    this.newPrompt();
  }

  /*
   * Put the prompt and the cursor at the end of the repl, ready for more input.
   * (They are removed from their parent in replEnter.)
   */
  newPrompt() {
    const div = document.createElement('div');
    div.append(this.prompt);
    div.append(this.cursor);
    this.div.append(div);
    this.cursor.focus();
  }

  /*
   * Emit a message to the repl.
   */
  message(text) {
    this.toRepl(textNode(text), 'message');
  }

  /*
   * Emit an error to the repl.
   */
  error(text) {
    this.toRepl(textNode(text), 'error');
  }

  /*
   * Output a value to the repl.
   */
  print(value) {
    const span = document.createElement('span');
    const arrow = document.createElement('span');
    arrow.classList.add('output');
    arrow.append(textNode('⇒ '));
    span.append(arrow);
    span.append(textNode(pretty(value)));
    this.toRepl(span, 'value');
  }

  /*
   * Output to the repl with a particular CSS class.
   */
  toRepl(text, clazz) {
    const div = document.createElement('div');
    div.classList.add(clazz);
    div.append(text);
    this.div.append(div);
    this.newPrompt();
  }

  onEnter(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      let text = this.cursor.innerText;

      const parent = this.cursor.parentNode;
      const p = this.prompt.cloneNode(true);
      p.removeAttribute('id');
      parent.replaceChild(p, this.prompt);
      parent.insertBefore(document.createTextNode(text), this.cursor);
      this.cursor.replaceChildren();
      parent.removeChild(this.cursor);

      if (isExpression(text)) {
        while (text.endsWith(';')) {
          text = text.substring(0, text.length - 1);
        }
        this.evaluate(`repl.print((\n${text}\n))`, 'repl');
      } else {
        this.evaluate(`\n${text}\nrepl.message("Ok.");`, 'repl');
      }
    }
  }
}

/*
 * A fake console.
 */
class Console {
  constructor(logFn) {
    this.logFn = logFn;
  }

  log(...text) {
    this.logFn(stringify(text));
  }

  info(...text) {
    this.logFn(`INFO: ${stringify(text)}`);
  }

  warn(...text) {
    this.logFn(`WARN: ${stringify(text)}`);
  }

  error(...text) {
    this.logFn(`ERROR: ${stringify(text)}`);
  }

  debug(...text) {
    this.logFn(`DEBUG: ${stringify(text)}`);
  }
}

const stringify = (args) => args.map(String).join(' ');

const repl = (id) => new Repl(id);

export default repl;
