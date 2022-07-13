import github from './modules/github';
import makeEvaluator from './modules/evaluator';
import monaco from './modules/editor';
import replize from './modules/repl';
import { jsonIfOk, textIfOk } from './modules/fetch-helpers';

const CANONICAL_VERSION = 'https://raw.githubusercontent.com/gigamonkey/itp-template/main/.version';

// Set when we connect to github.
let repo = null;

const loggedInName = document.getElementById('logged-in');
const loginButton = document.getElementById('login');
const minibuffer = document.getElementById('minibuffer');
const submit = document.getElementById('submit');

const message = (text, fade) => {
  minibuffer.innerText = text;
  if (fade) {
    setTimeout(() => {
      minibuffer.innerText = '';
    }, fade);
  }
};

const editor = monaco('editor');
const repl = replize('repl');
const evaluator = makeEvaluator(repl, message);

/*
 * Load the code from editor. Wipes out existing definitions.
 */
const loadCode = (config) => {
  const code = editor.getValue();
  maybeSave(code, config);
  evaluator.load(code);
};

const maybeSave = async (code, config) => {
  if (repo !== null) {
    const f = await repo.ensureFileContents(config.files[0], 'Creating', 'Updating', code, 'main');
    if (f.updated || f.created) {
      console.log('Saved.'); // FIXME: should show this in the web UI somewhere.
    }
  }
};

const checkLoggedIn = (config) => {
  if (github.hasToken()) {
    connectToGithub(config);
  } else {
    showLoggedOut();
    fetchCodeFromWeb(config);
  }
};

const connectToGithub = async (config) => {
  const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

  const gh = await github.connect(siteId, ['repo', 'user']);

  showLoggedIn(gh.user.login);

  // global used by loadCode
  // FIXME: need to actually not proceed if the repo is malformed.
  repo = await checkRepoVersion(await gh.getRepo('itp'));

  // FIXME: not clear exactly what to do if there is already content in the
  // editor when we connect to repo. Could immediately save it but that might
  // stomp on what's in the repo. Could prompt to save. Blech.
  if (editor.getValue() === '') {
    fetchCodeFromGithub(config);
  }
};

const showLoggedOut = () => {
  loginButton.hidden = false;
  loggedInName.hidden = true;
};

const showLoggedIn = (username) => {
  loginButton.hidden = true;
  loggedInName.appendChild(document.createTextNode(username));
  loggedInName.hidden = false;
};

const checkRepoVersion = async (r) => {
  const [expected, got] = await Promise.all([
    fetch(CANONICAL_VERSION).then(jsonIfOk),
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

const fetchCodeFromGithub = (config) => {
  const file = config.files[0];
  const branch = 'main';
  repo.getFile(file, branch).then((file) => {
    editor.setValue(atob(file.content));
    loadCode(config);
  });
};

const fetchCodeFromWeb = (config) => {
  // FIXME: Need UI support for multiple files.
  const file = config.files[0];
  fetch(`${window.location.pathname}${file}`)
    .then(textIfOk)
    .then((t) => {
      editor.setValue(t);
      loadCode(config);
    })
    .catch(() => '');
};

// This is part of our base href kludge to deal with the monaco worker plugin
// files (see modules/editor.js). Since we've likely set a <base> in our HTML we
// need to do this gross thing to convert this back to a relative link.
const configuration = async () => fetch(`${window.location.pathname}config.json`).then(jsonIfOk);

configuration()
  .then((config) => {
    loginButton.onclick = () => connectToGithub(config);
    submit.onclick = () => loadCode(config);
    checkLoggedIn(config);
    repl.focus();
  })
  .catch(() => console.log('No configuration found.'));
