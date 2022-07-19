const KEY = 'anonymousUntil';
const TTL = 15 * 60 * 1000; // fifteen minutes in milliseconds.

class Login {
  constructor() {
    this.username = null;
    this.profileURL = null;
    this.isMember = false;
    this.problemMakingRepo = null;
    this.createdRepo = false;
    this.repoURL = null;
  }

  logIn(username, profileURL) {
    this.username = username;
    this.profileURL = profileURL;
  }

  get anonymous() {
    const v = sessionStorage.getItem(KEY);
    if (v === null) {
      return false;
    } else {
      const expiresAt = Number.parseInt(v, 10);
      if (expiresAt < Date.now()) {
        sessionStorage.removeItem(KEY);
        return false;
      } else {
        sessionStorage.setItem(KEY, String(Date.now() + TTL));
        return true;
      }
    }
  }

  set anonymous(value) {
    if (value) {
      sessionStorage.setItem(KEY, String(Date.now() + TTL));
    } else {
      sessionStorage.removeItem(KEY);
    }
  }


  get isLoggedIn() {
    return this.username !== null;
  }

  get ok() {
    return this.isLoggedIn && this.isMember && this.problemMakingRepo === null;
  }
}

export default Login;
