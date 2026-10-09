## What changed

<!-- Short description of the change and which feature(s) it touches -->

## Checklist (reviewer + author must confirm)

### Architecture & standards
- [ ] New/changed feature code follows the standard folder shape (`api/components/hooks/store/types/index.ts`)
- [ ] New public exports added to the feature's `index.ts` barrel
- [ ] API calls go through the proxy/fetchApi and use `ApiErrorCode` / `classifyError` for failure handling
- [ ] No secrets/tokens in `localStorage` or client state; session managed via httpOnly cookies
- [ ] State-changing API routes call `checkCsrf()`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (new logic has test coverage where practical)
- [ ] `pnpm build` passes

### Application feel / UI consistency
- [ ] Reuses existing shared components from `src/components/ui/` instead of new one-off styled elements
- [ ] Spacing, colors, and typography match existing screens
- [ ] Loading, empty, and error states match the existing pattern
- [ ] Verified in the browser, not just "should work"

## Screenshots / recording (UI changes)

<!-- Before/after screenshots so the reviewer can check visual consistency -->
