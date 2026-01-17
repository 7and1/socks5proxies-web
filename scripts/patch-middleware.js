const fs = require("fs");
const path = require("path");

const openNextDir = path.join(__dirname, "..", "apps", "web", ".open-next");

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // The exact pattern from minified code (with and without spaces around +)
  const originalPattern =
    /throw Error\('Dynamic require of "'\s*\+\s*x\s*\+\s*'" is not supported'\)/g;
  // Return proper middleware-manifest.json structure
  const patchedPattern = `if(x.includes("middleware-manifest.json"))return{version:3,middleware:{},functions:{},sortedMiddleware:[]};throw Error('Dynamic require of "'+x+'" is not supported')`;

  const matches = content.match(originalPattern);
  if (!matches) {
    console.log(`Pattern not found in: ${filePath}`);
    return;
  }

  content = content.replace(originalPattern, patchedPattern);
  fs.writeFileSync(filePath, content);
  console.log(`Patched: ${filePath} (${matches.length} occurrences)`);
}

// Patch all relevant files
patchFile(path.join(openNextDir, "server-functions", "default", "handler.mjs"));
patchFile(path.join(openNextDir, "server-functions", "default", "index.mjs"));
patchFile(path.join(openNextDir, "middleware", "handler.mjs"));
