// Ambient declarations for side-effect asset imports (e.g. `import "./globals.css"`).
// Next.js normally provides these via the auto-generated, git-ignored next-env.d.ts,
// but that file only exists after running `next dev`/`next build`. Declaring the
// modules here keeps TypeScript/the editor happy even on a fresh checkout, and it
// coexists harmlessly with Next's own types.
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
