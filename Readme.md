# [Precise Drawing Tools](https://foundryvtt.com/packages/precise-drawing-tools/)

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/shemetz/precise-drawing-tools?style=for-the-badge)
![GitHub Releases](https://img.shields.io/github/downloads/shemetz/precise-drawing-tools/latest/total?style=for-the-badge)
![GitHub All Releases](https://img.shields.io/github/downloads/shemetz/precise-drawing-tools/total?style=for-the-badge&label=Downloads+total)  
![Latest Supported Foundry Version](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/shemetz/precise-drawing-tools/raw/master/module.json)

FoundryVTT module to make the drawing tool more precise in several ways.

To install, browse for it in the module browser,
or [directly copy the manifest link for the latest release](https://github.com/shemetz/precise-drawing-tools/releases/latest/download/module.json).

# Features (mostly affecting freehand drawing)

## Disabled grid-snapping (allow precise starting points for strokes)

![](metadata/demo_grid_snapping.gif)

## Disabled drag resistance (allow very short strokes)

![](metadata/demo_drag_resistance.gif)

## Disabled double click (allow rapidly creating strokes)

![](metadata/demo_double_click.gif)

Note: as of Foundry V11, rapid strokes are still somewhat limited, so you can't do it as fast as you want

## Dynamic sampling rate (improve resolution of quick strokes)

![](metadata/screenshot_dynamic_sampling_rate.png)

## Eyedropper / Color Picker (press K to switch to the hovered color)

![](metadata/demo_eyedropper.gif)

Note: this color picker demo gif is outdated, as the feature now **ignores lighting**, which
allows drawings to more seamlessly fit into the background.