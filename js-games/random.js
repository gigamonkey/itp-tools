let types = ["number", "string", "boolean", "array"];

let alphabet = "abcdefghijklmnopqrstuvwxyz";

let minNumber = 0;
let maxNumber = 10;
let words = ["food", "orange", "duck", "computer", "grue"];
let maxArrayLength = 3;

class Random {
  number() {
    return this.int(minNumber, maxNumber);
  }

  nonZeroNumber() {
    return this.int(1, maxNumber);
  }

  string() {
    return this.choice(words);
  }

  boolean() {
    return Math.random() < 0.5;
  }

  array() {
    // No empty arrays because we generate arrays to be indexed into.
    return this.arrayOfLength(this.int(maxArrayLength) + 1);
  }

  stringOfLength(len) {
    let r = "";
    for (let i = 0; i < len; i++) {
      r += alphabet[i % alphabet.length];
    }
    return r;
  }

  arrayOfLength(len) {
    return Array(len).fill().map(this.arrayTypeFunction().bind(this));
  }

  stringOrArray(len) {
    return this.boolean() ? this.stringOfLength(len) : this.arrayofLength(len);
  }

  value() {
    return this.typeFunction().bind(this)();
  }

  valueOf(type) {
    return this[type]();
  }

  oneOf(types) {
    return this.valueOf(this.choice(types));
  }

  valueForLevel(level) {
    return this.oneOf(types.slice(0, level + 1));
  }

  values(n) {
    return Array(n).fill().map(this.value.bind(this));
  }

  int(min, max) {
    if (max === undefined) {
      [min, max] = [0, min];
    }
    return min + Math.floor(Math.random() * (max - min));
  }

  choice(choices) {
    return choices[this.int(choices.length)];
  }

  arrayTypeFunction() {
    return this.choice([this.number, this.string, this.boolean]);
  }

  typeFunction() {
    return this.choice([this.number, this.string, this.boolean, this.array]);
  }
}

const random = new Random();

export { random };
