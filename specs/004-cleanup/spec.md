# Spec: 004-cleanup - Remove unused files

## Summary
Remove files that nothing references, to shrink the repository and bundle inputs.

## Removed (verified unreferenced by search of `src/`, `index.html`, configs)
- `src/assets/images 1.jpg` ... `images 22.jpg` (22 files, ~7 MB; no imports, no `import.meta.glob`).
- `src/App.css` (empty, never imported).
- `src/components/Loader.jsx` (never imported).
- `public/_redirects` (Netlify-style fallback; hosting uses `vercel.json`).
- `@types/react`, `@types/react-dom` from `devDependencies` (JavaScript project; remain only as optional peer entries in the lockfile).

## Kept
- `src/contexe/` (typo kept on purpose, constitution section 2).

## Acceptance Criteria
- AC-1: `npm run lint` and `npm run build` pass.
- AC-2: All routes still load (no imports removed).

## Notes
- Deleted images stay in git history; shrinking history would need a history rewrite (out of scope).
