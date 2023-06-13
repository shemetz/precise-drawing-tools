export function getScreenMousePosition () {
  return canvas.primary.toGlobal(canvas.mousePosition)
}