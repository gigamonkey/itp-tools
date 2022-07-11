import github from './modules/github';

const REPO_NAME = 'itp';

const scopes = ['repo', 'user'];
const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

const toJSON = (r) => JSON.stringify(r, null, 2);

const test = async () => {
  // Simulated file content.
  const fileContent = toJSON({ foo: 'bar', baz: 'quux', another: 45 });

  let out = '';

  const repo = await github.repo(siteId, scopes, REPO_NAME).catch(() => false);

  if (repo) {
    out += `Repo. owner: ${repo.owner}; name: ${repo.name}; user.name: ${repo.user.name}; user.login: ${repo.user.login}\n\n`;

    const x = await repo.ensureRepo();

    out += x.created ? '// Created repo.\n' : '// Found existing repo.\n';
    out += toJSON(x.repo);

    // Have to create a file to create the first ref and thus the first branch.
    const { file, updated, created } = await repo.ensureFileContents(
      'config4.json',
      'Making config file',
      'Updating config file',
      btoa(fileContent),
      'main',
    );

    if (created) {
      out += '\n// Created file\n';
    } else if (updated) {
      out += '\n// Updated file\n';
    } else {
      out += '\n// File already existed with correct contents.\n';
    }
    out += toJSON(file);

    const main = await repo.getRef('heads/main').catch(() => false);
    const checkpoints = await repo.getRef('heads/checkpoints').catch(() => false);

    if (main) {
      out += `\nmain: ${toJSON(main)}\n`;

      if (!checkpoints) {
        out += await repo
          .makeRef('heads/checkpoints', main.data.object.sha)
          .then((cp) => `\ncheckpoints:${toJSON(cp)}\n`)
          .catch((error) => `Couldn't make checkpoints: ${error}`);
      } else {
        out += `\ncheckpoints already exists: ${toJSON(checkpoints)}\n`;
      }
    } else {
      out += "Couldn't find main.";
    }
  } else {
    out += "Couldn't get repo!";
  }

  document.getElementById('stuff').innerText = out;
};

test().then(() => console.log('Done'));
