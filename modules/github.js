import Netlify from 'netlify-auth-providers';
import { Octokit } from '@octokit/core';

// FIXME: Not exactly pro-style, but will do for now.
const token = sessionStorage.getItem('githubToken');

const always = (x) => () => x;

const checkLogin = async () => {
  return new Octokit({ auth: token })
    .request('GET /user')
    .then(() => true)
    .catch((e) => false);
};

const authenticate = async (siteId, scopes) => {
  return token !== null
    ? Promise.resolve(new Octokit({ auth: token }))
    : new Promise((resolve, reject) => {
        new Netlify({ site_id: siteId }).authenticate(
          { provider: 'github', scope: scopes },
          (err, data) => {
            if (err) {
              reject(err);
            }
            console.log(`Got token via OAuth: ${data.token}`);
            sessionStorage.setItem('githubToken', data.token);
            resolve(new Octokit({ auth: data.token }));
          },
        );
      });
};

/*
 * Thin wrapper over the GitHub API for doing things with a repo.
 */
class Repo {
  constructor(octokit, user, name) {
    this.octokit = octokit;
    this.user = user;
    this.owner = this.user.login;
    this.name = name;
  }

  exists() {
    return this.getRepo().then(always(true)).catch(always(false));
  }

  getRepo() {
    const { owner, name } = this;
    const url = 'GET /repos/{owner}/{name}';
    return this.octokit.request(url, { owner, name });
  }

  makeRepo() {
    const { name } = this;
    const url = 'POST /user/repos';
    return this.octokit.request(url, { name });
  }

  ensureRepo() {
    return this.getRepo()
      .then((repo) => ({ repo, created: false }))
      .catch((e) => {
        if (e.status === 404) {
          console.log(`Repo ${this.owner}/${this.name} does not exist. Creating.'`);
          return this.makeRepo().then((repo) => ({ repo, created: true }));
        }
        throw e;
      });
  }

  getFile(path, ref) {
    const { owner, name } = this;
    const url = 'GET /repos/{owner}/{name}/contents/{path}';
    return this.octokit.request(url, {
      owner,
      name,
      path,
      ref,
      headers: {
        // Magic to defeat caching since the actual object pointed to by the path
        // can change if ref is a branch name.
        'If-None-Match': '',
      },
    });
  }

  createFile(path, message, content, branch) {
    const { owner, name } = this;
    const url = 'PUT /repos/{owner}/{name}/contents/{path}';
    return this.octokit.request(url, { owner, name, path, message, content, branch });
  }

  updateFile(path, message, content, sha, branch) {
    const { owner, name } = this;
    const url = 'PUT /repos/{owner}/{name}/contents/{path}';
    return this.octokit.request(url, { owner, name, path, message, content, sha, branch });
  }

  ensureFileContents(path, createMessage, updateMessage, content, branch) {
    const wrap = (file, updated, created) => ({ file, updated, created });

    return this.getFile(path, branch)
      .then((file) => {
        // N.B. the base64 encoded content can apparently have line breaks in it
        // or something that means the same actual content can be encoded into
        // unequal strings so we need to decode to compare contents.
        if (atob(file.data.content) !== atob(content)) {
          const { sha } = file.data;
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

  getRef(ref) {
    const { owner, name } = this;
    const url = 'GET /repos/{owner}/{name}/git/ref/{ref}';
    return this.octokit.request(url, {
      owner,
      name,
      ref,
      headers: {
        // Magic to defeat caching since the actual object pointed to by the ref
        // can change if it is branch name.
        'If-None-Match': '', // Magic to defeat caching.
      },
    });
  }

  makeRef(ref, sha) {
    const { owner, name } = this;
    const url = 'POST /repos/{owner}/{name}/git/refs';
    return this.octokit.request(url, { owner, name, ref: `refs/${ref}`, sha });
  }

  updateRef(ref, sha) {
    const { owner, name } = this;
    const url = 'PATCH /repos/{owner}/{name}/git/refs/{ref}';
    return this.octokit.request(url, { owner, name, ref, sha, forced: true });
  }

  deleteRef(ref) {
    const { owner, name } = this;
    const url = 'DELETE /repos/{owner}/{name}/git/refs/{ref}';
    return this.octokit.request(url, { owner, name, ref });
  }

  ensureRefSha(ref, sha) {
    return this.getRef(ref)
      .then((existing) => {
        if (existing.data.object.sha !== sha) {
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

const user = async (siteId, scopes) =>
  authenticate(siteId, scopes).then((octokit) => octokit.request('GET /user'));

const repo = async (siteId, scopes, repoName) =>
  authenticate(siteId, scopes).then((octokit) =>
    octokit.request('GET /user').then((user) => new Repo(octokit, user.data, repoName)),
  );

export default { user, repo, checkLogin };
