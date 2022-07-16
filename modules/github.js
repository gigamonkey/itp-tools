import Netlify from 'netlify-auth-providers';
import { Octokit } from '@octokit/core';

const SCOPES = ['repo', 'user', 'read:org'];

const always = (x) => () => x;

const getToken = () => sessionStorage.getItem('githubToken');

const setToken = (t) => sessionStorage.setItem('githubToken', t);

const removeToken = () => sessionStorage.removeItem('githubToken');

const token = async (siteId) => {
  const t = getToken();
  if (t !== null) return t;

  const config = { site_id: siteId };
  const auth = { provider: 'github', scope: SCOPES };

  return new Promise((resolve, reject) => {
    new Netlify(config).authenticate(auth, (err, data) => {
      if (err) reject(err);
      setToken(data.token);
      resolve(data.token);
    });
  });
};

/*
 * Utility for handling response objects from GitHub API. (Hmmm, maybe it's the
 * octokit/core.request method that's wrapping up the HTTP status and headers.
 * Anyway, this deal with that, more or less.
 */
const if200 = (r) => {
  if (200 <= r.status && r.status < 300) {
    return r.data;
  }
  throw r;
};

const if404 = (value) => (r) => {
  if (r.status === 404) {
    return value;
  }
  throw r;
};

/*
 * Wrapper over the octokit object and the fetched user data so by the time one
 * of these is constructed we know we have sucessfully logged in and retrieved
 * the information about who we are. It then gives us the entry points to get at
 * repos belonging to this user. (Could obviously be fleshed out to deal with
 * other aspects of the logged in user but I don't need any of them yet.) Could
 * also add methods for getting at other people's repos.
 */
class Github {
  constructor(octokit, user) {
    this.octokit = octokit;
    this.user = user;
    this.userRepos = new RepoOwner(octokit, this.user.login);
  }

  membership(org) {
    console.log(`Looking for membership for '${org}'`);
    const url = 'GET /user/memberships/orgs/{org}';
    return this.octokit.request(url, { org }).then(if200).catch(if404(false));
  }

  orgRepos(org) {
    return new RepoOwner(this.octokit, org);
  }

  getRepo(...args) {
    return this.userRepos.getRepo(...args);
  }

  makeRepo(...args) {
    return this.userRepos.makeRepo(...args);
  }

  makeRepoFromTemplate(...args) {
    this.userRepos.makeRepoFromTemplate(...args);
  }

  repoExists(...args) {
    return this.userRepos.repoExists(...args);
  }
}

class RepoOwner {
  constructor(octokit, owner) {
    this.octokit = octokit;
    this.owner = owner;
  }

  async getRepo(name) {
    const url = 'GET /repos/{owner}/{name}';
    return this.octokit
      .request(url, { owner: this.owner, name })
      .then(if200)
      .then((data) => new Repo(this.octokit, data));
  }

  async makeRepo(name) {
    const url = 'POST /user/repos';
    return this.octokit
      .request(url, { name })
      .then(if200)
      .then((data) => new Repo(this.octokit, data));
  }

  async makeRepoFromTemplate(name, templateOwner, templateRepo) {
    const url = 'POST /repos/{template_owner}/{template_repo}/generate';
    return this.octokit
      .request(url, {
        template_owner: templateOwner,
        template_repo: templateRepo,
        owner: this.owner,
        name,
        description: `Repo made from ${templateOwner}/${templateRepo}`,
        include_all_branches: true,
      })
      .then(if200);
  }

  async repoExists(name) {
    return this.getRepo(name).then(always(true)).catch(always(false));
  }
}

/*
 * Thin wrapper over the GitHub API repository object.
 */
class Repo {
  constructor(octokit, raw) {
    this.octokit = octokit;
    this.raw = raw;
    // Extract a few bits we're going to need a lot.
    this.owner = raw.owner.login;
    this.name = raw.name;
  }

  fileExists(path, ref) {
    return this.getFile(path, ref).then(always(true)).catch(if404(false));
  }

  getFile(path, ref) {
    const { owner, name } = this;
    const url = 'GET /repos/{owner}/{name}/contents/{path}';
    return this.octokit
      .request(url, {
        owner,
        name,
        path,
        ref,
        headers: {
          // Magic to defeat caching since the actual object pointed to by the path
          // can change if ref is a branch name.
          'If-None-Match': '',
        },
      })
      .then(if200);
  }

  /*
   * Create a file with the given contents as a string.
   */
  createFile(path, message, content, branch) {
    const { owner, name } = this;
    const url = 'PUT /repos/{owner}/{name}/contents/{path}';
    return this.octokit
      .request(url, { owner, name, path, message, content: btoa(content), branch })
      .then(if200);
  }

  updateFile(path, message, content, sha, branch) {
    const { owner, name } = this;
    const url = 'PUT /repos/{owner}/{name}/contents/{path}';
    return this.octokit
      .request(url, { owner, name, path, message, content: btoa(content), sha, branch })
      .then(if200);
  }

  // FIXME: if we wanted (and if we had a good SHA1 library) we could compute
  // the sha of the contents as described here
  // https://stackoverflow.com/questions/7225313/how-does-git-compute-file-hashes
  // And use that to check if we need to update tehe file rather than literally
  // comparing the contents. Dunno if that's much better.
  ensureFileContents(path, createMessage, updateMessage, content, branch) {
    // Depending on whether the file exists or not, we may get an object that
    // has a commit in it and the file data down a level. So we normalize things
    // and add some extra data about whether the file was updated or created. If
    // it was updated or created there will be a commit object in the returned
    // value. Note also that the file value in the returned object will only
    // have a content property if the file already existed with the same
    // contents as we wanted it to contain.
    const wrap = (file, updated, created) => {
      if ('commit' in file) {
        return { file: file.content, commit: file.commit, updated, created };
      }
      return { file, updated, created };
    };

    return this.getFile(path, branch)
      .then((file) => {
        if (atob(file.content) !== content) {
          const { sha } = file;
          return this.updateFile(path, updateMessage, content, sha, branch).then((f) =>
            wrap(f, true, false),
          );
        }
        return wrap(file, false, false);
      })
      .catch((e) => {
        if (e.status === 404) {
          return this.createFile(path, createMessage, content, branch).then((f) =>
            wrap(f, false, true),
          );
        }
        throw e;
      });
  }

  getBranch(name) {
    return this.getRef(`heads/${name}`);
  }

  branchExists(name) {
    return this.getBranch(name).then(always(true)).catch(always(false));
  }

  /*
   * Ensure branch named `name` exists. If it does not, create it by branchng
   * off of `parent`.
   */
  ensureBranch(name, parent) {
    return this.getBranch(name)
      .then((b) => ({ branch: b, created: false }))
      .catch(() => this.makeBranch(name, parent).then((b) => ({ branch: b, created: true })));
  }

  async makeBranch(name, parent) {
    const p = await this.getBranch(parent);
    return this.makeRef(`heads/${name}`, p.object.sha);
  }

  getRef(ref) {
    const { owner, name } = this;
    const url = 'GET /repos/{owner}/{name}/git/ref/{ref}';
    return this.octokit
      .request(url, {
        owner,
        name,
        ref,
        headers: {
          // Magic to defeat caching since the actual object pointed to by the ref
          // can change if it is branch name.
          'If-None-Match': '', // Magic to defeat caching.
        },
      })
      .then(if200);
  }

  makeRef(ref, sha) {
    const { owner, name } = this;
    const url = 'POST /repos/{owner}/{name}/git/refs';
    return this.octokit.request(url, { owner, name, ref: `refs/${ref}`, sha }).then(if200);
  }

  updateRef(ref, sha) {
    const { owner, name } = this;
    const url = 'PATCH /repos/{owner}/{name}/git/refs/{ref}';
    return this.octokit.request(url, { owner, name, ref, sha, forced: true }).then(if200);
  }

  deleteRef(ref) {
    const { owner, name } = this;
    const url = 'DELETE /repos/{owner}/{name}/git/refs/{ref}';
    return this.octokit.request(url, { owner, name, ref }).then(if200);
  }

  ensureRefAtSha(ref, sha) {
    return this.getRef(ref)
      .then((existing) => {
        if (existing.object.sha !== sha) {
          return this.updateRef(ref, sha).then((moved) => ({
            ref: moved,
            moved: true,
            created: false,
          }));
        }
        return { ref: existing, moved: false, created: false };
      })
      .catch((e) => {
        if (e.status === 404) {
          return this.makeRef(ref, sha).then((r) => ({ ref: r, moved: false, created: true }));
        }
        throw e;
      });
  }
}

/*
 * Do we have an access token?
 */
const hasToken = () => getToken() !== null;

/*
 * Connect to Github, get the current, and wrap it all up in a wrapper object.
 */
const connect = async (siteId, retries = 3) => {
  if (retries > 0) {
    const octokit = await token(siteId).then((t) => new Octokit({ auth: t }));
    return octokit
      .request('GET /user')
      .then(if200)
      .then((data) => new Github(octokit, data))
      .catch((r) => {
        if (r.status === 401) {
          removeToken();
          return connect(siteId, retries - 1);
        } else {
          throw r;
        }
      });
  }
  throw new Error("Couldn't connect.");
};

export default { connect, hasToken };
