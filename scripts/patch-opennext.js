const fs = require("fs");
const path = require("path");

const handlerPath = path.join(
  __dirname,
  "..",
  "apps",
  "web",
  ".open-next",
  "server-functions",
  "default",
  "handler.mjs",
);

const content = fs.readFileSync(handlerPath, "utf8");
const replacement =
  "getMiddlewareManifest(){return this.minimalMode?null:_loadmanifest.loadManifest(this.middlewareManifestPath,!0)}";

if (content.includes(replacement)) {
  process.exit(0);
}

const requirePattern =
  /require\\(([^\\)]*middlewareManifestPath[^\\)]*)\\)/g;

if (!requirePattern.test(content)) {
  process.exit(0);
}

const updated = content.replace(
  requirePattern,
  "_loadmanifest.loadManifest($1,!0)",
);
fs.writeFileSync(handlerPath, updated);
