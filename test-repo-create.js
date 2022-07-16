import github from './modules/github';

const GITHUB_ORG = 'gigamonkeys';

const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

let gh = null;

const show = (id, value) => {
  const p = document.getElementById(id);
  p.querySelector('code').innerText = value;
  p.hidden = false;
};

const showLink = (id, link) => {
  const p = document.getElementById(id);
  const a = p.querySelector('a.link');
  a.href = link;
  a.innerText = link;
  p.hidden = false;
};

document.getElementById('login').onclick = async () => {
  try {
    gh = await github.connect(siteId);
    if (await gh.membership(GITHUB_ORG)) {
      show('membership-good', GITHUB_ORG);
      show('after-login', `${GITHUB_ORG}/${gh.user.login}`);
    } else {
      show('membership-bad', GITHUB_ORG);
    }
  } catch (e) {
    show('bad-login', String(e));
  }
};

document.getElementById('doit').onclick = async () => {
  const name = gh.user.login;

  if (await gh.orgRepos(GITHUB_ORG).repoExists(name)) {
    show('already-exists', `${GITHUB_ORG}/${name}`);
  } else {
    document.getElementById('creating').hidden = false;
    try {
      const repo = await gh
        .orgRepos(GITHUB_ORG)
        .makeRepoFromTemplate(name, 'gigamonkey', 'itp-template');
      showLink('send-link', repo.html_url);
    } catch (e) {
      show('show-problem', String(e));
    }
  }
};
