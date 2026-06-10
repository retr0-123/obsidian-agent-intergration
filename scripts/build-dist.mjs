import { cp, mkdir, rm } from "node:fs/promises";

const distDir = "dist/opencode-obsidian";
const nodePtyDir = `${distDir}/node_modules/node-pty`;

await rm("dist", { force: true, recursive: true });
await mkdir(`${nodePtyDir}/lib/shared`, { recursive: true });
await mkdir(`${nodePtyDir}/lib/worker`, { recursive: true });
await mkdir(`${nodePtyDir}/prebuilds/win32-x64/conpty`, { recursive: true });
await mkdir(`${distDir}/node_modules/ws`, { recursive: true });

await cp("manifest.json", `${distDir}/manifest.json`);
await cp("main.js", `${distDir}/main.js`);
await cp("helper.js", `${distDir}/helper.js`);
await cp("styles.css", `${distDir}/styles.css`);

await cp("node_modules/node-pty/package.json", `${nodePtyDir}/package.json`);
await cp("node_modules/node-pty/lib/conpty_console_list_agent.js", `${nodePtyDir}/lib/conpty_console_list_agent.js`);
await cp("node_modules/node-pty/lib/eventEmitter2.js", `${nodePtyDir}/lib/eventEmitter2.js`);
await cp("node_modules/node-pty/lib/index.js", `${nodePtyDir}/lib/index.js`);
await cp("node_modules/node-pty/lib/interfaces.js", `${nodePtyDir}/lib/interfaces.js`);
await cp("node_modules/node-pty/lib/terminal.js", `${nodePtyDir}/lib/terminal.js`);
await cp("node_modules/node-pty/lib/types.js", `${nodePtyDir}/lib/types.js`);
await cp("node_modules/node-pty/lib/unixTerminal.js", `${nodePtyDir}/lib/unixTerminal.js`);
await cp("node_modules/node-pty/lib/utils.js", `${nodePtyDir}/lib/utils.js`);
await cp("node_modules/node-pty/lib/windowsConoutConnection.js", `${nodePtyDir}/lib/windowsConoutConnection.js`);
await cp("node_modules/node-pty/lib/windowsPtyAgent.js", `${nodePtyDir}/lib/windowsPtyAgent.js`);
await cp("node_modules/node-pty/lib/windowsTerminal.js", `${nodePtyDir}/lib/windowsTerminal.js`);
await cp("node_modules/node-pty/lib/shared/conout.js", `${nodePtyDir}/lib/shared/conout.js`);
await cp("node_modules/node-pty/lib/worker/conoutSocketWorker.js", `${nodePtyDir}/lib/worker/conoutSocketWorker.js`);
await cp("node_modules/node-pty/prebuilds/win32-x64/conpty.node", `${nodePtyDir}/prebuilds/win32-x64/conpty.node`);
await cp("node_modules/node-pty/prebuilds/win32-x64/conpty_console_list.node", `${nodePtyDir}/prebuilds/win32-x64/conpty_console_list.node`);
await cp("node_modules/node-pty/prebuilds/win32-x64/pty.node", `${nodePtyDir}/prebuilds/win32-x64/pty.node`);
await cp("node_modules/node-pty/prebuilds/win32-x64/winpty-agent.exe", `${nodePtyDir}/prebuilds/win32-x64/winpty-agent.exe`);
await cp("node_modules/node-pty/prebuilds/win32-x64/winpty.dll", `${nodePtyDir}/prebuilds/win32-x64/winpty.dll`);
await cp("node_modules/node-pty/prebuilds/win32-x64/conpty/conpty.dll", `${nodePtyDir}/prebuilds/win32-x64/conpty/conpty.dll`);
await cp("node_modules/node-pty/prebuilds/win32-x64/conpty/OpenConsole.exe", `${nodePtyDir}/prebuilds/win32-x64/conpty/OpenConsole.exe`);
await cp("node_modules/ws/package.json", `${distDir}/node_modules/ws/package.json`);
await cp("node_modules/ws/index.js", `${distDir}/node_modules/ws/index.js`);
await cp("node_modules/ws/lib", `${distDir}/node_modules/ws/lib`, { recursive: true });

console.log(`Created ${distDir}`);
