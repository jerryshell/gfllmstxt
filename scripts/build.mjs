import fs from 'node:fs';
import path from 'node:path';
import posix from 'node:path/posix';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'sources.json'), 'utf8'));

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const siteInput = arg('site', process.env.GF_SITE_SOURCE || null);
const siteRoot = siteInput ? path.resolve(siteInput) : path.resolve(ROOT, manifest.sources.site.default);
if (!fs.existsSync(path.join(siteRoot, 'docs', 'docs'))) {
  console.error(`未找到文档源目录: ${siteRoot}`);
  console.error('使用 --site <gf-site 路径> 或环境变量 GF_SITE_SOURCE 指定。');
  process.exit(1);
}

for (const dir of ['docs', 'quick', 'ai', 'examples']) {
  fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2139}\u{2049}\u{203C}]/gu;
const FENCE = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm;
const IMAGE = /\.(png|jpe?g|gif|svg|webp|bmp)$/i;
const ADMONITIONS = new Map([
  ['tip', '提示'],
  ['note', '备注'],
  ['info', '说明'],
  ['warning', '注意'],
  ['danger', '警告'],
  ['caution', '注意'],
]);

function walkDir(dir, filter, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, filter, out);
    else if (filter(entry.name)) out.push(full);
  }
  return out;
}

function stripEmoji(value) {
  return value.replace(EMOJI, '').replace(/\uFE0F/g, '');
}

function cleanTitle(raw) {
  return stripEmoji(raw)
    .replace(/[（(]\s*重点\s*[)）]/g, '')
    .replace(/[（(]\s*[)）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    meta[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { meta, body: text.slice(match[0].length) };
}

function localPathFor(slug) {
  if (slug === '/docs' || slug === '/docs/') return 'docs/index.md';
  if (slug.startsWith('/docs/')) return 'docs/' + slug.slice(6) + '.md';
  if (slug === '/quick' || slug === '/quick/') return 'quick/index.md';
  if (slug.startsWith('/quick/')) return 'quick/' + slug.slice(7) + '.md';
  if (slug.startsWith('/ai/')) return 'ai/' + slug.slice(4) + '.md';
  if (slug === '/preface') return 'quick/preface.md';
  if (slug === '/quick-next') return 'quick/quick-next.md';
  return slug.replace(/^\//, '') + '.md';
}

function splitHash(target) {
  const i = target.indexOf('#');
  if (i === -1) return [target, ''];
  return [target.slice(0, i), target.slice(i)];
}

function relativeLink(fromLocal, toLocal) {
  let rel = posix.relative(posix.dirname(fromLocal), toLocal);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function proseSegments(text) {
  const segments = [];
  let buffer = [];
  let fence = null;
  const flush = () => {
    if (buffer.length) {
      segments.push({ code: false, lines: buffer });
      buffer = [];
    }
  };
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (!fence && marker) {
      flush();
      fence = marker[1];
      segments.push({ code: true, lines: [line] });
      continue;
    }
    if (fence) {
      segments[segments.length - 1].lines.push(line);
      if (line.trim().startsWith(fence) && line.trim().length >= fence.length) fence = null;
      continue;
    }
    buffer.push(line);
  }
  flush();
  return segments;
}

function transformProse(text, fn, protectInline = false) {
  return proseSegments(text)
    .map((segment) => {
      const content = segment.lines.join('\n');
      if (segment.code) return content;
      if (!protectInline) return fn(content);
      return content
        .split(/(`[^`\n]*`)/g)
        .map((piece) => (piece.startsWith('`') ? piece : fn(piece)))
        .join('');
    })
    .join('\n');
}

const PRONOUN_RULES = [
  [/(您|你)们/g, ''],
  [/为(您|你)提供/g, '提供'],
  [/为(您|你)考虑/g, '考虑'],
  [/为(您|你)准备/g, '准备'],
  [/为(您|你)注册/g, '注册'],
  [/为(您|你)/g, ''],
  [/在(您|你)的/g, '在'],
  [/根据(您|你)的/g, '根据'],
  [/帮助(您|你)/g, '帮助'],
  [/告诉(您|你)/g, '说明'],
  [/恭喜(您|你)/g, '完成'],
  [/等待着(您|你)的进一步/g, '等待进一步'],
  [/(您|你)/g, ''],
];

function normalizeProse(text) {
  let value = text;
  for (const [pattern, replacement] of PRONOUN_RULES) value = value.replace(pattern, replacement);
  return value
    .replace(/[“”]/g, (m) => (m === '“' ? '「' : '」'))
    .replace(/——/g, '：')
    .replace(/(?<!-)—(?!-)/g, '，')
    .replace(/！+/g, '。')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([，。；：、！？])/g, '$1')
    .replace(/。{2,}/g, '。');
}

const pages = [];
const bySlug = new Map();
const byRel = new Map();

for (const relRoot of manifest.sources.site.roots) {
  const absRoot = path.join(siteRoot, relRoot);
  const prefix = relRoot === 'docs/docs' ? 'docs' : relRoot === 'docs/examples' ? 'examples' : relRoot === 'docs/quick' ? 'quick' : 'ai';
  for (const file of walkDir(absRoot, (name) => name.endsWith('.md'))) {
    const srcRel = posix.join(prefix, path.relative(absRoot, file).split(path.sep).join('/'));
    const { meta, body } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    const slug = (meta.slug || '').trim();
    const page = {
      file,
      srcRel,
      slug,
      title: cleanTitle(meta.title || path.basename(file, '.md')),
      local: localPathFor(slug || '/' + srcRel.replace(/\.md$/, '')),
      position: Number.parseInt(meta.sidebar_position ?? '', 10),
      srcDirRel: posix.dirname(srcRel),
      body,
    };
    if ((manifest.exclude || []).includes(srcRel)) continue;
    pages.push(page);
    bySlug.set(slug, page);
    byRel.set(srcRel, page);
  }
}

for (const rewrite of manifest.rewrites || []) {
  for (const page of pages) {
    if (rewrite.slug && page.slug !== rewrite.slug) continue;
    if (page.body.includes(rewrite.from)) page.body = page.body.replaceAll(rewrite.from, rewrite.to);
  }
}

function resolveLink(raw, page) {
  if (!raw) return raw;
  const [pathPart, hash] = splitHash(raw);
  if (!pathPart) return raw;
  if (/^(https?:|mailto:|tel:|ftp:)/i.test(pathPart)) return raw;
  if (pathPart.startsWith('/markdown/') || IMAGE.test(pathPart)) return null;
  let decoded = pathPart;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {}
  let target = null;
  if (decoded.startsWith('/')) {
    const clean = decoded.replace(/\/+$/, '');
    target = bySlug.get(clean) || bySlug.get(clean.replace(/\.md$/, '')) || null;
    if (!target && decoded.endsWith('.md')) target = byRel.get(decoded.slice(1)) || null;
    if (!target) return 'https://goframe.org' + raw;
  } else {
    const resolved = posix.normalize(posix.join(page.srcDirRel, decoded));
    target = byRel.get(resolved) || null;
    if (!target) return raw;
  }
  return relativeLink(page.local, target.local) + hash;
}

function removeEmptyNavHeadings(text) {
  const lines = text.split('\n');
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{2,6}\s*(相关文档|文档列表)\s*$/.test(lines[i])) {
      let next = i + 1;
      while (next < lines.length && lines[next].trim() === '') next++;
      if (next >= lines.length || /^#{1,6} /.test(lines[next])) continue;
    }
    kept.push(lines[i]);
  }
  return kept.join('\n');
}

function cleanBody(page) {
  let body = page.body.replace(/\r\n/g, '\n');

  body = body.replace(/^import .*from '@theme[^']*';?\s*$/gm, '');
  body = body.replace(/^\s*<DocCardList\s*\/>\s*$/gm, '');
  body = body.replace(/^[ \t]*<Tabs\b[^>]*>\s*$/gm, '');
  body = body.replace(/^[ \t]*<\/Tabs>\s*$/gm, '');
  body = body.replace(/^[ \t]*<TabItem\b([^>]*)>\s*\n([\s\S]*?)^[ \t]*<\/TabItem>\s*$/gm, (match, attrs, inner) => {
    const label = (attrs.match(/label="([^"]*)"/) || [])[1] || '';
    const dedented = inner.replace(/^ {1,4}/gm, '').trimEnd();
    return (label ? `**${label}**\n\n` : '') + dedented + '\n';
  });
  body = body.replace(/^[ \t]*<TabItem\b[^>]*>\s*$/gm, '');
  body = body.replace(/^[ \t]*<\/TabItem>\s*$/gm, '');

  body = transformProse(body, (part) =>
    part
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/^\s*\[[^\]]*\]\([^)]*\.(png|jpe?g|gif|svg|webp|bmp)\)\s*$/gim, '')
      .replace(/^[ \t]*:::[ \t]*(\w+)[ \t]*(.*)$/gm, (match, kind, label) => {
        const name = ADMONITIONS.get(kind.toLowerCase());
        if (!name) return match;
        const text = label.trim();
        return '\n' + (text && text !== name ? `**${name}**：${text}` : `**${name}**`) + '\n';
      })
      .replace(/^[ \t]*:::[ \t]*$/gm, '')
      .replace(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (match, target) => {
        const resolved = resolveLink(target, page);
        return resolved === null ? match : '](' + resolved + ')';
      })
      .replace(/\[([^\]]*)\]\([^)]*\.(png|jpe?g|gif|svg|webp|bmp)\)/gim, '$1'),
  );

  body = stripEmoji(body);
  body = transformProse(body, normalizeProse, true);
  body = body.replace(/^#{1,6}[ \t]*$/gm, '');
  body = body.replace(/^#{1,6}[ 	]*$/gm, '');

  body = body
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  body = body.replace(/^\s*#\s+[^\n]*\n+/, '');

  return removeEmptyNavHeadings(body).replace(/\n{3,}/g, '\n\n').trim();
}

for (const page of pages) {
  page.clean = cleanBody(page);
  page.hubOnly = page.clean.length < 40 || /^## 文档列表\s*$/m.test(page.clean);
}

const tree = { dirs: new Map(), files: [] };
for (const page of pages) {
  let node = tree;
  for (const part of page.srcDirRel.split('/')) {
    if (!node.dirs.has(part)) node.dirs.set(part, { name: part, dirs: new Map(), files: [] });
    node = node.dirs.get(part);
  }
  node.files.push(page);
}

const hubOf = (node) => node.files.find((p) => p.file.endsWith(path.sep + node.name + '.md'));

function collectNode(dirRel) {
  let node = tree;
  for (const part of dirRel.split('/')) {
    if (part === '.') continue;
    node = node && node.dirs.get(part);
  }
  return node;
}

function parentTitle(dirRel) {
  const parent = posix.dirname(dirRel);
  if (parent === '.') return '';
  const node = collectNode(parent);
  const hub = node && hubOf(node);
  return hub ? hub.title : posix.basename(parent);
}

function shortenTitle(title, parent) {
  return parent && title.startsWith(parent + '-') ? title.slice(parent.length + 1) : title;
}

function dirTitle(dirRel, fallback) {
  if (manifest.dirTitles && manifest.dirTitles[dirRel]) return manifest.dirTitles[dirRel];
  const node = collectNode(dirRel);
  const hub = node && hubOf(node);
  return hub ? shortenTitle(hub.title, parentTitle(dirRel)) : fallback;
}

function orderedFiles(node) {
  const hub = hubOf(node);
  return [...node.files].sort((a, b) => {
    if (a === hub) return -1;
    if (b === hub) return 1;
    const pa = Number.isFinite(a.position) ? a.position : 100;
    const pb = Number.isFinite(b.position) ? b.position : 100;
    return pa - pb || a.title.localeCompare(b.title, 'zh-Hans');
  });
}

function orderedDirs(node, dirRel) {
  return [...node.dirs.entries()].sort((a, b) => {
    const ha = hubOf(a[1]);
    const hb = hubOf(b[1]);
    const pa = ha && Number.isFinite(ha.position) ? ha.position : 100;
    const pb = hb && Number.isFinite(hb.position) ? hb.position : 100;
    return pa - pb || a[0].localeCompare(b[0], 'zh-Hans');
  });
}

function allPages(node, out = []) {
  for (const page of orderedFiles(node)) if (!page.hubOnly) out.push(page);
  for (const [, child] of orderedDirs(node)) allPages(child, out);
  return out;
}

const indexOrder = [];

function groupBody(dirRel, childHeadingLevel) {
  const node = collectNode(dirRel);
  if (!node) return [];
  const lines = [];
  for (const page of orderedFiles(node)) {
    if (page.hubOnly) continue;
    indexOrder.push(page);
    lines.push(`- [${page.title}](${page.local})`);
  }
  for (const [name, child] of orderedDirs(node, dirRel)) {
    const childRel = posix.join(dirRel, name);
    const title = dirTitle(childRel, name);
    if (child.dirs.size === 0 && child.files.length === 1 && !child.files[0].hubOnly) {
      indexOrder.push(child.files[0]);
      lines.push(`- [${child.files[0].title}](${child.files[0].local})`);
      continue;
    }
    if (childHeadingLevel <= 4) {
      const sub = groupBody(childRel, childHeadingLevel + 1);
      if (sub.length === 0) continue;
      if (lines.length) lines.push('');
      lines.push('#'.repeat(childHeadingLevel) + ' ' + title, '', ...sub);
    } else {
      for (const page of allPages(child)) {
        indexOrder.push(page);
        lines.push(`- [${page.title}](${page.local})`);
      }
    }
  }
  return lines;
}

const llms = [];
llms.push('# GoFrame');
llms.push('');
llms.push('> GoFrame 是 Go 语言的模块化应用开发框架。本文件是自包含文档集的入口，文档链接指向本项目内的 Markdown 文件。版本与运行要求见[框架概览](guide/overview.md)。');
llms.push('');
llms.push('GoFrame 既可以作为完整项目框架使用，也可以按需引入独立组件。核心模块位于 `github.com/gogf/gf/v2`，数据库驱动、注册中心、Redis 适配器等扩展位于 `contrib` 子模块，按需单独引入。本文件只做导航，事实性内容以链接页面为准。需要单文件版本时读取 `llms-full.txt`。');
llms.push('');
llms.push('## 从这里开始');
llms.push('');
for (const [title, link] of [
  ['框架概览', 'guide/overview.md'],
  ['源码结构', 'guide/source-map.md'],
  ['AI 开发约定', 'guide/ai-conventions.md'],
]) {
  llms.push(`- [${title}](${link})`);
}
llms.push('');
llms.push('推荐阅读顺序：框架概览，快速开始，核心组件，WEB 服务开发，数据库 ORM，组件列表。需要生成代码时先读 AI 开发约定。');
llms.push('');

for (const section of manifest.sections) {
  const body = [];
  if (section.files) {
    for (const rel of section.files) {
      const page = byRel.get(rel);
      if (!page) continue;
      indexOrder.push(page);
      body.push(`- [${page.title}](${page.local})`);
    }
  } else {
    const node = collectNode(section.root);
    if (!node) continue;
    for (const page of orderedFiles(node)) {
      if (page.hubOnly) continue;
      indexOrder.push(page);
      body.push(`- [${page.title}](${page.local})`);
    }
    for (const [name] of orderedDirs(node, section.root)) {
      const childRel = posix.join(section.root, name);
      if ((section.flatten || []).includes(childRel)) {
        const child = collectNode(childRel);
        for (const page of orderedFiles(child)) {
          if (page.hubOnly) continue;
          indexOrder.push(page);
          body.push(`- [${page.title}](${page.local})`);
        }
        for (const [sub] of orderedDirs(child, childRel)) {
          const subRel = posix.join(childRel, sub);
          const subBody = groupBody(subRel, 4);
          if (subBody.length === 0) continue;
          if (body.length) body.push('');
          body.push('### ' + dirTitle(subRel, sub), '', ...subBody);
        }
        continue;
      }
      const group = groupBody(childRel, 4);
      if (group.length === 0) continue;
      if (body.length) body.push('');
      body.push('### ' + dirTitle(childRel, name), '', ...group);
    }
  }
  if (body.length === 0) continue;
  llms.push('## ' + section.title);
  llms.push('');
  llms.push(...body);
  llms.push('');
}

llms.push('## 外部资源');
llms.push('');
for (const [title, url] of [
  ['官方网站', 'https://goframe.org'],
  ['英文站点', 'https://goframe.org/en'],
  ['源码仓库', 'https://github.com/gogf/gf'],
  ['Go 包文档', 'https://pkg.go.dev/github.com/gogf/gf/v2'],
  ['GoFrame Skills 仓库', 'https://github.com/gogf/skills'],
  ['文档源码仓库', 'https://github.com/gogf/gf-site'],
]) {
  llms.push(`- [${title}](${url})`);
}
llms.push('');
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms.join('\n'));

function hubChildren(page) {
  const node = collectNode(page.srcDirRel);
  if (!node) return [];
  const children = orderedFiles(node).filter((child) => child !== page);
  for (const [, child] of orderedDirs(node, page.srcDirRel)) {
    const hub = hubOf(child);
    if (hub) children.push(hub);
  }
  return children;
}

const full = [];
const orderedPaths = [];
for (const guide of ['guide/overview.md', 'guide/source-map.md', 'guide/ai-conventions.md']) {
  const abs = path.join(ROOT, guide);
  if (!fs.existsSync(abs)) continue;
  full.push(fs.readFileSync(abs, 'utf8').trim());
  orderedPaths.push(guide);
}
for (const page of pages) {
  let body = page.clean;
  const isDirHub = posix.basename(page.srcRel, '.md') === posix.basename(page.srcDirRel);
  if ((page.hubOnly && body.length < 10) || isDirHub) {
    const children = hubChildren(page);
    if (children.length) {
      const lead = body.length < 10 ? '本页为目录页，子页面如下：' : '子页面：';
      body += '\n\n' + lead + '\n\n' + children.map((child) => `- [${child.title}](${relativeLink(page.local, child.local)})`).join('\n');
    }
  }
  fs.mkdirSync(path.join(ROOT, posix.dirname(page.local)), { recursive: true });
  const content = `# ${page.title}\n\n${body}`.trim().replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(ROOT, page.local), content + '\n');
  orderedPaths.push(page.local);
}

for (const page of indexOrder) {
  full.push(`# ${page.title}\n\n${page.clean}`.trim().replace(/\n{3,}/g, '\n\n'));
}

fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), full.join('\n\n') + '\n');

for (const asset of manifest.assets || []) {
  const from = path.join(siteRoot, asset.from);
  const to = path.join(ROOT, asset.to);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

const broken = [];
for (const rel of orderedPaths) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  const prose = proseSegments(text)
    .filter((segment) => !segment.code)
    .map((segment) => segment.lines.join('\n'))
    .join('\n');
  for (const match of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
    const [target] = splitHash(match[1]);
    if (!target || /^(https?:|mailto:|tel:|ftp:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(abs), target);
    if (!fs.existsSync(resolved)) broken.push(rel + ' -> ' + match[1]);
  }
}

const emojiLeft = pages.filter((p) => EMOJI.test(p.clean)).map((p) => p.local);
const pronounLeft = orderedPaths.filter((rel) => /[您你]/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));

console.log(
  JSON.stringify(
    {
      pages: pages.length,
      indexedPages: indexOrder.length,
      hubPages: pages.filter((p) => p.hubOnly).length,
      llmsBytes: fs.statSync(path.join(ROOT, 'llms.txt')).size,
      llmsLines: fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split('\n').length,
      fullBytes: fs.statSync(path.join(ROOT, 'llms-full.txt')).size,
      filesWithEmoji: emojiLeft.length,
      filesWithPronoun: pronounLeft.length,
      brokenLocalLinks: broken.length,
    },
    null,
    2,
  ),
);
if (broken.length) console.log(broken.slice(0, 20).join('\n'));
