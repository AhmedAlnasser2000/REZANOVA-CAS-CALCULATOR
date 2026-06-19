# LANGUAGE-COMPARTMENT-FOUNDATION1

Date: 2026-06-19

Status: implementation record.

## Summary

`LANGUAGE-COMPARTMENT-FOUNDATION1` creates the first live Language district under `src/lib/language/`. It is English-only infrastructure for product text, not a translation pass.

The foundation adds:

- typed language contracts for codes, direction, metadata, catalogs, and dynamic string functions;
- English catalog modules split by surface: common, shell, display, settings, history, variables, diagnostics, guide, and errors;
- deterministic English fallback for unknown language codes and invalid catalog resources;
- catalog validation against the canonical English shape;
- a pure public API at `src/lib/language/index.ts`;
- an unmounted React provider/hook at `src/lib/language/language-context.ts`;
- a `language` entry in the compartment manifest.

## Public Seams

- `src/lib/language/index.ts`: pure language constants, types, registry lookup, metadata lookup, and validation.
- `src/lib/language/language-context.ts`: React `LanguageProvider` and `useLanguage`.

The default React context is English, so a future consumer can safely call `useLanguage()` even before the app mounts a provider.

## Contract Decisions

- English is the canonical catalog and fallback.
- `LanguageCode` is currently `'en'`.
- `LanguageDirection` is `'ltr' | 'rtl'`.
- Dynamic strings use typed functions, not placeholder strings.
- Missing, unknown, or invalid language inputs resolve to English.
- Invalid registry/catalog entries fall back to the canonical English catalog.
- Language owns prose, labels, commands, metadata, fallback, and interpolation.
- Display/notation owns math rendering and future structured mixed prose/math rendering.

## Manifest Entry

The compartment manifest now declares:

- `id: 'language'`;
- `stateSurface: 'static'`;
- `surfaceExposureCandidate: 'none'`;
- `ownedPaths: ['src/lib/language/']`;
- `publicSeams: ['src/lib/language/index.ts', 'src/lib/language/language-context.ts']`;
- `privatePaths: ['src/lib/language/languages/']`;
- policies: `library-no-app-ui`, `no-source-mirrors`.

## Non-Goals

This milestone does not:

- migrate existing UI strings;
- mount the provider into `App` or `AppMain`;
- add a settings schema or persisted language preference;
- add Arabic or any non-English catalog;
- apply RTL layout behavior;
- rewrite Guide content;
- change solver/readback wording;
- change Display math rendering;
- change OOE/runtime authority;
- change app-state or History schemas.
