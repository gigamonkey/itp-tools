import netlify from "netlify-auth-providers";
import { Octokit } from "@octokit/rest";

// TODO:
//
// stash access token in cookie? And check if it still works before authing again?
//

const REPO_NAME = "itp";

const scopes = ["repo", "user"];
const site_id = "1d7e043c-5d02-47fa-8ba8-9df0662ba82b";

// FIXME: Not exactly pro-style, but will do for now.
const token = localStorage.getItem("githubToken");

const authenticate = async () => {
  if (token !== undefined) {
    console.log(`Using stored token: ${token}`);
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
      .then((r) => {
        console.log(`Found repo`);
        return { repo: r, created: false };
      })
      .catch((e) => {
        if (e.status === 404) {
          console.log(`Repo ${owner}/${repo} does not exist. Creating.'`);
          return { repo: this.makeRepo(), created: true };
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

  getRef(ref) {
    const { owner, name, ...rest } = this;
    const url = "GET /repos/{owner}/{name}/git/ref/{ref}";
    return this.octokit.request(url, { owner, name, ref });
  }

  makeRef(ref, sha) {
    const { owner, name, ...rest } = this;
    const url = "POST /repos/{owner}/{name}/git/refs";
    return this.octokit.request(url, { owner, name, ref, ref, sha });
  }
}

const toJSON = (r) => JSON.stringify(r, null, 2);

// Simulated file content.
const fileContent = toJSON({ foo: "bar", baz: "quux", another: 42 });

let out = "";

const repo = await authenticate()
  .then((octokit) => octokit.rest.users.getAuthenticated().then((user) => new Repo(octokit, user.data, REPO_NAME)))
  .catch((e) => false);

if (repo) {
  out += `Repo. owner: ${repo.owner}; name: ${repo.name}; user.name: ${repo.user.name}; user.login: ${repo.user.login}\n\n`;

  const x = await repo.ensureRepo();

  out += x.created ? "// Created repo.\n" : "// Found existing repo.\n";
  out += toJSON(x.repo);

  const file = await repo.getFile("config.json", "checkpoints").catch((e) => false);

  if (file) {
    out += "\n\n// Found file\n";
    out += toJSON(file);

    if (atob(file.data.content) !== fileContent) {
      out += "\n\n// Updating file\n";
      out += await repo
        .updateFile("config.json", "Updating config file", btoa(fileContent), file.data.sha, "checkpoints")
        .then(toJSON);
    }
  } else {
    out += "\n\n// Creating file\n";
    out += await repo.createFile("config.json", "Making config file", btoa(fileContent), "main").then(toJSON);
  }

  const main = await repo.getRef("heads/main").catch((e) => false);
  const checkpoints = await repo.getRef("heads/checkpoints").catch((e) => false);

  if (main) {
    out += `\nmain: ${toJSON(main)}\n`;

    if (!checkpoints) {
      out += await repo
        .makeRef("refs/heads/checkpoints", main.data.object.sha)
        .then((checkpoints) => `\ncheckpoints:${toJSON(checkpoints)}\n`)
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

document.getElementById("stuff").innerText = out;
