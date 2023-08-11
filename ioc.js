const container = {};

function register(key, factory) {
  container[key] = factory;
}

function resolve(key) {
  if (!container[key]) {
    throw new Error(`Service not found: ${key}`);
  }

  if (typeof container[key] === "function") {
    container[key] = container[key]();
  }

  return container[key];
}

module.exports = {
  register,
  resolve,
};
