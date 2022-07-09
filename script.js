import { request } from "@octokit/request";
import { Octokit } from "@octokit/rest";
import netlify from "netlify-auth-providers";

// Simulated file content.
const fileContent = "{foo: 'bar'}";

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
    .request("GET /repos/{owner}/{repo}/contents/{path}", { ...repo, path: "config.json" })
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
} else {
  out += "Couldn't get user!";
}

document.getElementById("stuff").innerText = out;
