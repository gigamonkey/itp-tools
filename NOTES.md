# Setup

When a user first logs into GitHub, we check if they a) have an existing `itp`
repo and b) if they do if it contains a .version file that matches one of the
versions we know about.

If no `itp` repository exists, life is easy. Show a dialog asking if it's okay
to create one and once confirmed, create from the `gigamonkey/itp-template`
repo.

If one exists and the `.version` file seems legit, then we're good to go.

The only problematic case is there is an `itp` repo but it does not contain a
good `.version` file. In that case we need to ask the user whether they have an
`itp` repo for some other reason or if they have one that is somehow corrupted.

# Basic model

Each branch will consist of files all under a single directory named the same as
the branch. Most of these branches will be named for particular assignments or
problem sets. Probably we want to limit the possible names to one or two levels.

Whenever files are saved in the browser they are checkpointed to the branch so
we have a complete log of all changes. (This is obviously different than how
we'd normally use git to create coherent changes. If we commit on every save
that may mean that in projects with multiple files they could be mutually
inconsistent at some commits.)

Students turn in work by creating a PR in the GitHub web UI to merge from the
assignment branch to `main`. Then I can comment on the PR, make suggestions,
etc. and when they finally merge it that is the submission.

# Fate of assignment branches

We probably want to actually merge, not squash or rebase, to main in order for
me to be able to examine the steps along the way. Or maybe copy the working
branch around, possibly renamed. The main issue is if we don't do a regular
merge, then there's

If we delete the assignment branches when we merge, then there's no way to work
on those files again without creating a new branch with the same name as the old
branch. Which is maybe good. The assignment is turned in, etc. However it should
be possible in the ITP web UI to say, make a branch for this existing directory;
in fact that may be how we start work on a given assignment.
