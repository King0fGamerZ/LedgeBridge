const fs = require("fs");
const path = require("path");
const {
  convertStripeToQbo,
  toCsv,
  parseCsv,
} = require("../web/converter.js");

const samplePath = path.join(__dirname, "../samples/stripe-balance-sample.csv");
const expectedPath = path.join(__dirname, "../samples/expected-qbo-output.csv");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const csv = fs.readFileSync(samplePath, "utf-8");
const result = convertStripeToQbo(csv, {
  splitFees: true,
  useNetOnly: false,
  dateFormat: "mdy",
});

assert(result.rows.length === 5, `Expected 5 rows, got ${result.rows.length}`);
assert(result.rows[0].date === "04/15/2026", "Date format MDY");
assert(result.rows[1].amount === "-14.80", "Fee line negative");

const outCsv = toCsv(result.rows);
const expected = fs.readFileSync(expectedPath, "utf-8").trim();
const normalizedOut = outCsv.trim();

assert(
  normalizedOut === expected,
  "Output CSV mismatch:\n" + normalizedOut + "\n---\n" + expected
);

console.log("All converter tests passed.");
