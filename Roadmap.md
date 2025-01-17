# Stylus support, wacom drawing pad, pressure-sensitive drawing
- Figure out if it's possible to override or cancel or ignore the core foundry "pointermove" handlers
- maybe relevant?  https://github.com/foundryvtt/foundryvtt/issues/8637
- Allow strokes with width based on pressure sensitivity
- Gain access to a drawing tablet so that I can try this out

### References for stylus support

- [Wacom developer docs - Web API Basics](https://developer-docs.wacom.com/docs/icbt/web/web-api-basics/)
- [Scribble Demo (has more reference links within it)](https://github.com/Wacom-Developer/wacom-device-kit-web/blob/master/SampleCode/ScribbleDemo.html)
- [Perfect Freehand library](https://github.com/steveruizok/perfect-freehand)
- [Drawing Tablet example app](https://github.com/hicodersofficial/drawing-tablet)
- [Lots of tiny pointer-related HTML demos](https://patrickhlauke.github.io/touch/)

### Possibly relevant FoundryVTT modules
- [Boneyard Drawing Tools](https://github.com/operation404/boneyard-drawing-tools)
- [Sketch Tiles](https://foundryvtt.com/packages/sketch-tiles)  (it's nice, maybe I could fork it?  desperately needs color picker and eraser and transparency)


# Consume "drawing tokenizer" into this module?
- [Drawing Tokenizer](https://github.com/KayelGee/DrawingTokenizer) (+[my fork](https://github.com/shemetz/DrawingTokenizer))

# Add Eraser tool?
It would be a tool that lets you drag the cursor through a bunch of Drawing objects and instantly erase everything you
move oit through.  Ctrl+Z would hopefully still work afterwards to undo what you did.
