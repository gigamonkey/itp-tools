import github from './modules/github';
import monaco from './modules/editor';
import replize from './modules/repl';

const CANONICAL_VERSION = 'https://raw.githubusercontent.com/gigamonkey/itp-template/main/.version';

// Set when we connect to github.
let repo = null;

const editor = monaco(document.getElementById('editor'));
const repl = replize('repl');

const loggedInName = document.getElementById('logged-in');
const loginButton = document.getElementById('login');
const minibuffer = document.getElementById('minibuffer');
const submit = document.getElementById('submit');

const replConsole = {
  log(...text) {
    repl.log(stringify(text));
  },
  info(...text) {
    repl.log(`INFO: ${stringify(text)}`);
  },
  warn(...text) {
    repl.log(`WARN: ${stringify(text)}`);
  },
  error(...text) {
    repl.log(`ERROR: ${stringify(text)}`);
  },
  debug(...text) {
    repl.log(`DEBUG: ${stringify(text)}`);
  },
};

const stringify = (args) => args.map(String).join(' ');

const message = (text, fade) => {
  minibuffer.innerText = text;
  if (fade) {
    setTimeout(() => {
      minibuffer.innerText = '';
    }, fade);
  }
};

/*
 * Show errors from evaluating code.
 */
const showError = (msg, source, line, column, error) => {
  // This seems to be a Chrome bug. Doesn't always happen but probably safe to
  // filter this message.
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1328008
  // https://stackoverflow.com/questions/72396527/evalerror-possible-side-effect-in-debug-evaluate-in-google-chrome
  if (error === 'EvalError: Possible side-effect in debug-evaluate') {
    return;
  }

  const errormsg = source === 'repl' ? error : `${error} (line ${line - 2}, column ${column})`;
  if (iframe.contentWindow.repl.loading) {
    message(errormsg, 0);
  } else {
    repl.error(errormsg);
  }
};

/*
 * Create a new iframe to use for evaluating code.
 */
const newIframe = () => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', 'about:blank');
  document.querySelector('body').append(iframe);

  iframe.contentWindow.repl = repl;
  iframe.contentWindow.minibuffer = { message };
  iframe.contentWindow.onerror = showError;
  iframe.contentWindow.console = replConsole;
  return iframe;
};

/*
 * Send code to the current iframe to be added as a script tag and thus
 * evaluated. The code can use the function in the iframe's repl object (see
 * newIframe) to communicate back.
 */
const evaluate = (code, source) => {
  const d = iframe.contentDocument;
  const w = iframe.contentWindow;
  const s = d.createElement('script');
  s.append(d.createTextNode(`"use strict";\n${code}\n//# sourceURL=${source}`));
  w.repl.loading = source !== 'repl';
  d.documentElement.append(s);
};

/*
 * Load the code from input into the iframe, creating a new iframe if needed.
 */
const loadCode = () => {
  const code = editor.getValue();
  if (repo !== null) {
    repo.ensureFileContents('for-repl.js', 'Creating', 'Updating', code, 'main').then((f) => {
      if (f.updated || f.created) {
        console.log('Saved.'); // FIXME: should show this in the web UI somewhere.
      }
    });
  }
  if (iframe !== null) {
    iframe.parentNode.removeChild(iframe);
  }
  iframe = newIframe();
  evaluate(`\n${code}\nminibuffer.message('Loaded.', 1000);`, 'editor');
};

const keyBindings = {
  e: {
    guard: (e) => e.metaKey,
    preventDefault: true,
    fn: loadCode,
  },
};

const checkKeyBindings = (e) => {
  const binding = keyBindings[e.key];
  if (binding && binding.guard(e)) {
    if (binding.preventDefault) e.preventDefault();
    binding.fn();
  }
};

const checkLoggedIn = () => {
  if (github.hasToken()) {
    connectToGithub();
  } else {
    loginButton.hidden = false;
    loggedInName.hidden = true;
  }
};

const connectToGithub = async () => {
  const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

  const gh = await github.connect(siteId, ['repo', 'user']);

  loggedIn(gh.user.login);

  // global used by loadCode
  // FIXME: need to actually not proceed if the repo is malformed.
  repo = await checkRepoVersion(await gh.getRepo('itp'));

  // FIXME: not clear exactly what to do if there is already content in the
  // editor when we connect to repo. Could immediately save it but that might
  // stomp on what's in the repo. Could prompt to save. Blech.
  if (editor.getValue() === '') {
    repo.getFile('for-repl.js', 'main').then((file) => {
      editor.setValue(atob(file.content));
      loadCode();
    });
  }
};

const loggedIn = (username) => {
  loginButton.hidden = true;
  loggedInName.appendChild(document.createTextNode(username));
  loggedInName.hidden = false;
};

const checkRepoVersion = async (r) => {
  const [expected, got] = await Promise.all([
    fetch(CANONICAL_VERSION).then((resp) => resp.json()),
    r
      .getFile('.version')
      .then((f) => JSON.parse(atob(f.content)))
      .catch(() => 'No .version file'),
  ]);

  const same = expected.version === got.version && expected.uuid === got.uuid;

  document.getElementById('repo').innerText = same
    ? `${r.owner}/${r.name}`
    : `${r.owner}/${r.name} exists but malformed`;

  return r;
};

let iframe = newIframe();

window.onkeydown = checkKeyBindings;
window.onresize = () => editor.layout({ width: 0, height: 0 });

loginButton.onclick = connectToGithub;
submit.onclick = loadCode;

repl.evaluate = evaluate;
repl.focus();

checkLoggedIn();