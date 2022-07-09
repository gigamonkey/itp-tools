import { request } from "@octokit/request";
import { Octokit } from "@octokit/rest";

const token = "<FILL THIS IN>";
const octokit = new Octokit({ auth: token });

const fileContent = "{}";

const toJSON = (r) => JSON.stringify(r, null, 2);

let out = "";

const u = await octokit.rest.users.getAuthenticated().catch((e) => false);

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
