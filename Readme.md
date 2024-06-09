# [Precise Drawing Tools](https://foundryvtt.com/packages/precise-drawing-tools/)

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/shemetz/precise-drawing-tools?style=for-the-badge)
![GitHub Releases](https://img.shields.io/github/downloads/shemetz/precise-drawing-tools/latest/total?style=for-the-badge)
![GitHub All Releases](https://img.shields.io/github/downloads/shemetz/precise-drawing-tools/total?style=for-the-badge&label=Downloads+total)  
![Latest Supported Foundry Version](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/shemetz/precise-drawing-tools/raw/master/module.json)

FoundryVTT module to make the drawing tool more precise in several ways.

To install, browse for it in the module browser,
or [directly copy the manifest link for the latest release](https://github.com/shemetz/precise-drawing-tools/releases/latest/download/module.json).

# Features (mostly affecting freehand drawing)


## Disabled drag resistance (allow very short strokes)

![](metadata/demo_drag_resistance.gif)

## Dynamic sampling rate (improve resolution of quick strokes)

![](metadata/screenshot_dynamic_sampling_rate.png)

## Eyedropper / Color Picker (press K to switch to the hovered color)

![](metadata/demo_eyedropper.gif)

Note: this color picker demo gif is outdated, as the feature now **ignores lighting**, which
allows drawings to more seamlessly fit into the background.  However, as of Foundry V12, this requires temporarily
disabling the scene darkness and weather effects as long as the button (K) is held, to ensure that the selected color is
precisely the right color (from the background/tile/token/drawing you're hovering over), rather than a darkened version of it.

# Old features - now core behavior as of Foundry V12 (awesome!)

### Disabled grid-snapping (allow precise starting points for strokes)

![](metadata/old_demo_grid_snapping.gif)

### Disabled double click (allow rapidly creating strokes)

![](metadata/old_demo_double_click.gif)
