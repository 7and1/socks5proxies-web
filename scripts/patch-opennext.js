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

const requirePattern = /require\\(this\\.middlewareManifestPath\\)/g;

if (!requirePattern.test(content)) {
  throw new Error(
    "OpenNext patch failed: require(this.middlewareManifestPath) not found in handler.mjs",
  );
}

const updated = content.replace(requirePattern, "_loadmanifest.loadManifest(this.middlewareManifestPath,!0)");
fs.writeFileSync(handlerPath, updated);
