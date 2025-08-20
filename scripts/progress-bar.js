
let progressBar = null
const localize = (key) => game.i18n.localize(`precise-drawing-tools.${key}`)
export const startProgressBar = ({ label }) => {
  progressBar = ui.notifications.notify(label, 'info', { progress: true })
  progressBar.update({ message: label, pct: 0 })
}
export const updateProgressBar = ({ label, pctFraction }) => {
  let bar = progressBar
  if (!bar?.active) {
    ui.notifications.error(localize('notifications.progress-bar-not-found'))
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