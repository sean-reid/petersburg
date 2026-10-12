import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const budget = 15 * 1024;
const index = join("dist", "index.html");
if (!existsSync(index)) {
  console.error("dist/index.html is missing: run npm run build first");
  process.exit(1);
}
const html = readFileSync(index, "utf8");
const files = [
  ...html.matchAll(
    /<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="\/petersburg\/([^"]+\.js)"/g,
  ),
].map((m) => m[1]!);
let total = 0;
for (const f of files) {
  const gz = gzipSync(readFileSync(join("dist", f))).length;
  total += gz;
  console.log(`${f}\t${gz} B gzipped`);
}
console.log(`first-load JS: ${total} B gzipped, budget ${budget} B`);
if (total > budget) {
  console.error("over budget");
  process.exit(1);
}
