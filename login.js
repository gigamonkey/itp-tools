import github from './modules/github';

const REPO_NAME = 'itp';
const SITE_ID = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

const connectToRepo = async () => {
  // Login to Github.
  const gh = await github.connect(SITE_ID, ['repo', 'user']);

  show('logged-in');

  // Determine name of the itp repo. Default to REPO_NAME but could have
  // override mechanism if needed.
  const name = await getRepoName(gh.user.login);

  try {
    // Check if repo exists. (TODO: check that it is well formed.)
    const repo = await gh.repo(name);

    if (await wellFormed(repo)) {
      //window.location = '/';
      show('all-set');
    } else {
      show('malformed-repo', name);
    }
  } catch (e) {
    // If repo doesn't exist, tell them we're going to set it up and give
    // them a button to press to create the new repo.
    show('setup-message', name);
    document.getElementById('setup-repo').onclick = () => {
      makeRepo(gh, name);
    };
  }
};

/*
 * This is where we could provide an override mechanism in case someone already
 * has an 'itp' repo. And because this is already async we'll be able to make
 * another API call or something.
 */
const getRepoName = async (login) => {
  console.log(`Getting repo name for ${login}`);
  return REPO_NAME;
};

/*
 * Create the repo we will use to save files in. Probably should actually be
 * made from a template.
 */
const makeRepo = async (gh, name) => {
  // Redirect to assignments page on success, otherwise show error message.
  try {
    gh.makeRepo(name);
    //window.location = '/';
    show('all-set');
  } catch (e) {
    show('problem-making-repo', name);
  }
};

/*
 * Make this async so later we can do something that actually requires talking
 * to GitHub to check out the repo.
 */
const wellFormed = async (repo) => Promise.resolve(true);

/*
 * Show a hidden div, filling in any .repo-name elements first.
 */
const show = (id, repoName) => {
  const div = document.getElementById(id);
  div.querySelectorAll('.repo-name').forEach((e) => {
    e.innerText = repoName;
  });
  div.hidden = false;
};

connectToRepo();
