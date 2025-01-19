## 1.5.0 - 2025-01-19
- Added new "Convert Drawings to Tile" button
- 1.5.1 - Optimized it a little bit, and added a loading bar

## 1.4.2 - 2025-01-03
- Improved github workflow automation

## 1.4.1 - 2024-07-11
- Fix drag-resistance setting not working after scene changes (#8)

## 1.4.0 - 2024-06-09
- Changed color picker - now it will temporarily disable scene lighting and weather while the button is held, to ensure
  the selected color is right (and not darker due to tint).  This is annoying, hopefully I could find a better solution
  in the future.
- Removed settings for disabling grid snapping and double clicking;  both of these are now working well in core Foundry (V12)
- It looks like V12 generally has a smooth experience again for rapid subsequent strokes, nice!

## 1.3.0 - 2023-06-13
- Fixed Foundry V11 compatibility (#7). Sadly it required a large refactor, and is not guaranteed to keep working for
future Foundry versions.  It's also very likely that the "disable double click" feature no longer works perfectly; rapid
subsequent strokes still get ignored/missed, probably because of each stroke now becoming "hovered" right after
creation.

## 1.2.0 - 2022-12-21
- Added Dynamic Sample Rate feature! (#4)

## 1.1.0 - 2022-12-20
- Improved color picker, will now grab a lower and more "background" color (before lighting and before UI elements
 like token status icons).  Credit to dev7355608 for the incredible PR (which had a wonderful additions-to-deletions 
 ratio).

## 1.0.0 - 2022-09-02
- Released module

## 0.0.1 - 2022-09-01
- Created the module, with initial feature set
