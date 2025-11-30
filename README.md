# Exam Timer (React — JSX)

A single-page React application that implements an exam timer with violation simulation and session summary. The project is primarily JSX-based, however the app entry file is a TypeScript `index.tsx` (minimal, typed wrapper) to avoid build/runtime issues in environments expecting a TypeScript entry point.

> **Why this change?**
> When running in a project scaffold that expects `index.tsx`, providing `index.jsx` can cause the bundler or TypeScript checker to try to parse a `.tsx` entry and fail due to missing semicolons or type expectations. To be robust we provide a tiny, well-formed `index.tsx` which imports the JSX components.

## Features
- 45-minute countdown timer in `MM:SS` format
- Pause / Resume
- Visual warning at 5 minutes (yellow) and critical blink at 1 minute (red)
- Browser notifications at 5 and 1 minute marks
- Optional sound toggle for 1-minute alert
- Document title shows remaining time when inactive
- Simulated proctoring violations (3 types) with top strip showing total violations and a badge
- Violation log with timestamps
- Session summary at timer end (total time taken + violations by type + timeline)
- Edge-case handling: `onbeforeunload` prompt if timer is active
- Basic unit test for timer logic

## Setup
1. Install packages:
```bash
npm install
```
2. Start dev server:
```bash
npm start
```
3. Run tests (optional):
```bash
npm test
```

## Notes on TypeScript/JSX
- The majority of the app is written as JSX files (`.jsx`) for readability as requested.
- The entry file is `src/index.tsx` and contains a very small TypeScript wrapper with proper semicolons and minimal `HTMLElement` typing to avoid the "Missing semicolon" or parsing errors when TypeScript tooling is present.
