const setupProxy = require("./setupProxy");

test("local development forwards every /api request (also one opened as a page, like a teacher's PDF) to the backend", () => {
  const used = [];
  setupProxy({ use: (mw) => used.push(mw) });
  expect(used).toHaveLength(1);
  expect(typeof used[0]).toBe("function");
});
