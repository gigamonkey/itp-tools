class Variable {
  constructor(name) {
    this.name = name;
  }

  code() {
    return this.name;
  }

  evaluate(env) {
    return env[this.name];
  }
}

class BooleanValue {
  constructor(value) {
    this.value = value;
  }

  code() {
    return this.value;
  }

  evaluate(env) {
    return this.value;
  }
}

class BooleanAnd {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() {
    return `${this.left.code()} && ${this.right.code()}`;
  }

  evaluate(env) {
    return this.left.evaluate(env) && this.right.evaluate(env);
  }
}

class BooleanOr {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() {
    return `${this.left.code()} || ${this.right.code()}`;
  }

  evaluate(env) {
    return this.left.evaluate(env) || this.right.evaluate(env);
  }
}

class BooleanEquals {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() {
    return `${this.left.code()} === ${this.right.code()}`;
  }

  evaluate(env) {
    return this.left.evaluate(env) === this.right.evaluate(env);
  }
}

class BooleanNotEquals {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  code() {
    return `${this.left.code()} !== ${this.right.code()}`;
  }

  evaluate(env) {
    return this.left.evaluate(env) !== this.right.evaluate(env);
  }
}

class BooleanNot {
  constructor(operand) {
    this.operand = operand;
  }

  code() {
    return `!${this.operand.code()}`;
  }

  evaluate(env) {
    return !this.operand.evaluate(env);
  }
}

export { Variable, BooleanAnd, BooleanOr, BooleanEquals, BooleanNotEquals, BooleanNot };
