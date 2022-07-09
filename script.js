import netlify from "netlify-auth-providers";
import { Octokit } from "@octokit/rest";

// TODO:
//
// stash access token in cookie? And check if it still works before authing again?
//

const scopes = ["repo", "user"];
const site_id = "1d7e043c-5d02-47fa-8ba8-9df0662ba82b";

const authWithGitHub = async () => {
  return new Promise((resolve, reject) => {
    new netlify({ site_id }).authenticate({ provider: "github", scope: scopes }, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

const octokit = await authWithGitHub()
  .then((data) => new Octokit({ auth: data.token }))
  .catch((error) => false);

const u = await octokit.rest.users.getAuthenticated().catch((e) => false);

const toJSON = (r) => JSON.stringify(r, null, 2);

// Simulated file content.
const fileContent = toJSON({ foo: "bar", baz: "quux" });

let out = "";

if (u) {
  out += `User name: ${u.data.name}; login: ${u.data.login}`;
  const repo = { owner: u.data.login, repo: "itp" };

  const foundRepo = await octokit
    .request("GET /repos/{owner}/{repo}", repo)
    .then(toJSON)
    .catch((e) => false);

  if (foundRepo) {
    out += "\n\n// found repository\n";
    out += foundRepo;
  } else {
    out += "\n\n// created repository\n";
    out += await octokit.request("POST /user/repos", { name: "itp" }).then(toJSON);
  }

  const file = await octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", { ...repo, path: "config.json", ref: "checkpoints" })
    .catch(false);

  if (file) {
    out += "\n\n// Found file\n";
    out += toJSON(file);

    if (atob(file.data.content) !== fileContent) {
      out += "\n\n// Updating file";
      out += await octokit
        .request("PUT /repos/{owner}/{repo}/contents/{path}", {
          ...repo,
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
        ...repo,
        path: "config.json",
        message: "Making config file",
        content: btoa(fileContent),
      })
      .then(toJSON);
  }

  const main = await octokit
    .request("GET /repos/{owner}/{repo}/git/ref/{ref}", { ...repo, ref: "heads/main" })
    .catch((e) => false);

  const checkpoints = await octokit
    .request("GET /repos/{owner}/{repo}/git/ref/{ref}", { ...repo, ref: "heads/checkpoints" })
    .catch((e) => false);

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
