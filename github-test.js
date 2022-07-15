import github from './modules/github';

const REPO_NAME = 'itp';

const siteId = '1d7e043c-5d02-47fa-8ba8-9df0662ba82b';

const toJSON = (r) => JSON.stringify(r, null, 2);

const test = async () => {
  let out = '';

  const gh = await github.connect(siteId);

  out += toJSON(gh.user);
  out += '\n// lookiing for gigamonkeys membership\n';
  out += toJSON(await gh.membership('gigamonkeys'));

  out += '\n// Getting repo//`n';
  const r = await gh.orgRepos('gigamonkeys').getRepo('gigamonkey')
  out += toJSON(r);

  out += '\n// Checking .version exists/\n';
  out += toJSON(await r.fileExists(".version", 'main'));

  out += '\n// Checking .garbage exists/\n';
  out += toJSON(await r.fileExists(".garbage", 'main'));

  if (false) {
    if (await gh.repoExists(REPO_NAME)) {
      out += `\n// ${REPO_NAME} exists.\n`;
    }

    try {
      const repo = await gh.getRepo(REPO_NAME);
      out += '\n// Found existing repo.\n';
      out += toJSON(repo.raw);

      out += `\nLooking for file\n`;
      const file = await repo.getFile('config.json', 'main');
      out += toJSON(file);

      out += `\nEnsuring a file\n`;
      const newfile = await repo.ensureFileContents(
        'newfile5.json',
        'Making newfile',
        'Updating newfile',
        'some new, new content',
        'main',
      );
      out += toJSON(newfile);

      out += `\n// Looking for main in ${repo.name}.\n`;
      const m = await repo.getRef('heads/main');
      out += toJSON(m);

      const main2Exists = await repo.branchExists('main2');
      if (main2Exists) {
        out += `\n// main2 already exsits in ${repo.name}.\n`;
      } else {
        out += `\n// Creating main2 in ${repo.name}.\n`;
        out += toJSON(await repo.makeRef('heads/main2', m.object.sha));
      }

      out += `\nUpdating a file\n`;
      const updated = await repo.updateFile(
        'newfile5.json',
        'Updating newfile3',
        `some new content ${Math.random()}`,
        newfile.file.sha,
      );
      out += toJSON(updated);
    } catch (e) {
      out += `// ${e}\n`;
      out += "Couldn't get repo.";

      try {
        const r = await gh.makeRepoFromTemplate(REPO_NAME, 'gigamonkey', 'itp-template');
        out += '\n// Made new repo.\n';
        out += toJSON(r.raw);
      } catch (e2) {
        out += e2;
        out += "Couldn't make repo.";
      }
    }
  }

  document.getElementById('stuff').innerText = out;
};

test();
