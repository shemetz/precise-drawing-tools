
let progressBar = null
export const startProgressBar = ({ label }) => {
  progressBar = ui.notifications.notify(label, 'info', { progress: true })
  progressBar.update({ message: label, pct: 0 })
}
export const updateProgressBar = ({ label, pctFraction }) => {
  let bar = progressBar
  if (!bar?.active) {
    ui.notifications.error('Progress bar not found, something is wrong with preciseDrawingTools!')
    return
  }
  bar.update({
    message: label,
    pct: pctFraction,
  })
}
export const stopProgressBar = ({ label }) => {
  progressBar.update({ message: label, pct: 1 })
}