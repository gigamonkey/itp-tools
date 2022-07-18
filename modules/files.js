import { textIfOk } from './fetch-helpers';

class Files {
  constructor(branch, repo) {
    this.branch = branch;
    this.repo = repo; // maybe null.
    this.inMemory = {};
  }

  async ensureFileInBranch(file) {
    if (this.repo === null) {
      throw Error("Can't ensure file until attached to repo.");
    }

    if (!(await this.repo.branchExists(this.branch))) {
      // Add the starter file to main before we branch so the PR is only the
      // changes from the starter code. FIXME: if we want to have multiple
      // starter files we'll have to refactor this a bit to create all the files
      // in main before creating the branch. I.e. it won't be enough to just
      // call this method once per file.
      if (!(await this.existsOnBranch(file, 'main'))) {
        const text = await this.loadFromWeb(file);
        await this.saveToGithubOnBranch(file, text, 'main');
      }
      await this.repo.makeBranch(this.branch, 'main');
    }

    // Now we know the branch exists and the file had better because the branch
    // was made from main after the file was added there. If the file has been
    // deleted out of band or something this will throw which is probably right.
    return this.loadFromGithub(file, this.branch);
  }

  /*
   * Load the latest version of the file.
   */
  async load(file) {
    if (this.repo !== null) {
      return this.loadFromGithub(file, this.branch);
    } else {
      return this.loadFromWeb(file);
    }
  }

  /*
   * Save the file with the given content.
   */
  save(file, content) {
    if (this.repo !== null) {
      return this.saveToGithub(file, content);
    } else {
      // FIXME: this return type probably doesn't match the github one
      return this.saveInMemory(file, content);
    }
  }

  /*
   * Get the file contents from Github.
   */
  loadFromGithub(file, branch) {
    const path = this.gitPath(file);
    console.log(`Loading from github: ${path}`);
    return this.repo.getFile(path, branch).then((file) => atob(file.content));
  }

  /*
   * Get the file contents from the web. (For starter files).
   */
  async loadFromWeb(file) {
    console.log(`Loading from web: ${file}`);
    return fetch(`/${this.branch}/${file}`).then(textIfOk);
  }

  /*
   * Save file content to github in correct directory and branch.
   */
  saveToGithub(file, content) {
    return this.saveToGithubOnBranch(file, content, this.branch);
  }

  /*
   * Save file content to github in correct directory but a specified branch.
   */
  saveToGithubOnBranch(file, content, branch) {
    const path = this.gitPath(file);
    return this.repo.ensureFileContents(path, 'Creating', 'Updating', content, branch);
  }

  /*
   * Does the file exist in the correct directory on the given branch.
   */
  existsOnBranch(file, branch) {
    return this.repo.fileExists(this.gitPath(file), branch);
  }

  /*
   * Save new version in memory.
   */
  saveInMemory(file, content) {
    if (!(file in this.inMemory)) {
      this.inMemory[file] = [];
    }
    this.inMemory[file].push(content);

    // kludge to let .then() work.
    return new Promise((res, rej) => res({}));
  }

  gitPath(file) {
    return `${this.branch}/${file}`;
  }
}

const files = (branch, repo) => new Files(branch, repo);

export default files;
