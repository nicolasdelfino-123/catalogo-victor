const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const generatedDir = path.join(root, "src", "generated");

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const version = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  "-",
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds()),
  "-",
  String(now.getMilliseconds()).padStart(3, "0"),
].join("");

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

fs.writeFileSync(
  path.join(publicDir, "version.json"),
  `${JSON.stringify({ version }, null, 2)}\n`
);

fs.writeFileSync(
  path.join(generatedDir, "buildVersion.js"),
  `export const BUILD_VERSION = ${JSON.stringify(version)};\n`
);

console.log(`Build version: ${version}`);
