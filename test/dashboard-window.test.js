import assert from "node:assert/strict";
import test from "node:test";

import { dashboardWindow, isInsideWindow } from "../src/dashboard-window.js";

test("day window covers exactly one local calendar day", () => {
  const window = dashboardWindow("day", new Date(2026, 10, 4, 15, 30));

  assert.equal(window.start.getHours(), 0);
  assert.equal(window.start.getDate(), 4);
  assert.equal(window.end.getDate(), 5);
  assert.equal(isInsideWindow(new Date(2026, 10, 4, 23, 59), window), true);
  assert.equal(isInsideWindow(window.end, window), false);
});

test("week window starts on Monday and spans seven days", () => {
  const window = dashboardWindow("week", new Date(2026, 10, 4, 15, 30));

  assert.equal(window.start.getDay(), 1);
  assert.equal(window.start.getDate(), 2);
  assert.equal(window.end.getDate(), 9);
});

test("month window uses the first day of adjacent months", () => {
  const window = dashboardWindow("month", new Date(2026, 10, 20, 8, 0));

  assert.equal(window.start.getDate(), 1);
  assert.equal(window.start.getMonth(), 10);
  assert.equal(window.end.getDate(), 1);
  assert.equal(window.end.getMonth(), 11);
});
