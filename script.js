// Basic plan.

// Generate a bunch of random expressions whose complexity is based on 
// the current level. (E.g. initially just simple values, maybe of one type;
// later more complex expressions.) These make up the palette for a level.

// Then generate random questions: pick one or more expressions at random
// and then generate a random expression with that many holes in it and
// evaluate it with the selected expressions to get the result. By construction
// the expressions needed to fill the holes exist.

let types = ["number", "string", "boolean", "array"];

let minNumber = -10;
let maxNumber = 20;
let words = ["food", "orange", "duck", "computer", "grue"];
let maxArrayLength = 5;

class Generator {

  number() { return this.int(minNumber, maxNumber); }

  string() { return this.choice(words); }

  boolean() { return Math.random() < 0.5; }

  array() { return Array(this.int(maxArrayLength)).fill().map(this.arrayTypeFunction().bind(this)); }

  value() { return this.typeFunction().bind(this)(); }

  values(n) { return Array(n).fill().map(this.value.bind(this)); }

  int(min, max) {
    if (max === undefined) {
      [min, max] = [0, min]
    }
    return min + Math.floor(Math.random() * (max - min));
  }

  choice(choices) { return choices[this.int(choices.length)]; }

  arrayTypeFunction() { return this.choice([this.number, this.string, this.boolean]); }

  typeFunction() { return this.choice([this.number, this.string, this.boolean, this.array]); }

}

let g = new Generator();

// Get the type as far as we are concerned.
function type(value) {
  let t = typeof value;
  switch (t) {
    case 'number':
    case 'string':
    case 'boolean':
      return t;
    default:
      return Array.isArray(value) ? 'array' : 'unknown';
  }
}



