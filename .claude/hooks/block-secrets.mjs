#!/usr/bin/env node
// PreToolUse (Write|Edit) hook — Prodeklarant
// Maqsad: (1) Claude'ning .env fayllarini tahrirlashini to'xtatish (qo'lda tahrirlansin),
//         (2) manba kodga qattiq yozilgan secret (JWT_SECRET, DATABASE_URL, API kalit,
//             Telegram token, private key va h.k.) tushishini bloklash.
// Xulq: fail-open — skript o'zi xato bersa, hech narsani bloklamaydi (exit 0).

import { readFileSync } from "node:fs";

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

try {
  const raw = readFileSync(0, "utf8");
  const data = JSON.parse(raw || "{}");
  const ti = data.tool_input || {};
  const filePath = String(ti.file_path || "");
  const base = filePath.split(/[\\/]/).pop() || "";

  // (1) .env fayllar — Claude tahrirlamasin (example bundan mustasno)
  if (/^\.env(\.|$)/i.test(base) && base.toLowerCase() !== ".env.example") {
    deny(
      `.env fayllar (${base}) faqat qo'lda tahrirlanadi. CLAUDE.md: secretlar faqat .env'da, ` +
        `gitga tushmasligi shart. Agar env o'zgaruvchi kerak bo'lsa, foydalanuvchidan o'zi qo'shishini so'rang.`
    );
  }

  // Faqat matnli kontent bo'yicha secret-skan (Write.content / Edit.new_string)
  const content = [ti.content, ti.new_string].filter((s) => typeof s === "string").join("\n");
  if (!content) process.exit(0);

  const findings = [];

  // Private key bloki
  if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(content)) {
    findings.push("private key bloki (-----BEGIN ... PRIVATE KEY-----)");
  }
  // OpenAI-uslub kalit
  if (/\bsk-[A-Za-z0-9_-]{20,}\b/.test(content)) {
    findings.push("OpenAI-uslub API kalit (sk-...)");
  }
  // Telegram bot token
  if (/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/.test(content)) {
    findings.push("Telegram bot token");
  }
  // Maxfiy kalitga string literal biriktirish (process.env emas)
  const assign =
    /\b(JWT_SECRET|DATABASE_URL|DB_PASSWORD|DB_PASS|OPENAI_API_KEY|API_KEY|SECRET_KEY|ACCESS_TOKEN|REFRESH_TOKEN|SMTP_PASS(?:WORD)?|BOT_TOKEN|PRIVATE_KEY|PASSWORD)\s*[:=]\s*['"`]([^'"`]{6,})['"`]/i;
  const m = assign.exec(content);
  if (m) {
    const val = m[2];
    // Aniq placeholder/misollarni chetlab o'tamiz
    const placeholder = /^(your|xxx|placeholder|example|changeme|<.*>|\.\.\.|todo)/i.test(val);
    if (!placeholder) {
      findings.push(`qattiq yozilgan maxfiy qiymat: ${m[1]} = "..."  (process.env.${m[1]} ishlating)`);
    }
  }

  if (findings.length) {
    deny(
      `Manba kodga secret yozib bo'lmaydi (CLAUDE.md qoidasi). Topildi:\n- ` +
        findings.join("\n- ") +
        `\nKalitlarni .env'ga qo'ying va kodda process.env.XXX orqali o'qing.`
    );
  }

  process.exit(0);
} catch {
  // Fail-open: hook xatosi ish jarayonini bloklamasligi kerak
  process.exit(0);
}
