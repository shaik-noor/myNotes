# MyNotes identity

The shared mark combines folded ivory pages into a compact m / open-notebook silhouette, with cornflower blue folds on midnight blue. Use this identity for app branding; action icons and user-selected page icons remain semantic controls.

Master: `resources/icon.png`. Generated with the built-in imagegen tool on 21 October 2026.

Generation prompt: “Create a single production app icon for MyNotes, a quiet personal knowledge and writing workspace. Two flowing folded paper strokes form a lowercase m and an open notebook, ivory paper with cornflower blue folded edges on a deep midnight blue rounded-square tile. Flat vector-like precision, generous negative space, simple silhouette readable at small sizes. Transparent outside the tile. No lettering, sparkle, pencil, mockup, or extra symbols.”

Regenerate native platform assets using `npx tauri icon resources/icon.png --ios-color '#0b204c'`. Copy the 256 px result to `frontend/assets/icon.png`, the 32 px result to both favicon PNG paths, and the ICO to `public/favicon.ico`. Export the master at 512 px for `public/icon.png` and 180 px for `public/apple-touch-icon.png`. AppLogo is the shared UI component used by the title bar and About panel.
