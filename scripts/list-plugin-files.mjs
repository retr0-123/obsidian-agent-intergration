const files = [
  "manifest.json",
  "main.js",
  "helper.js",
  "styles.css",
  "node_modules/node-pty/package.json",
  "node_modules/node-pty/lib/*.js",
  "node_modules/node-pty/lib/shared/conout.js",
  "node_modules/node-pty/lib/worker/conoutSocketWorker.js",
  "node_modules/node-pty/prebuilds/win32-x64/",
  "node_modules/ws/package.json",
  "node_modules/ws/index.js",
  "node_modules/ws/lib/",
];

console.log(files.join("\n"));
