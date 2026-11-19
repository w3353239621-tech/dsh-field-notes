#!/usr/bin/env node
// 校验 cards/ 下每张卡的结构与可检索性 —— 卡片是工具流，格式漂了就没法 grep 了。
// 用法：node scripts/check-cards.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cardDir = join(root, "cards");
const CATEGORIES = ["工具", "脚本", "模型", "抓取", "文件", "网络", "游戏", "任务", "OCG策略缓存"];
const WARN_BYTES = 2048; // 写卡目标
const MAX_BYTES = 6144; // 硬上限，超了就是复盘不是卡了
// 公开仓库里不该出现的本机标识（<u> / <user> 这类占位符不算）
const LEAKS = [/[A-Z]:\\Users\\(?!<)/i, /OneDrive/i, /W3353/i, /SAOS-3624/i];

const files = readdirSync(cardDir).filter((f) => f.endsWith(".md")).sort();
const problems = [];
const warnings = [];

if (files.length === 0) problems.push("cards/ 下没有卡片");

for (const file of files) {
  const path = join(cardDir, file);
  const text = readFileSync(path, "utf8");
  const where = "cards/" + file;
  const bad = (msg) => problems.push(where + ": " + msg);

  if (!CATEGORIES.some((c) => file.startsWith(c + "-"))) bad("文件名不以已知分类开头");

  for (const field of ["触发", "锚点", "验证"]) {
    if (!text.includes("> **" + field + "**：")) bad("缺少「" + field + "」行");
  }

  // 锚点分隔符历史上用过 「、」「·」「 / 」（两侧带空格），都认；不带空格的 "/" 属于路径，不拆
  const anchorLine = text.split(/\r?\n/).find((l) => l.startsWith("> **锚点**：")) || "";
  const tokens = anchorLine
    .replace("> **锚点**：", "")
    .split(/\s+\/\s+|、|·/)
    .map((t) => t.trim().replace(/^`+|`+$/g, "").trim())
    .filter(Boolean);
  if (tokens.length < 3) bad("锚点少于 3 个（实际 " + tokens.length + " 个）");
  const ascii = tokens.filter((t) => /[A-Za-z0-9]/.test(t));
  if (ascii.length < 3) bad("能 grep 的锚点少于 3 个（纯中文锚点不算，实际 " + ascii.length + " 个）：" + tokens.join(" / "));

  if (!/^## 首选$/m.test(text)) bad("缺少「## 首选」段");

  const bytes = statSync(path).size;
  if (bytes > MAX_BYTES) bad("超过 " + MAX_BYTES + " 字节（" + bytes + "）");
  else if (bytes > WARN_BYTES) warnings.push(where + ": " + bytes + " 字节，超过 " + WARN_BYTES + " 的目标值");

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (LEAKS.some((re) => re.test(lines[i]))) {
      bad("第 " + (i + 1) + " 行含本机路径/账号，公开前要脱敏：" + lines[i].trim().slice(0, 80));
    }
  }
}

if (warnings.length) {
  console.warn("[cards] " + warnings.length + " 处偏长（不阻塞）：");
  for (const w of warnings) console.warn("  ~ " + w);
}
if (problems.length) {
  console.error("[cards] " + problems.length + " 处问题：");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("[cards] " + files.length + " 张卡全部通过：分类前缀、触发/锚点/验证 齐全、锚点非纯中文、无本机路径。");