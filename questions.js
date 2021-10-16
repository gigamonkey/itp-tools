import { Value, Blank, BinaryOp, PrefixOp } from "./expressions.js";
import { random as g } from "./random.js";

let all_types = ["number", "string", "boolean", "array"];

/*
 * Our definition of the type of different kinds of values. Mostly the
 * same as Javascript's except we call arrays arrays.
 */
function type(value) {
  let t = typeof value;
  switch (t) {
    case "number":
    case "string":
    case "boolean":
      return t;
    default:
      return Array.isArray(value) ? "array" : "unknown";
  }
}

/*
 * What operators can be applied to a value of the given type?
 *
 * The rest of code exists to include === and !== but they tend to be
 * uninteresting so I took them out. To add them as possibilities,
 * just add them to one or more lists below. Whatever you do, don't
 * add them to boolean as we definitely don't want to model testing
 * boolean values for equality/inequality.
 */
let operatorsForType = {
  number: ["+", "-", "*", "/", "%", "<", "<=", ">", ">="],
  string: ["+", "[]"],
  boolean: ["&&", "||", "!"],
  array: ["[]"],
};

function op(fn, factory) {
  return { fn: fn, factory: factory };
}

const ops = {
  "+": op((a, b) => a + b, sameType),
  "-": op((a, b) => a - b, numeric),
  "*": op((a, b) => a * b, numeric),
  "/": op((a, b) => a / b, divide),
  "%": op((a, b) => a % b, modulus),
  "<": op((a, b) => a < b, numeric),
  "<=": op((a, b) => a <= b, numeric),
  ">": op((a, b) => a > b, numeric),
  ">=": op((a, b) => a >= b, numeric),
  "===": op((a, b) => a === b, any),
  "!==": op((a, b) => a !== b, any),
  "[]": op((a, b) => a[b], index),
  "&&": op((a, b) => a && b, boolean),
  "||": op((a, b) => a || b, boolean),
  "!": op((a) => !a, prefix),
};

/*
 * Given a value to be put in the blank, generate a random expression
 * that works for that type. The various factory methods are
 * responsible for generating a random value of the correct type for
 * the other value (for binary ops) and for initializing the Op object
 * with the appropriate function to compute the result of evaluating
 * the expression and the list of ok types for possible answers.
 * (Which is not always the same as the type of the blank value since
 * some operators can be used with different types.)
 */
function forBlank(blankValue) {
  const operators = operatorsForType[type(blankValue)];
  const op = g.choice(operators);
  return ops[op].factory(op)(blankValue);
}

//////////////////////////////////////////////////////////////////////
// Helpers for factory methods

/*
 * Put the blank value in on side or another of a BinaryOp at random.
 */
function pickASide(blankValue, otherValue, op, okTypes) {
  if (Math.random() < 0.5) {
    return blankOnLeft(blankValue, otherValue, op, okTypes);
  } else {
    return blankOnRight(otherValue, blankValue, op, okTypes);
  }
}

function blankOnLeft(left, right, op, okTypes) {
  return new BinaryOp(new Blank(left), new Value(right), op, ops[op].fn, okTypes);
}

function blankOnRight(left, right, op, okTypes) {
  return new BinaryOp(new Value(left), new Blank(right), op, ops[op].fn, okTypes);
}

//////////////////////////////////////////////////////////////////////
// Actual factory methods.

function sameType(op) {
  return (blankValue) => {
    let blankType = type(blankValue);
    return pickASide(blankValue, g.valueOf(blankType), op, [blankType]);
  };
}

function numeric(op) {
  return (blankValue) => pickASide(blankValue, g.number(), op, ["number"]);
}

function divide(op) {
  return (blankValue) => {
    if (blankValue === 0) {
      return blankOnLeft(blankValue, g.nonZeroNumber(), op, ["number"]);
    } else if (blankValue == 1) {
      return blankOnLeft(blankValue, g.choice([2, 3, 4]), op, ["number"]);
    } else {
      let factors = Array(blankValue)
        .fill()
        .map((_, i) => i)
        .filter((i) => i > 1 && blankValue % i == 0);
      if (factors.length > 0) {
        return blankOnLeft(blankValue, g.choice(factors), op, ["number"]);
      } else {
        return blankOnRight(g.choice([2, 3]) * blankValue, blankValue, op, ["number"]);
      }
    }
  };
}

function modulus(op) {
  return (blankValue) => {
    if (blankValue < 2) {
      return blankOnLeft(blankValue, g.nonZeroNumber(), op, ["number"]);
    } else {
      return pickASide(blankValue, g.nonZeroNumber(), op, ["number"]);
    }
  };
}

function any(op) {
  return (blankValue) => pickASide(blankValue, g.value(), op, all_types);
}

function index(op) {
  return (blankValue) => {
    let t = type(blankValue);
    if (t === "string" || t === "array") {
      return blankOnLeft(blankValue, g.int(0, blankValue.length), op, ["string", "array"]);
    } else {
      // FIXME: move to generator and add possibility of getting array
      let s = "abcdefghijklmnopqrstuvwxyz".substring(0, Math.floor(blankValue * 1.5));
      return blankOnRight(s, blankValue, op, ["number"]);
    }
  };
}

function boolean(op) {
  return (blankValue) => pickASide(blankValue, g.boolean(), op, ["boolean"]);
}

function prefix(op) {
  return (blankValue) => new PrefixOp(new Blank(blankValue), op, ops[op].fn, ["boolean"]);
}

export { forBlank, type };
