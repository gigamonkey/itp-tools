import files from './modules/files';
import github from './modules/github';
import makeEvaluator from './modules/evaluator';
import monaco from './modules/editor';
import replize from './modules/repl';
import { jsonIfOk } from './modules/fetch-helpers';
import Login from './modules/login'

const GITHUB_ORG = 'gigamonkeys'; // FIXME: load this from config file from website.

const CANONICAL_VERSION = 'https://raw.githubusercontent.com/gigamonkey/itp-template/main/.version';

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

const loggedInName = $('#logged-in');
const loginButton = $('#login');
const minibuffer = $('#minibuffer');
const submit = $('#submit');

const login = new Login;

////////////////////////////////////////////////////////////////////////////////
// UI manipulations

const el = (name, text) => {
  const e = document.createElement(name);
  if (text) e.innerText = text;
  return e;
};

const url = (s) => {
  const e = el('a', s);
  e.href = s;
  return e;
};

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
  loggedInName.hidden = true;
};

const showLoggedIn = (login) => {
  fill(loggedInName, '.github-user', el('span', login.username));
  loggedInName.hidden = false;
};

const showInfo = () => {
  const b = $('#banner');
  b.querySelector('.x').hidden = false;
  b.querySelector('.info').hidden = false;
  b.hidden = false;
};

const hideInfo = () => {
  $('#banner').hidden = true;
};

const showBanner = () => {

  const b = $('#banner');

  if (login.anonymous || login.isMember) {

    b.hidden = true;

  } else {

    // Hide everything ...
    $$('#banner > div').forEach((e) => {
      e.hidden = true;
    });

    // ... and then show the right thing.
    if (!login.isLoggedIn) {
      b.querySelector('.logged-out').hidden = false;

    } else if (!login.isMember) {
      $('#banner .profile-url > span').replaceChildren(url(login.profileURL));
      $('#banner .profile-url > svg').onclick = () => {
        navigator.clipboard.writeText(login.profileURL);
      };
      b.querySelector('.not-a-member').hidden = false;
    }

    b.hidden = false;
  }
};

const goAnonymous = () => {
  login.anonymous = true;
  showBanner();
}

const deanonymize = () => {
  login.anonymous = false;
  showBanner();
}


// End UI manipulations
////////////////////////////////////////////////////////////////////////////////

const editor = monaco('editor');
const repl = replize('repl');

/*
const checkRepoVersion = async (repo) => {
  const [expected, got] = await Promise.all([
    fetch(CANONICAL_VERSION).then(jsonIfOk),
    repo
      .getFile('.version')
      .then((f) => JSON.parse(atob(f.content)))
      .catch(() => 'No .version file'),
  ]);
  return repo;
};
*/

// The window.location.pathname thing below is part of our base href kludge to
// deal with the monaco worker plugin files (see modules/editor.js). Since we've
// likely set a <base> in our HTML we need to do this gross thing to convert
// this back to a relative link.
const configuration = async () => fetch(`${window.location.pathname}config.json`).then(jsonIfOk);

const connectToGithub = async () => {
  const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';
  const gh = await github.connect(siteId);

  login.logIn(gh.user.login, gh.user.html_url);

  showLoggedIn(login);

  if (await gh.membership(GITHUB_ORG)) {
    login.isMember = true;
  }

  showBanner();

  return gh.orgRepos(GITHUB_ORG).getRepo(gh.user.login);
};

const makeStorage = async () => {
  let branch = window.location.pathname.substring(1);

  if (branch.endsWith('/')) {
    branch = branch.substring(0, branch.length - 1);
  }

  const repo = github.hasToken() ? await connectToGithub('itp') : null;

  if (repo === null) {
    showBanner();
  }
  return files(branch, repo);
};

const setup = async () => {
  const config = await configuration();
  const storage = await makeStorage();
  const evaluator = makeEvaluator(config.iframe, config.script, repl, message);

  const filename = config.files[0];

  // Put code in editor and evaluate it.
  const fillEditor = (code) => {
    editor.setValue(code);
    evaluator.load(code, filename);
  };

  // Evaluate code now in editor and also save it.
  const reevaluateCode = () => {
    const code = editor.getValue();
    storage.save(filename, code).then((f) => {
      if (f.updated || f.created) {
        console.log('Saved.'); // FIXME: should show this in the web UI somewhere.
      }
    });
    evaluator.load(code, filename);
  };

  // For when we log in to GitHub after the user has loaded the page and maybe
  // even edited the file. FIXME: this doesn't do anything with the machinery
  // (which probably isn't fully baked) for saving versions of files while
  // disconnected.
  const attachToGithub = async () => {

    if (login.isLoggedIn) return;

    storage.repo = await connectToGithub('itp');

    const current = editor.getValue();
    const starter = await storage.loadFromWeb(filename);
    const inRepo = await storage.ensureFileInBranch(filename);

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
    storage.ensureFileInBranch(filename).then(fillEditor);
  } else {
    storage.load(filename).then(fillEditor);
  }

  loginButton.onclick = attachToGithub;
  $('#anonymous').onclick = goAnonymous;
  $('#github-icon').onclick = attachToGithub;
  $('#info-circle').onclick = showInfo;
  $('#banner svg.x').onclick = hideInfo;
  submit.onclick = reevaluateCode;
  repl.focus();
};

setup();
