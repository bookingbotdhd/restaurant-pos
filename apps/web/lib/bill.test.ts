import assert from "node:assert/strict";
import { test } from "node:test";
import { discountSummary, parseMoney, planPayment, planSplitPayments } from "./bill.ts";

test("a blank entry pays the whole balance", () => {
  const p = planPayment({ remaining: 180, entered: null, method: "UPI" });
  assert.deepEqual(p, { valid: true, applied: 180, tendered: undefined, change: 0, balanceAfter: 0, partial: false, clamped: false });
});

test("cash above the balance becomes change", () => {
  const p = planPayment({ remaining: 180, entered: 200, method: "CASH" });
  assert.equal(p.applied, 180);
  assert.equal(p.tendered, 200);
  assert.equal(p.change, 20);
  assert.equal(p.partial, false);
});

test("a smaller amount is a part payment with the rest still due", () => {
  const p = planPayment({ remaining: 180, entered: 100, method: "CASH" });
  assert.equal(p.applied, 100);
  assert.equal(p.balanceAfter, 80);
  assert.equal(p.partial, true);
  assert.equal(p.change, 0);
});

test("card and UPI cannot be over-tendered: capped, and flagged", () => {
  const p = planPayment({ remaining: 100, entered: 150, method: "CARD" });
  assert.equal(p.applied, 100);
  assert.equal(p.change, 0);
  assert.equal(p.clamped, true);
});

test("zero, negative or junk is not recordable while money is owed", () => {
  for (const entered of [0, -5, Number.NaN]) {
    assert.equal(planPayment({ remaining: 100, entered, method: "CASH" }).valid, false);
  }
});

test("a bill already covered (points / gift card) needs no payment", () => {
  const p = planPayment({ remaining: 0, entered: null, method: "CASH" });
  assert.equal(p.valid, true);
  assert.equal(p.partial, false);
});

test("cents survive float arithmetic", () => {
  const p = planPayment({ remaining: 0.3, entered: 0.1, method: "CASH" });
  assert.equal(p.balanceAfter, 0.2);
});

test("split payment: cash + card covering the balance exactly", () => {
  const p = planSplitPayments({
    remaining: 500,
    lines: [
      { method: "CASH", entered: 200 },
      { method: "CARD", entered: 300 },
    ],
  });
  assert.equal(p.valid, true);
  assert.equal(p.partial, false);
  assert.equal(p.totalApplied, 500);
  assert.equal(p.balanceAfter, 0);
  assert.equal(p.change, 0);
  assert.deepEqual(
    p.payable.map((l) => [l.method, l.applied]),
    [
      ["CASH", 200],
      ["CARD", 300],
    ],
  );
});

test("split payment: a single blank line still pays the whole balance", () => {
  const p = planSplitPayments({
    remaining: 180,
    lines: [{ method: "UPI", entered: null }],
  });
  assert.equal(p.valid, true);
  assert.deepEqual(p.payable, [{ method: "UPI", applied: 180, tendered: undefined, change: 0 }]);
});

test("split payment: blank means the rest at that line, in order", () => {
  const p = planSplitPayments({
    remaining: 500,
    lines: [
      { method: "CARD", entered: 200 },
      { method: "CASH", entered: null },
    ],
  });
  assert.deepEqual(
    p.payable.map((l) => l.applied),
    [200, 300],
  );
  assert.equal(p.partial, false);
});

test("split payment: cash over-tender on the last line is change", () => {
  const p = planSplitPayments({
    remaining: 500,
    lines: [
      { method: "CARD", entered: 300 },
      { method: "CASH", entered: 250 },
    ],
  });
  assert.equal(p.payable[1].applied, 200);
  assert.equal(p.payable[1].tendered, 250);
  assert.equal(p.change, 50);
  assert.equal(p.partial, false);
});

test("split payment: a non-cash line above the running balance is clamped", () => {
  const p = planSplitPayments({
    remaining: 100,
    lines: [
      { method: "CARD", entered: 80 },
      { method: "UPI", entered: 50 },
    ],
  });
  assert.equal(p.payable[1].applied, 20);
  assert.equal(p.clamped, true);
  assert.equal(p.partial, false);
});

test("split payment: short of the balance is a part payment", () => {
  const p = planSplitPayments({
    remaining: 500,
    lines: [{ method: "CASH", entered: 200 }],
  });
  assert.equal(p.partial, true);
  assert.equal(p.balanceAfter, 300);
});

test("split payment: zero, negative or junk lines are not recordable", () => {
  for (const entered of [0, -5, Number.NaN]) {
    assert.equal(
      planSplitPayments({ remaining: 100, lines: [{ method: "CASH", entered }] }).valid,
      false,
    );
  }
});

test("split payment: a bill already covered needs no payment", () => {
  const p = planSplitPayments({
    remaining: 0,
    lines: [{ method: "CASH", entered: null }],
  });
  assert.equal(p.valid, true);
  assert.equal(p.partial, false);
  assert.deepEqual(p.payable, []);
});

test("discount shows percentage and amount together", () => {
  const f = (n: number) => `Rs ${n.toFixed(2)}`;
  assert.equal(discountSummary(10, 20, f), "10% (Rs 20.00)");
  assert.equal(discountSummary(12.5, 25, f), "12.50% (Rs 25.00)");
});

test("money input parsing", () => {
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("  "), null);
  assert.equal(parseMoney("12.345"), 12.35);
  assert.ok(Number.isNaN(parseMoney("abc")));
});
