import { textIfOk } from './fetch-helpers';

class Files {
  constructor(branch, repo) {
    this.branch = branch;
    this.repo = repo; // maybe null.
    if (repo !== null) this.attachToRepo(repo);
    this.inMemory = {};
  }

  /*
   * Attach our files to repo. Used if we were constructed without a repo
   * because the user weren't logged in yet. Assumes the repo has already been
   * validated as a well-formed repo.
   */
  attachToRepo(repo) {
    this.repo = repo;
    console.log(`Ensuring branch ${this.branch}`);
    return this.repo.ensureBranch(this.branch, 'main');
  }

  async ensureFileInBranch(file) {
    if (this.repo === null) {
      throw Error("Can't ensure file until attached to repo.");
    }
    try {
      // It's possible the branch was created but the file was not.
      return await this.loadFromGithub(file, this.branch);
    } catch (e) {
      const text = await this.loadFromWeb(file);
      this.saveToGithub(file, text);
      return text;
    }
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
    const path = this.gitPath(file);
    return this.repo.ensureFileContents(path, 'Creating', 'Updating', content, this.branch);
  }

  /*
   * Save new version in memory.
   */
  saveInMemory(file, content) {
    if (!(file in this.inMemory)) {
      this.inMemory[file] = [];
    }
    this.inMemory[file].push(content);
  }

  gitPath(file) {
    return `${this.branch}/${file}`;
  }
}

const files = (branch, repo) => new Files(branch, repo);

export default files;
