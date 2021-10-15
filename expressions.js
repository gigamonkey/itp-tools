import { $, clear, withClass } from "./whjqah.js";

/*
 * Expressions possibly containing a blanked out value.
 */
class Expression {
  /*
   * Evaluate the expression producing an actual Javascript value.
   */
  evaluate() {
    throw Error("Abstract method not implemented.");
  }

  /*
   * Render the expression as HTML into the given parent element.
   */
  render(parent) {
    throw Error("Abstract method not implemented.");
  }

  /*
   * Return a new Expression that is the same is this but with any blank
   * filled in with the given value.
   */
  fillBlank(value) {
    throw Error("Abstract method not implemented.");
  }

  /*
   * Return the blanked out value, if any, in this expression. Otherwise undefined.
   */
  blankValue() {
    throw Error("Abstract method not implemented.");
  }

  /*
   * Return the unblanked value, if any, in this expression. Otherwise undefined.
   */
  nonBlankValue() {
    throw Error("Abstract method not implemented.");
  }
}

/*
 * An actual, unblanked out value.
 */
class Value extends Expression {
  constructor(value) {
    super();
    this.value = value;
  }
  evaluate() {
    return this.value;
  }
  render(parent) {
    parent.append($(JSON.stringify(this.value)));
  }

  fillBlank(value) {
    return this;
  }

  blankValue() {
    return undefined;
  }

  nonBlankValue() {
    return this.value;
  }
}

/*
 * A blank spot in an expression that needs to be filled in though it does
 * have a particular value associated with it.
 */
class Blank extends Value {
  render(parent) {
    parent.append(withClass("hole", $("<span>", "?")));
  }
  fillBlank(value) {
    return new Value(value);
  }
  blankValue() {
    return this.value;
  }

  nonBlankValue() {
    return undefined;
  }
}

class BinaryOp extends Expression {
  constructor(left, right, op, fn) {
    super();
    this.left = left;
    this.right = right;
    this.op = op;
    this.fn = fn;
  }
  evaluate() {
    return this.fn(this.left.evaluate(), this.right.evaluate());
  }
  render(parent) {
    this.left.render(parent);
    if (this.op === "[]") {
      parent.append($("["));
      this.right.render(parent);
      parent.append($("]"));
    } else {
      parent.append($(" " + this.op + " "));
      this.right.render(parent);
    }
  }

  /*
   * Produce a BinaryOp with the blank value filled in with the given value.
   */
  fillBlank(value) {
    return new BinaryOp(
      this.left.fillBlank(value),
      this.right.fillBlank(value),
      this.op,
      this.fn
    );
  }

  blankValue() {
    return this.left.blankValue() ?? this.right.blankValue();
  }

  nonBlankValue() {
    return this.left.nonBlankValue() ?? this.right.nonBlankValue();
  }
}

class PrefixOp extends Expression {
  constructor(operand, op, fn) {
    super();
    this.operand = operand;
    this.op = op;
    this.fn = fn;
  }

  evaluate() {
    return this.fn(this.operand.evaluate());
  }

  render(parent) {
    parent.append($(this.op));
    this.operand.render(parent);
  }

  fillBlank(value) {
    return new PrefixOp(this.operand.fillBlank(value), this.op, this.fn);
  }

  blankValue() {
    return this.operand.blankValue();
  }

  nonBlankValue() {
    return undefined;
  }
}

export { Value, Blank, BinaryOp, PrefixOp };
