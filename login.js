import github from './modules/github';

const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

const getRepoName = async () =>
  // FIXME: this is where we could provide an override mechanism in case someone
  // already has an 'itp' repo. And because this is already async we'll be able
  // to make another API call or something.
  github.user(siteId, ['repo', 'user']).then(() => 'itp2');

const connectToRepo = async () => {
  getRepoName().then((name) => {
    github.repo(siteId, ['repo', 'user'], name).then((r) => {
      r.exists().then((ok) => {
        if (ok) {
          window.location = '/';
        } else {
          console.log('No repo');
        }
      });
    });
  });
};

connectToRepo();

// - Login to Github.

// - Determine name of the itp repo. Default to 'itp' but maybe have override mechanism.

// - Check if repo exists. (Maybe check that it is well formed.)

// - If repo doesn't exist, tell them we're going to set it up and give them a
//   button to press.

// - Create new repo and populate necessary files.

// - Redirect to assignments page.
