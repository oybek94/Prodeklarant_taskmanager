#!/usr/bin/env node
// PostToolUse (Write|Edit) hook — Prodeklarant
// Maqsad: .ts/.tsx fayl o'zgarganda tegishli workspace'da (backend yoki frontend)
//         `tsc --noEmit` ishga tushirib, TypeScript xatolarini ushlash.
// Xulq: asyncRewake — fon rejimida ishlaydi, tahrirlashni sekinlashtirmaydi.
//        Xato topilsa exit(2) bilan model uyg'otiladi; toza bo'lsa jimgina exit(0).
//        Lock fayli bir vaqtda bitta tsc ishlashini kafolatlaydi (ortiqcha yuklama yo'q).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function exit(code, msg) {
  if (msg) process.stdout.write(msg);
  process.exit(code);
}

try {
  const raw = readFileSync(0, "utf8");
  const data = JSON.parse(raw || "{}");
  const ti = data.tool_input || {};
  const tr = data.tool_response || {};
  const filePath = String(ti.file_path || tr.filePath || "");
  if (!/\.tsx?$/.test(filePath)) exit(0);

  const norm = filePath.replace(/\\/g, "/");
  let ws;
  if (/\/backend\//.test(norm)) ws = "backend";
  else if (/\/frontend\//.test(norm)) ws = "frontend";
  else exit(0); // boshqa joydagi .ts (masalan skriptlar) — o'tkazib yuboramiz

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const cwd = join(root, ws);

  // Lock: shu workspace uchun tsc allaqachon ketayotgan bo'lsa — o'tkazib yuboramiz
  const lock = join(tmpdir(), `pdklrnt-tsc-${ws}.lock`);
  if (existsSync(lock)) {
    const ageMs = Date.now() - statSync(lock).mtimeMs;
    if (ageMs < 5 * 60 * 1000) exit(0); // yangi lock — boshqa run ketyapti
  }
  writeFileSync(lock, String(process.pid));

  // Frontend project references ishlatadi (tsc -b), backend oddiy -p
  const args =
    ws === "frontend"
      ? ["tsc", "-b", "--noEmit"]
      : ["tsc", "--noEmit", "-p", "tsconfig.json"];

  let res;
  try {
    res = spawnSync("npx", args, {
      cwd,
      encoding: "utf8",
      shell: true,
      timeout: 110 * 1000,
    });
  } finally {
    try {
      rmSync(lock, { force: true });
    } catch {}
  }

  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.status === 0) exit(0);

  // Xatolarni qisqartirib modelga qaytaramiz
  const lines = out.split(/\r?\n/).filter(Boolean);
  const shown = lines.slice(0, 40).join("\n");
  const more = lines.length > 40 ? `\n... (yana ${lines.length - 40} qator)` : "";
  exit(
    2,
    `Workspace: ${ws} — oxirgi tahrirdan keyin \`tsc --noEmit\` xato berdi:\n${shown}${more}`
  );
} catch {
  // Fail-open
  process.exit(0);
}
