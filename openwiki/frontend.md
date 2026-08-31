---
type: "Reference"
title: "Frontend & Extension"
openwiki_generated: true
---

# Frontend & Extension

## Web App (apps/web)
- Next.js 14+ App Router
- Pages and routes: `apps/web/app/`
- State: Bookmark list, search results, categories

### Local Dev
- `npm run dev:web` to run web

### Change Guidance
- New pages: Add to `apps/web/app/`
- Bookmark UI: Edit `Bookmark.tsx` components
- Search UI: Edit semantic search interfaces

## Chrome Extension (apps/extension)
- React-based Chrome extension for quick bookmark capture
- Source: `apps/extension/src/`
- Build: `npm run build:extension`

### Dev
- Load unpacked from `apps/extension/dist` after build

### Change Guidance
- New capture features: Edit extension React code
- Sync logic: Update state sharing logic between web + extension

## References
- [Architecture](openwiki/architecture.md)
