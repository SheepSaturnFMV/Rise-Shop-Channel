# Rise Shop Channel

Rise Shop Channel is a curated homebrew store for the Nintendo Wii.

The goal is not to mirror every Wii homebrew release. The catalog should stay small enough to review, test, and trust. Apps should be useful, fun, maintained enough to install cleanly, and legal to distribute or link to.

## Current status

The Wii client is still in development. This repository now includes the catalog structure that the client can use later:

- `repo/apps/` contains one metadata file per app.
- `repo/index.json` is the generated catalog file the Wii client can download.
- `repo/schema/app.schema.json` documents the app metadata format.
- `scripts/build-catalog.mjs` validates app metadata and rebuilds the catalog index.
- `tools/catalog-manager.html` is a browser tool for creating metadata files and browsing the generated catalog.

## Publishing workflow

To add a curated app or game:

1. Find the official homebrew release page or download link.
2. Confirm the app is legal to redistribute or link to.
3. Test the app on a Wii or a realistic Wii homebrew setup.
4. Open `tools/catalog-manager.html` in a browser and fill out the metadata form.
5. Download the generated JSON file.
6. Put that file in `repo/apps/`.
7. Run the catalog build:

```sh
npm run build:catalog
```

That command validates every real app metadata file and updates `repo/index.json`.

Files in `repo/apps/` that start with `_` are treated as examples or templates. They are not published into `repo/index.json`.

You can also copy `repo/apps/_example.json` by hand if you prefer editing JSON directly.

## App metadata

Each app gets one JSON file in `repo/apps/`. The filename should match the app ID:

```text
repo/apps/wiixplorer.json
```

The `id` should be lowercase and stable. Use letters, numbers, and hyphens only.

The `download.url` should point to the official release when possible. If this repository hosts a package later, the package must only contain files that are legal to redistribute. Do not include copyrighted commercial game files.

Ports that need original game data are allowed only when the commercial files are not included. Set `requires_original_files` to `true` and explain what the user needs in `original_files_note`.

## Curated rules

Rise Shop Channel should prefer:

- Homebrew games
- Emulators
- Open-source ports
- Utilities and system tools
- Media apps
- Launchers
- Apps that install cleanly into `/apps/app-id/`

Do not add:

- Commercial game files
- Pirated software
- ROMs, ISOs, WADs, or BIOS files
- Broken or abandoned releases that do not install cleanly
- Duplicate apps unless there is a clear reason
- Joke apps that do not provide real value

## Validation

Run this before committing catalog changes:

```sh
npm run validate:catalog
```

Validation checks required fields, app IDs, duplicate IDs, download URLs, and install paths. GitHub Actions also runs the same check on pushes and pull requests.

## Repository layout

```text
Rise-Shop-Channel/
├── repo/
│   ├── apps/
│   │   └── _example.json
│   ├── index.json
│   └── schema/
│       └── app.schema.json
├── scripts/
│   └── build-catalog.mjs
├── tools/
│   └── catalog-manager.html
├── package.json
└── README.md
```

## License and copyright

Only add files that this repository has permission to distribute.

When in doubt, link to the official download instead of copying the file into this repository.
