export function getScreenMousePosition () {
  return canvas.app.stage.toGlobal(canvas.mousePosition)
}