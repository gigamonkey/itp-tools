class Login {
  constructor() {
    this.username = null;
    this.profileURL = null;
    this.isMember = false;
    this.anonymous = false;
  }

  logIn(username, profileURL) {
    this.username = username;
    this.profileURL = profileURL;
  }

  get isLoggedIn() {
    return this.username !== null;
  }
}

export default Login;
