import { request } from "@octokit/request";
import { Octokit } from "@octokit/core";

const token = <FILL THIS IN>;

const octokit = new Octokit({auth: token});

const foo = await octokit.request('POST /user/repos', {"name": "itp"});

console.log(foo);

const oneRepo = async (name) => {
  return await request("GET /repos/{user}/{name}", {
    headers: {
      authorization: `token ${token}`,
    },
    user: "gigamonkey",
    name: name,
  })
    .then((r) => JSON.stringify(r, null, 2))
    .catch((e) => "No such repo.");
};

const result = await oneRepo("estimation");

document.getElementById("stuff").innerText = result;
