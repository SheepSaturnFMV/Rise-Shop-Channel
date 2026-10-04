import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const appsDir = path.join(root, "repo", "apps");
const indexPath = path.join(root, "repo", "index.json");
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const installPathPattern = /^apps\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^$|^[a-fA-F0-9]{64}$/;
const categories = new Set([
  "games",
  "emulators",
  "ports",
  "utilities",
  "media",
  "launchers",
  "other"
]);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function getField(app, field) {
  return field.split(".").reduce((current, key) => current?.[key], app);
}

function requireString(app, file, field) {
  const value = getField(app, field);

  if (typeof value !== "string" || value.trim() === "") {
    fail(file, `${field} is required`);
  }

  return value;
}

function optionalString(app, file, field) {
  const value = getField(app, field);

  if (value !== undefined && typeof value !== "string") {
    fail(file, `${field} must be a string`);
  }

  return value;
}

function validateApp(app, file) {
  const id = requireString(app, file, "id");
  const name = requireString(app, file, "name");

  if (!idPattern.test(id)) {
    fail(file, "id must use lowercase letters, numbers, and hyphens");
  }

  if (!file.startsWith("_") && file !== `${id}.json`) {
    fail(file, `filename must be ${id}.json`);
  }

  requireString(app, file, "author");
  requireString(app, file, "version");
  requireString(app, file, "description");
  requireString(app, file, "license");

  if (!categories.has(app.category)) {
    fail(file, `category must be one of: ${[...categories].join(", ")}`);
  }

  if (typeof app.requires_original_files !== "boolean") {
    fail(file, "requires_original_files must be true or false");
  }

  if (app.requires_original_files) {
    requireString(app, file, "original_files_note");
  } else {
    optionalString(app, file, "original_files_note");
  }

  const downloadUrl = requireString(app, file, "download.url");

  if (!downloadUrl.startsWith("https://")) {
    fail(file, "download.url must be an HTTPS URL");
  }

  if (app.download.type !== "zip") {
    fail(file, "download.type must be zip");
  }

  const installPath = requireString(app, file, "download.install_path");

  if (!installPathPattern.test(installPath)) {
    fail(file, "download.install_path must look like apps/app-id");
  }

  if (installPath !== `apps/${id}`) {
    fail(file, `download.install_path should be apps/${id}`);
  }

  const sha256 = optionalString(app, file, "download.sha256");

  if (sha256 !== undefined && !sha256Pattern.test(sha256)) {
    fail(file, "download.sha256 must be blank or a 64-character SHA-256 hash");
  }

  if (app.assets !== undefined) {
    optionalString(app, file, "assets.icon");

    if (
      app.assets.screenshots !== undefined &&
      (!Array.isArray(app.assets.screenshots) ||
        app.assets.screenshots.some((item) => typeof item !== "string"))
    ) {
      fail(file, "assets.screenshots must be an array of strings");
    }
  }

  return {
    id,
    name,
    author: app.author,
    version: app.version,
    category: app.category,
    description: app.description,
    license: app.license,
    website: app.website ?? "",
    source: app.source ?? "",
    download: {
      url: app.download.url,
      type: app.download.type,
      install_path: app.download.install_path,
      sha256: app.download.sha256 ?? ""
    },
    assets: {
      icon: app.assets?.icon ?? "",
      screenshots: app.assets?.screenshots ?? []
    },
    requires_original_files: app.requires_original_files,
    original_files_note: app.original_files_note ?? "",
    curation: {
      status: app.curation?.status ?? "candidate",
      tested_on: app.curation?.tested_on ?? "",
      notes: app.curation?.notes ?? ""
    }
  };
}

async function main() {
  const entries = await readdir(appsDir);
  const appFiles = entries
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const publishedFiles = appFiles.filter((file) => !file.startsWith("_"));
  const seenIds = new Map();
  const apps = [];

  for (const file of appFiles) {
    const fullPath = path.join(appsDir, file);
    const raw = await readFile(fullPath, "utf8");
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      fail(file, `invalid JSON: ${error.message}`);
    }

    const app = validateApp(parsed, file);

    if (file.startsWith("_")) {
      continue;
    }

    if (seenIds.has(app.id)) {
      fail(file, `duplicate id also used by ${seenIds.get(app.id)}`);
    }

    seenIds.set(app.id, file);
    apps.push(app);
  }

  apps.sort((a, b) => a.name.localeCompare(b.name));

  const catalog = {
    schema_version: 1,
    apps
  };

  const output = `${JSON.stringify(catalog, null, 2)}\n`;

  if (checkOnly) {
    const existing = await readFile(indexPath, "utf8").catch(() => "");

    if (existing !== output) {
      throw new Error("repo/index.json is out of date. Run npm run build:catalog.");
    }
  } else {
    await writeFile(indexPath, output);
  }

  console.log(`Catalog OK: ${apps.length} published app${apps.length === 1 ? "" : "s"}.`);
  console.log(`Ignored ${appFiles.length - publishedFiles.length} example/template file${appFiles.length - publishedFiles.length === 1 ? "" : "s"}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
