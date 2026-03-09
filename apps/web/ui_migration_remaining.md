# UI Migration Remaining

## Completed
- Installed and wired Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) for this app.
- Replaced StyleX runtime + inline global styles with Tailwind/base CSS in `src/app.css`.
- Added shared neo-brutalist UI class primitives in `src/styles/ui.ts`.
- Migrated all StyleX-based components to Tailwind class-based styling:
  - `src/components/Layout.tsx`
  - `src/components/MovieCard.tsx`
  - `src/components/ReviewCard.tsx`
  - `src/components/SearchBar.tsx`
  - `src/components/StarRating.tsx`
  - `src/components/FederationDiagram.tsx`
- Migrated all StyleX-based pages to Tailwind class-based styling:
  - `src/pages/AddMoviePage.tsx`
  - `src/pages/LoginPage.tsx`
  - `src/pages/RegisterPage.tsx`
  - `src/pages/MovieListPage.tsx`
  - `src/pages/MovieDetailPage.tsx`
  - `src/pages/ProfilePage.tsx`
  - `src/pages/ArchitecturePage.tsx`
- Removed StyleX files:
  - `src/styles/form.stylex.ts`
  - `src/styles/tokens.stylex.ts`
- Removed StyleX dependencies from `package.json`:
  - `@stylexjs/stylex`
  - `@stylexjs/babel-plugin`
- Updated Vite config to Tailwind plugin only and switched to ESM config file:
  - `vite.config.mts`
- Updated entry/bootstrap:
  - `src/main.tsx` imports `src/app.css`
  - `index.html` no longer contains inline animation/reset stylesheet
- Removed `pnpm-lock.yaml` from app workspace to align with Bun tooling.
- Verified successful production build with Bun: `bun run build`.

## Pending
- None for the StyleX -> Tailwind v4 migration scope.
