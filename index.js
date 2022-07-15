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


const setup = async () => {
  const config = await configuration();
  const storage = await makeStorage();
  const evaluator = makeEvaluator(config.iframe, repl, message);

  // Put code in editor and evaluate it.
  const fillEditor = (code) => {
    editor.setValue(code);
    evaluator.load(code);
  };

  // Evaluate code now in editor and also save it.
  const reevaluateCode = () => {
    const code = editor.getValue();
    storage.save(config.files[0], code).then((f) => {
      if (f.updated || f.created) {
        console.log('Saved.'); // FIXME: should show this in the web UI somewhere.
      }
    });
    evaluator.load(code);
  };

  // For when we log in to GitHub after the user has loaded the page and maybe
  // even edited the file. FIXME: this doesn't do anything with the machinery
  // (which probably isn't fully baked) for saving versions of files while
  // disconnected.
  const attachToGithub = async () => {
    storage.repo = await connectToGithub('itp');

    const file = config.files[0];
    const current = editor.getValue();
    const starter = await storage.loadFromWeb(file);
    const inRepo = await storage.ensureFileInBranch(file);

    if (current === starter && inRepo !== starter) {
      // I.e. we loaded the page, got the starter, and then logged in
      // immediately. Switch to repo version.
      fillEditor(inRepo);
    } else if (current !== starter && current !== inRepo) {
      // We loaded the page, messed about with the code, and then logged in.
      // Don't really need to do anything since we're just going to leave things
      // as they are. However might be nice to ask if they want to revert to
      // what's in the repo. Or show a diff. Or whatever. If they then evaluate
      // the code it will be saved, stomping the latet verson in git. Of course,
      // old versions are recoverable from git though not presently through this
      // code UI.
    }
  };

  if (storage.repo !== null) {
    storage.ensureFileInBranch(config.files[0]).then(fillEditor);
  } else {
    storage.load(config.files[0]).then(fillEditor);
  }

  loginButton.onclick = attachToGithub;
  submit.onclick = reevaluateCode;
  repl.focus();
};

setup();
