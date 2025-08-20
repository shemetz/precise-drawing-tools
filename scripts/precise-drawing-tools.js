import { hookEyedropperColorPicker } from './eyedropper-color-pick.js'
import { addConvertDrawingsButton } from './convert-drawings-button.js'

export const MODULE_ID = 'precise-drawing-tools'

export function getSetting (settingName) {
  return game.settings.get(MODULE_ID, settingName)
}

const localize = (key) => game.i18n.localize(`precise-drawing-tools.${key}`)

const isActivelyDrawingWithFreehand = () => ui.controls.tool.name === 'freehand'

const updateActiveToolLimits = () => {
  resetFreehandSamplingRate()
}

const setFreehandSamplingRate = (newSamplingRateMs) => {
  foundry.canvas.placeables.Drawing.FREEHAND_SAMPLE_RATE = newSamplingRateMs
  canvas.mouseInteractionManager.dragTime = -999
}

const resetFreehandSamplingRate = () => {
  const DEFAULT_FREEHAND_S_R = 75
  setFreehandSamplingRate(DEFAULT_FREEHAND_S_R)
  lastFewMousePoints.splice(0, lastFewMousePoints.length)
  lastFewMoments.splice(0, lastFewMoments.length)
}

/**
 * note - Foundry defaults to undefined drag resistance, but the handlePointerMove code defaults to
 * `this.options.dragResistance || (canvas.dimensions.size / 4)` - which means that if we want to "disable" drag
 * resistance we want to set it to a very small but defined and non-zero value (in this case, 0.1).
 *
 * The previous_dragResistance variable memory to revert to the old value is only here as backup in case a different
 * module is also messing with the drag resistance.
 */
let previous_dragResistance = null

function handleMouseDown (mouseDownEvent) {
  if (mouseDownEvent.data.originalEvent.button !== 0) return // not left-click
  if (!isActivelyDrawingWithFreehand()) return // not freehand tool

  if (getSetting('disable-drag-resistance-while-drawing')) {
    // temporarily set dragResistance to be minimal, later revert it on mouseup
    previous_dragResistance = canvas.mouseInteractionManager.options.dragResistance
    canvas.mouseInteractionManager.options.dragResistance = 0.1
  }
}

function handleMouseUp (mouseUpEvent) {
  if (mouseUpEvent.data.originalEvent.button !== 0) return // not left-click
  if (!isActivelyDrawingWithFreehand()) return // not freehand tool

  if (getSetting('disable-drag-resistance-while-drawing')) {
    // revert temporary dragResistance change
    if (previous_dragResistance !== null) {
      canvas.mouseInteractionManager.options.dragResistance = previous_dragResistance
      previous_dragResistance = null
    }
  }

  if (getSetting('enable-dynamic-sampling-rate-while-drawing')) {
    // we should undo our change to sampling rate and throttling
    resetFreehandSamplingRate()
  }
}

const MAX_FREEHAND_S_R = 75
const MIN_FREEHAND_S_R = 4  // going lower risks probably-too-high polygon counts
const POINTS_SAMPLE_BUFFER_LENGTH = 30
const lastFewMousePoints = []
const lastFewMoments = []

function handleMouseMove (mouseMoveEvent) {
  const mim = canvas.mouseInteractionManager
  if (mim.state !== mim.states.DRAG) return
  if (mim._dragRight) return
  if (!isActivelyDrawingWithFreehand()) return
  if (!getSetting('enable-dynamic-sampling-rate-while-drawing')) return

  const desiredMaxDistanceBetweenTwoPoints = getSetting('target-sampling-distance')
  const origEvent = mouseMoveEvent.data.originalEvent
  const timeNowMs = performance.now()  // note - this is rounded to 0.1 ms, and likely stops working with firefox resistFingerprinting
  //const halfDragThrottleMs = canvas.mouseInteractionManager._dragThrottleMS / 2
  const halfDragThrottleMs = 8
  if (lastFewMoments.length < 2) {
    lastFewMousePoints.push([origEvent.clientX, origEvent.clientY])
    lastFewMoments.push(timeNowMs)
    // temporarily "reset" sampling rate to be very quick for the first 2 points, to avoid visual uglyness
    setFreehandSamplingRate(MIN_FREEHAND_S_R)
  } else if (timeNowMs - lastFewMoments[lastFewMoments.length - 1] >= halfDragThrottleMs) {
    lastFewMousePoints.push([origEvent.clientX, origEvent.clientY])
    lastFewMoments.push(timeNowMs)
  }
  if (lastFewMousePoints.length > 1) {
    if (lastFewMousePoints.length > POINTS_SAMPLE_BUFFER_LENGTH)
      lastFewMousePoints.shift()  // stay at reasonable length
    // idea:  set dynamic sampling rate to be based on "nyquist's theorem", as 2 times the highest frequency of the data.
    // in this case, with varying frequency, I'll set it to be 2 times the frequency needed to get points within some reasonable maximum distance,
    // based on the recent average speed, and bounded.
    const lastFewSpeeds = lastFewMousePoints.map((xy, i) => {
      if (i === 0) return -1
      const deltaX = xy[0] - lastFewMousePoints[i - 1][0]
      const deltaY = xy[1] - lastFewMousePoints[i - 1][1]
      const deltaDistancePx = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))
      const deltaTimeMs = lastFewMoments[i] - lastFewMoments[i - 1]
      return deltaDistancePx / deltaTimeMs // speed in pixels per millisecond
    }).filter(p => p !== -1)
    const avgRecentSpeed = lastFewSpeeds.reduce(
      (s, sumS) => s + sumS, 0,
    ) / lastFewSpeeds.length
    // we want to ensure avgRecentSpeed leads to 2 points captured per desired max distance
    const satisfyingSamplingRate = desiredMaxDistanceBetweenTwoPoints / avgRecentSpeed / 2
    const newSamplingRate = Math.min(MAX_FREEHAND_S_R, Math.max(MIN_FREEHAND_S_R, satisfyingSamplingRate))
    setFreehandSamplingRate(newSamplingRate)
  }
}

Hooks.once('init', function () {
  game.settings.register(MODULE_ID, 'disable-drag-resistance-while-drawing', {
    name: localize('settings.disable-drag-resistance.name'),
    hint: localize('settings.disable-drag-resistance.hint'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'enable-dynamic-sampling-rate-while-drawing', {
    name: localize('settings.enable-dsr.name'),
    hint: localize('settings.enable-dsr.hint'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'target-sampling-distance', {
    name: localize('settings.target-sampling-distance.name'),
    hint: localize('settings.target-sampling-distance.hint'),
    scope: 'client',
    config: true,
    type: Number,
    default: 50,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'enable-eyedropper-color-picker', {
    name: localize('settings.enable-eyedropper.name'),
    hint: localize('settings.enable-eyedropper.hint'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
  })
  game.settings.register(MODULE_ID, 'enable-convert-drawings-button', {
    name: localize('settings.enable-convert-drawings.name'),
    hint: localize('settings.enable-convert-drawings.hint'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
  })
})

Hooks.once('setup', function () {
  hookEyedropperColorPicker()
  console.log('Done setting up Precise Drawing Tools.')
})

Hooks.on('canvasReady', function () {
  Hooks.on('renderSceneControls', updateActiveToolLimits)
  // TODO refactor and replace mousemove with pointermove, etc, for drawing tablet support?
  canvas.stage.on('mousedown', handleMouseDown)
  canvas.stage.on('mouseup', handleMouseUp)
  canvas.stage.on('mousemove', handleMouseMove)
})

Hooks.on('getSceneControlButtons', addConvertDrawingsButton)
