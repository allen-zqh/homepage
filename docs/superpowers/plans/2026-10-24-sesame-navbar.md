# Sesame Navbar Companion Implementation Plan

> **For agentic workers:** Use test-driven development for behavior and independent review before delivery. Preserve all pre-existing local changes; do not commit, push, or modify the installed pet.

**Goal:** Put a cute comic-style Sesame cat in the left of the existing navbar, with bounded motion and click-to-cycle actions, and remove the visible tab favicon.

**Architecture:** One transparent 4-by-4 sprite sheet, CSS-sized independently of the page content, and a small vanilla-JavaScript controller. No backend, package installation, or framework. The existing bilingual page loader remains unchanged.

**Tech Stack:** HTML, CSS, browser JavaScript, Node built-in tests, existing Python content tests, built-in image generation.

**Spec:** User-approved design in this chat: preserve Sesame's black coat, yellow-green eyes and curious character; use cute comic styling; default idle, then run, wave, jump on successive clicks; bounded navbar movement; mobile adaptation; reduced-motion support; transparent favicon.

## Global Constraints

- Keep all publication/profile text and existing navigation behavior unchanged.
- Preserve old favicons, generated icon concepts, and `/Users/zqh/Documents/芝麻/芝麻-pet`.
- Desktop stage is at most 208px wide and 62px high; visual cat fits inside a 56px square frame.
- Native button activation cycles `idle -> run -> wave -> jump -> idle`.
- Four columns and four action rows: idle row 0, run-right row 1, wave row 2, jump row 3. Mirror run-left only.
- Movement never exits the stage; stationary actions keep the current horizontal position, clamped on resize.
- Reduced motion and hidden tabs stop time progression; reduced motion still permits explicit static pose changes.
- User revision: no pause button; hover tooltip is only `Sesame` / `芝麻`. Keep reduced-motion and hidden-tab automatic pause, and localize accessible names.
- No changes to installed Codex pets, dependencies, commits, or deployment.

## Review Focus

- Resize and narrow stages must never produce negative/out-of-range positions.
- Keyboard and repeated clicks must advance exactly one action, without triggering navigation.
- Hidden-tab resume must not jump forward by elapsed background time.
- Language changes must retain action/motion state and update accessible names.
- Image load failure must not hide/block menu links or leave an unexplained broken control.

### Task 1: Artwork and layout (root)

Files: `assets/sesame/sprites.png`, `assets/sesame/generation-prompt.txt`, `css/sesame.css`, `index.html`, `README.md`.

Interface: stage `[data-sesame-stage]` contains native `button[data-sesame-cat]` and its `.sesame-sprite`. The JS sets cat `data-action`, `--sesame-x` (px), `--sesame-facing` (1/-1), sprite `backgroundPosition`, and stage `data-paused`. There is no pause button.

- [x] Generate and inspect the transparent 16-frame sheet, preserving Sesame's identity.
- [x] Add stage markup and responsive CSS without changing content or menu ordering.
- [x] Replace favicon link with an empty transparent SVG data URI, preserving original files.
- [x] Verify desktop and mobile layout in the browser and record image provenance.

### Task 2: Controller and tests (delegate)

Files: `js/sesame.js`, `tests/sesame.test.js` only.

Interface: exported pure helpers plus `initializeSesame(document, window)`; script initializes after DOM ready, uses the Task 1 selectors, and tolerates absent markup. No fetch, no persistent storage, no dependency on navigation internals. Use a `MutationObserver` on `html[lang]` for labels and `ResizeObserver` for stage measurements when available.

- [x] Write and run failing tests for action wraparound, bounded motion/direction reversal, reduced motion, visibility pause/resume, language labels and single initialization.
- [x] Implement a requestAnimationFrame controller with frame durations roughly idle 450ms, run 140ms, wave 220ms, jump 180ms and running speed around 22px/s.
- [x] Keep at most one scheduled frame; cancel when paused/hidden/reduced-motion and resume without large deltas. Focus/hover may pause movement to make the cat easy to click.
- [x] Run all Node and Python tests; report changed files and verification evidence. Do not commit.

### Task 3: Integration and review

- [x] Root connects script/style and checks the real artwork/frame alignment.
- [x] Independent review covers controller, integration, keyboard/automatic pause, mobile width and old page behavior.
- [x] Run `node --test tests/*.test.js`, `python3 -B -m unittest discover -s tests -p 'test_*.py'`, and `git diff --check`.
- [x] Deliver a screenshot and local preview link; no deployment.

## Verification outcome

43/43 Node tests and 17/18 Python tests pass. The remaining Python failure predates this feature: its editorial-service assertion still expects the C扩/CSSCI suffixes removed from the user's current content. No content was reverted to satisfy that stale expectation. `git diff --check` passes. Browser checks cover the four-action cycle, run position changes, localized name-only tooltips, language switching without resetting action, and 375px English/Chinese plus 681px English and 740px Chinese layouts. No browser warnings/errors were captured. Temporary responsive QA page removed after inspection.
