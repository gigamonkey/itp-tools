class Login {
  constructor() {
    this.username = null;
    this.profileURL = null;
    this.isMember = false;
    this.anonymous = false;
    this.problemMakingRepo = null;
    this.createdRepo = false;
    this.repoURL = null;
  }

  logIn(username, profileURL) {
    this.username = username;
    this.profileURL = profileURL;
  }

  get isLoggedIn() {
    return this.username !== null;
  }

  get ok() {
    return this.isLoggedIn && this.isMember && this.problemMakingRepo === null;
  }
}

export default Login;
