#!/usr/bin/env node
/**
 * Freelancer scoped static-export build for the Freelancer Time & Invoice
 * Capacitor app (M1).
 *
 *   npm run build:freelancer
 *
 * Sets FREELANCER_EXPORT=1 (see next.config.ts: `output: 'export'` into
 * `out-freelancer/`, mutually exclusive with MOBILE_EXPORT), runs
 * `next build`, then post-processes ONLY `out-freelancer/`:
 *   - copies `out-freelancer/freelancer/index.html` to
 *     `out-freelancer/index.html` so the app opens on the freelancer
 *     dashboard (Capacitor loads webDir/index.html and the freelancer
 *     config has no start-path option).
 *   - PRUNES every non-app route from the output: Next.js static export
 *     emits every website route, but the shipped app bundle must contain
 *     only the app's routes (checklist X-3: no `/tools/*` pages, no tools
 *     dashboard entry point). Only `freelancer/`, the shared `_next/`
 *     assets, the PDF fonts, the footer logo, and the favicon survive.
 *     (Route JS chunks remain inside the shared `_next/` bundles; the
 *     route HTML pages — what the export listing checks — are gone.
 *     An app-specific shell that hides website navigation is M2.)
 *   - writes `out-freelancer/freelancer-build.json` (build manifest).
 *   - verifies the freelancer page + bundled fonts + PDF fonts exist,
 *     and that the freelancer Capacitor config carries the new identity
 *     only (`co.triangletech.freelancer`, never `co.triangletech.tools`).
 *
 * Production is untouched: plain `npm run build` never sets
 * FREELANCER_EXPORT. This script never edits source files.
 */
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "out-freelancer");

/** Top-level entries of out-freelancer/ that survive pruning. */
const KEEP = new Set(["freelancer", "_next", "fonts", "favicon.ico", "triangletech-logo.png", "index.html"]);

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env, shell: false });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const env = {
  ...process.env,
  FREELANCER_EXPORT: "1",
  // This VM's egress proxy needs the system CA bundle for next/font's
  // Google Fonts fetch (Turbopack TLS); harmless elsewhere.
  NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS: "1",
  NODE_OPTIONS: "--max-old-space-size=2048",
};

await run("npx", ["next", "build"], env);

// --- post-process: app entry point ---------------------------------------
const dashboard = join(OUT, "freelancer", "index.html");
if (!existsSync(dashboard)) throw new Error(`missing ${dashboard} — static export did not emit /freelancer`);
copyFileSync(dashboard, join(OUT, "index.html"));

// --- prune non-app routes (checklist X-3) ---------------------------------
const pruned = [];
for (const entry of readdirSync(OUT)) {
  if (KEEP.has(entry)) continue;
  rmSync(join(OUT, entry), { recursive: true, force: true });
  pruned.push(entry);
}

// --- verification ---------------------------------------------------------
if (existsSync(join(OUT, "tools"))) throw new Error("freelancer export still contains /tools pages after pruning");
const entryHtml = readFileSync(join(OUT, "index.html"), "utf8");
if (!entryHtml.includes("Freelancer Time")) throw new Error("freelancer entry page does not contain the app title");
const mediaDir = join(OUT, "_next", "static", "media");
const fonts = existsSync(mediaDir) ? readdirSync(mediaDir).filter((f) => f.endsWith(".woff2")) : [];
if (!fonts.length) throw new Error("freelancer export has no bundled .woff2 fonts in _next/static/media");
// PDF fonts (Liberation Sans, plan §10 R11): the invoice PDF fetches them
// from /fonts at runtime, so they must survive pruning.
for (const f of ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"]) {
  if (!existsSync(join(OUT, "fonts", f))) throw new Error(`freelancer export missing PDF font fonts/${f}`);
}
// Identity (checklist X-2): the freelancer config must name the new app
// only — never the Tools app's appId.
const freelancerConfig = readFileSync(join(ROOT, "capacitor.freelancer.config.ts"), "utf8");
if (!freelancerConfig.includes("co.triangletech.freelancer")) throw new Error("freelancer config is missing appId co.triangletech.freelancer");
if (freelancerConfig.includes("co.triangletech.tools") || freelancerConfig.includes("TriangleTech Tools")) {
  throw new Error("freelancer config references the Tools app identity");
}
if (!freelancerConfig.includes("Freelancer Time & Invoice")) throw new Error("freelancer config is missing the display name");

const manifest = {
  builtAt: new Date().toISOString(),
  appId: "co.triangletech.freelancer",
  appName: "Freelancer Time & Invoice",
  entry: "freelancer dashboard (out-freelancer/freelancer/index.html copied to out-freelancer/index.html)",
  routes: ["freelancer"],
  prunedTopLevelEntries: pruned.sort(),
  bundledFonts: fonts,
  pdfFonts: ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"],
};
writeFileSync(join(OUT, "freelancer-build.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nbuild:freelancer OK — entry = freelancer dashboard, ${fonts.length} bundled woff2 font(s), PDF fonts present, pruned ${pruned.length} non-app top-level entr(ies), identity = co.triangletech.freelancer.`);
