import files from './modules/files';
import github from './modules/github';
import makeEvaluator from './modules/evaluator';
import monaco from './modules/editor';
import replize from './modules/repl';
import { jsonIfOk } from './modules/fetch-helpers';

const CANONICAL_VERSION = 'https://raw.githubusercontent.com/gigamonkey/itp-template/main/.version';

const loggedInName = document.getElementById('logged-in');
const loginButton = document.getElementById('login');
const minibuffer = document.getElementById('minibuffer');
const submit = document.getElementById('submit');

////////////////////////////////////////////////////////////////////////////////
// UI manipulations

const el = (name, text) => {
  const e = document.createElement(name);
  if (text) e.innerText = text;
  return e;
};

const text = (t) => document.createTextNode(t);

const fill = (parent, selector, ...what) => {
  const e = parent.querySelector(selector);
  e.replaceChildren(...what);
};

const message = (text, fade) => {
  minibuffer.innerText = text;
  if (fade) {
    setTimeout(() => {
      minibuffer.innerText = '';
    }, fade);
  }
};

const showLoggedOut = () => {
  loginButton.hidden = false;
  loggedInName.hidden = true;
};

const showLoggedIn = (username) => {
  loginButton.hidden = true;
  fill(loggedInName, '.github-user', el('span', username));
  loggedInName.hidden = false;
};

// End UI manipulations
////////////////////////////////////////////////////////////////////////////////

const editor = monaco('editor');
const repl = replize('repl');
const evaluator = makeEvaluator(repl, message);

/*
 * Reevaluate the code in editor. Wipes out existing definitions including ones
 * from the REPL.
 */
const reevaluateCode = (config, storage) => {
  const code = editor.getValue();
  storage.save(config.files[0], code).then((f) => {
    if (f.updated || f.created) {
      console.log('Saved.'); // FIXME: should show this in the web UI somewhere.
    }
  });
  evaluator.load(code);
};

const fillEditor = (code) => {
  editor.setValue(code);
  evaluator.load(code);
};

const checkRepoVersion = async (repo) => {
  const [expected, got] = await Promise.all([
    fetch(CANONICAL_VERSION).then(jsonIfOk),
    repo
      .getFile('.version')
      .then((f) => JSON.parse(atob(f.content)))
      .catch(() => 'No .version file'),
  ]);

  const same = expected.version === got.version && expected.uuid === got.uuid;
  fill(
    loggedInName,
    '.github-repo',
    text(' / '),
    el('span', same ? repo.name : `${repo.name} (malformed)`),
  );

  return repo;
};

// The window.location.pathname thing below is part of our base href kludge to
// deal with the monaco worker plugin files (see modules/editor.js). Since we've
// likely set a <base> in our HTML we need to do this gross thing to convert
// this back to a relative link.
const configuration = async () => fetch(`${window.location.pathname}config.json`).then(jsonIfOk);

const connectToGithub = async (repoName) => {
  const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';
  const gh = await github.connect(siteId, ['repo', 'user']);
  showLoggedIn(gh.user.login);
  return checkRepoVersion(await gh.getRepo(repoName));
};

const makeStorage = async () => {
  let branch = window.location.pathname.substring(1);

  if (branch.endsWith('/')) {
    branch = branch.substring(0, branch.length - 1);
  }

  const repo = github.hasToken() ? await connectToGithub('itp') : null;
  if (repo === null) showLoggedOut();
  return files(branch, repo);
};

const attachToGithub = async (storage) => {
  const repo = await connectToGithub('itp');
  return storage.attachToRepo(repo);
};

const setup = async () => {
  const config = await configuration();
  const storage = await makeStorage();
  if (storage.repo !== null) {
    storage.ensureFileInBranch(config.files[0]).then(fillEditor);
  } else {
    storage.load(config.files[0]).then(fillEditor);
  }

  loginButton.onclick = async () => {
    attachToGithub(storage).then(async (b) => {
      if (b.created) {
        storage.save(config.files[0], editor.getValue());
      } else {
        const current = editor.getValue();
        const starter = await storage.ensureFileInBranch(config.files[0]);
        if (current !== starter) {
          storage.save(config.files[0], current);
        }
      }
    });
  };

  submit.onclick = () => reevaluateCode(config, storage);
  repl.focus();
};

setup();
