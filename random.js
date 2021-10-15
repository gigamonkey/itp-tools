let types = ["number", "string", "boolean", "array"];

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
    return Array(this.int(maxArrayLength + 1))
      .fill()
      .map(this.arrayTypeFunction().bind(this));
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
    switch (level) {
      case 0:
        return this.number();
      case 1:
        return this.oneOf(["number", "string"]);
      case 2:
        return this.oneOf(["number", "string", "boolean"]);
      case 3:
        return this.oneOf(["number", "string", "boolean", "array"]);
      case 4:
        return this.array();
      default:
        console.log("level " + level + " nyi");
    }
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
