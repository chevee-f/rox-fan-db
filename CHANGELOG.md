# Changelog

All notable changes to the Introboys Fan Database site are documented here.

## [0.7.0] — 2026-06-20

### Added
- **Introboys** default brand theme (dark + gold palette, community homepage).
- Public homepage with tool directory, changelog, and legal pages (Privacy, Terms, Disclaimer, Cookies).
- Spawn Trackers **[beta]**: shared groups with host/guest sync via optional self-hosted Node.js server.
- Guest permissions modal (Perms) with per-guest create/update/delete flags.
- Four color themes: Modern (default), Dark, Light, and Hacker.
- Guest `leave_group` — removing a shared group notifies the server and clears the host roster.

### Fixed
- Guest reset/update now correctly updates the `addedBy` label on shared timers.
- Host Perms modal loads connected guests from the server after refresh (live socket reconciliation).
- Guest removing a shared group no longer restores it after page refresh.
- Mobile layout: tighter spacing, unified dashboard toolbar, reduced empty space on timers page.
- Infinite “Sharing Live” toast loop on host reconnect.

### Changed
- Site rebranded to **Introboys Fan Database** (community tools for the Introboys).
- EXP Tier List moved from `/` to `exp.html`; homepage is now `index.html`.
- Spawn Trackers nav label shows **[beta]** badge.

## [0.6.0] — 2026-06-01

### Added
- Responsive layout overhaul across calculator, quiz, guides, and timers.
- Global theme switcher in site header.
- Cross-tab spawn alarm background monitor (local timers only).

## [0.5.0] — 2026-05-15

### Added
- OX Quiz answer lookup tool.
- Game guides section.
- Local spawn timer dashboard (pre-sharing prototype).

## [0.1.0] — 2026-04-01

### Added
- Monster EXP Tier List calculator with level, size, element, race, and mode filters.
