import netlify from "netlify-auth-providers";
import { Octokit } from "@octokit/rest";

// TODO:
//
// stash access token in cookie? And check if it still works before authing again?
//

const scopes = ["repo", "user"];
const site_id = "1d7e043c-5d02-47fa-8ba8-9df0662ba82b";

const token = undefined;

const authenticate = async () => {
  if (token !== undefined) {
    return Promise.resolve(new Octokit({ auth: token }));
  } else {
    return new Promise((resolve, reject) => {
      new netlify({ site_id }).authenticate({ provider: "github", scope: scopes }, (err, data) => {
        if (err) {
          reject(err);
        }
        console.log(data.token);
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
    return this.octokit.request("GET /repos/{owner}/{name}", { owner: this.owner, name: this.name });
  }

  makeRepo() {
    return this.octokit.request("POST /user/repos", { name: this.name });
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
    return octokit.request("GET /repos/{owner}/{name}/contents/{path}", {
      owner: this.owner,
      name: this.name,
      path,
      ref,
    });
  }

  getRef(ref) {
    return this.octokit.request("GET /repos/{owner}/{name}/git/ref/{ref}", {
      owner: this.owner,
      name: this.name,
      ref,
    });
  }
}



const getRepo = (octokit, owner, repo) => octokit.request("GET /repos/{owner}/{repo}", { owner, repo });

const makeRepo = (octokit, name) => octokit.request("POST /user/repos", { name });

const ensureRepo = (octokit, owner, repo) => {
  return getRepo(octokit, owner, repo)
    .then((r) => {
      console.log(`Found repo`);
      return { repo: r, created: false };
    })
    .catch((e) => {
      if (e.status === 404) {
        console.log(`Repo ${owner}/${repo} does not exist. Creating.'`);
        return { repo: makeRepo(octokit, repo), created: true };
      } else {
        throw e;
      }
    });
};

const getFile = (owner, repo, path, ref) =>
  octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner, repo, path, ref });

const getRef = (owner, repo, ref) => octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", { owner, repo, ref });

const octokit = await authenticate().catch((error) => false);

const u = await octokit.rest.users.getAuthenticated().catch((e) => false);

const toJSON = (r) => JSON.stringify(r, null, 2);

// Simulated file content.
const fileContent = toJSON({ foo: "bar", baz: "quux" });

let out = "";

const myRepo = new Repo(octokit, u.data, 'itp');

if (u && myRepo) {
  out += `Repo. owner: ${myRepo.owner}; name: ${myRepo.name}; user.name: ${myRepo.user.name}; user.login: ${myRepo.user.login}\n\n`;
  const owner = u.data.login;
  const repo = "itp";

  const x = await ensureRepo(octokit, owner, repo);

  out += x.created ? "// Created repo." : "// Found existing repo.";
  out += toJSON(x.repo);

  const file = await getFile(u.data.login, "itp", "config.json", "checkpoints").catch((e) => false);

  if (file) {
    out += "\n\n// Found file\n";
    out += toJSON(file);

    if (atob(file.data.content) !== fileContent) {
      out += "\n\n// Updating file";
      out += await octokit
        .request("PUT /repos/{owner}/{repo}/contents/{path}", {
          owner,
          repo,
          path: "config.json",
          message: "Making config file",
          content: btoa(fileContent),
          sha: file.data.sha,
          branch: "checkpoints",
        })
        .then(toJSON);
    }
  } else {
    out += "\n\n// Creating file";
    out += await octokit
      .request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path: "config.json",
        message: "Making config file",
        content: btoa(fileContent),
      })
      .then(toJSON);
  }

  const main = await getRef(owner, repo, "heads/main").catch((e) => false);
  const checkpoints = await getRef(owner, repo, "heads/checkpoints").catch((e) => false);

  if (main) {
    out += `\nmain: ${toJSON(main)}\n`;

    if (!checkpoints) {
      out += await octokit
        .request("POST /repos/{owner}/{repo}/git/refs", {
          ...repo,
          ref: "refs/heads/checkpoints",
          sha: main.data.object.sha,
        })
        .then((checkpoints) => `\ncheckpoints:${toJSON(checkpoints)}\n`)
        .catch((error) => `Couldn't make checkpoints: ${error}`);
    } else {
      out += `\ncheckpoints already exists: ${toJSON(checkpoints)}\n`;
    }
  } else {
    out += "Couldn't find main.";
  }
} else {
  out += "Couldn't get user!";
}

document.getElementById("stuff").innerText = out;
