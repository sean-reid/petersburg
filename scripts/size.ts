import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const budget = 15 * 1024;
const dir = join("dist", "assets");
const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
let total = 0;
for (const f of files) {
  const gz = gzipSync(readFileSync(join(dir, f))).length;
  total += gz;
  console.log(`${f}\t${gz} B gzipped`);
}
console.log(`first-load JS: ${total} B gzipped, budget ${budget} B`);
if (total > budget) {
  console.error("over budget");
  process.exit(1);
}
