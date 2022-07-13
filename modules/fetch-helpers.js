const jsonIfOk = (r) => {
  if (r.ok) {
    return r.json();
  }
  throw r;
};

const textIfOk = (r) => {
  if (r.ok) {
    return r.text();
  }
  throw r;
};

export { jsonIfOk, textIfOk };
