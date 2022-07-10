import netlify from "netlify-auth-providers";
import { Octokit } from "@octokit/rest";

// FIXME: Not exactly pro-style, but will do for now.
const token = localStorage.getItem("githubToken");

const authenticate = async (site_id, scopes) => {
  if (token !== undefined) {
    return Promise.resolve(new Octokit({ auth: token }));
  } else {
    return new Promise((resolve, reject) => {
      new netlify({ site_id }).authenticate({ provider: "github", scope: scopes }, (err, data) => {
        if (err) {
          reject(err);
        }
        console.log(`Got token via OAuth: ${data.token}`);
        localStorage.setItem("githubToken", data.token);
        resolve(new Octokit({ auth: data.token }));
      });
    });
  }
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

  getRepo() {
    const { owner, name, ...rest } = this;
    const url = "GET /repos/{owner}/{name}";
    return this.octokit.request(url, { owner, name });
  }

  makeRepo() {
    const { name, ...rest } = this;
    const url = "POST /user/repos";
    return this.octokit.request(url, { name });
  }

  ensureRepo() {
    return this.getRepo()
      .then((repo) => ({ repo, created: false }))
      .catch((e) => {
        if (e.status === 404) {
          console.log(`Repo ${this.owner}/${this.name} does not exist. Creating.'`);
          return this.makeRepo().then((repo) => ({ repo, created: true }));
        } else {
          throw e;
        }
      });
  }

  getFile(path, ref) {
    const { owner, name, ...rest } = this;
    const url = "GET /repos/{owner}/{name}/contents/{path}";
    return this.octokit.request(url, { owner, name, path, ref });
  }

  createFile(path, message, content, branch) {
    const { owner, name, ...rest } = this;
    const url = "PUT /repos/{owner}/{name}/contents/{path}";
    return this.octokit.request(url, { owner, name, path, message, content, branch });
  }

  updateFile(path, message, content, sha, branch) {
    const { owner, name, ...rest } = this;
    const url = "PUT /repos/{owner}/{name}/contents/{path}";
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
          return this.updateFile(path, updateMessage, content, file.data.sha, branch).then((f) => wrap(f, true, false));
        } else {
          return wrap(file, false, false);
        }
      })
      .catch((e) => {
        if (e.status === 404) {
          return this.createFile(path, createMessage, content, branch).then((f) => wrap(f, false, true));
        } else {
          throw e;
        }
      });
  }

  getRef(ref) {
    const { owner, name, ...rest } = this;
    const url = "GET /repos/{owner}/{name}/git/ref/{ref}";
    return this.octokit.request(url, { owner, name, ref });
  }

  makeRef(ref, sha) {
    const { owner, name, ...rest } = this;
    const url = "POST /repos/{owner}/{name}/git/refs";
    return this.octokit.request(url, { owner, name, ref: `refs/${ref}`, sha });
  }

  updateRef(ref, sha) {
    const { owner, name, ...rest } = this;
    const url = "PATCH /repos/{owner}/{name}/git/refs/{ref}";
    return this.octokit.request(url, { owner, name, ref, sha, forced: true });
  }

  deleteRef(ref) {
    const { owner, name, ...rest } = this;
    const url = "DELETE /repos/{owner}/{name}/git/refs/{ref}";
    return this.octokit.request(url, { owner, name, ref });
  }

  ensureRefSha(ref, sha) {
    return this.getRef(ref)
      .then((existing) => {
        if (existing.data.object.sha !== sha) {
          return this.updateRef(ref, sha).then((moved) => ({ ref: moved, moved: true, created: false }));
        } else {
          return { ref: existing, moved: false, created: false };
        }
      })
      .catch((e) => {
        if (e.status === 404) {
          return this.makeRef(ref, sha).then((r) => ({ ref: r, moved: false, created: true }));
        } else {
          throw e;
        }
      });
  }
}

const repo = async (siteId, scopes, repoName) => {
  return authenticate(siteId, scopes)
    .then((octokit) => octokit.rest.users.getAuthenticated().then((user) => new Repo(octokit, user.data, repoName)))
}

export { repo };
