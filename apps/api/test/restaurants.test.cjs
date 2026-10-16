require("reflect-metadata");
const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../dist/create-app");
let app, base;
before(async () => {
  app = await createApp();
  app.useLogger(false);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => app?.close());
test("API identifies sample data and exposes the restaurant catalog", async () => {
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  assert.equal(health.status, "ok");
  const response = await fetch(`${base}/api/restaurants`).then((r) => r.json());
  assert.equal(response.source, "sample");
  assert.equal(response.updatedAt, null);
  assert.equal(response.data.length, 6);
  assert.ok(
    response.data.every(
      (r) => r.coordinate.length === 2 && r.image && r.menu.length,
    ),
  );
});
test("Search normalizes Vietnamese text and validates discovery filters", async () => {
  const search = await fetch(`${base}/api/restaurants?q=co%20hanh`).then((r) =>
    r.json(),
  );
  assert.deepEqual(
    search.data.map((r) => r.id),
    ["bun"],
  );
  const drinks = await fetch(`${base}/api/restaurants?q=do%20uong`).then((r) =>
    r.json(),
  );
  assert.deepEqual(
    drinks.data.map((r) => r.id),
    ["cafe"],
  );
  const cheap = await fetch(
    `${base}/api/restaurants?maxPrice=25000&openOnly=true`,
  ).then((r) => r.json());
  assert.deepEqual(cheap.data.map((r) => r.id).sort(), ["banh", "chay"]);
  for (const query of [
    "maxPrice=-1",
    "maxPrice=abc",
    "openOnly=maybe",
    "openOnly=1",
    "unknown=value",
    "q=" + "x".repeat(101),
  ]) {
    const response = await fetch(`${base}/api/restaurants?${query}`);
    assert.equal(response.status, 400, query);
  }
});
test("Restaurant detail returns a shared envelope and missing IDs return 404", async () => {
  const detail = await fetch(`${base}/api/restaurants/com`).then((r) =>
    r.json(),
  );
  assert.equal(detail.data.id, "com");
  assert.equal(detail.source, "sample");
  assert.equal((await fetch(`${base}/api/restaurants/missing`)).status, 404);
});
test("Food groups include restaurants serving multiple types of dishes", async () => {
  const ids = async (params) => {
    const response = await fetch(`${base}/api/restaurants?${new URLSearchParams(params)}`).then(r => r.json());
    return response.data.map(r => r.id).sort();
  };
  assert.deepEqual(await ids({ q: "cơm" }), ["chay", "com"]);
  assert.deepEqual(await ids({ category: "Cơm" }), ["chay", "com"]);
  assert.deepEqual(await ids({ q: "com", category: "Cơm" }), ["chay", "com"]);
  assert.deepEqual(await ids({ category: "Ăn chay" }), ["chay"]);
  assert.deepEqual(await ids({ category: "Bún & phở" }), ["bun", "chay", "pho"]);
  assert.deepEqual(await ids({ category: "Cơm", maxPrice: "25000" }), ["chay"]);
});
test("Menu-based grouping works without secondary category metadata", async () => {
  const { restaurants } = require("../dist/restaurants/restaurant.fixtures");
  const { matchesFoodGroup } = require("@hust-foodmap/contracts/food-groups");
  const vegetarian = restaurants.find(r => r.id === "chay");
  const previous = vegetarian.categories;
  delete vegetarian.categories;
  try {
    const result = await fetch(`${base}/api/restaurants?${new URLSearchParams({ category: "Cơm" })}`).then(r => r.json());
    assert.deepEqual(result.data.map(r => r.id).sort(), ["chay", "com"]);
    assert.equal(matchesFoodGroup(vegetarian, "com"), true);
    assert.equal(matchesFoodGroup(vegetarian, "Bún & phở"), true);
    assert.equal(matchesFoodGroup({ category: "Đồ uống", menu: [{ name: "Combo trà" }] }, "Cơm"), false);
    assert.equal(matchesFoodGroup({ category: "Đồ uống", menu: [{ name: "Cốm" }] }, "Bún & phở"), false);
  } finally {
    vegetarian.categories = previous;
  }
});
