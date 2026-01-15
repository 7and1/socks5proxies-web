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
const needle =
  "getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}";
const replacement =
  "getMiddlewareManifest(){return this.minimalMode?null:_loadmanifest.loadManifest(this.middlewareManifestPath,!0)}";

if (!content.includes(needle)) {
  throw new Error(
    "OpenNext patch failed: getMiddlewareManifest() pattern not found in handler.mjs",
  );
}

const updated = content.replace(needle, replacement);
fs.writeFileSync(handlerPath, updated);
