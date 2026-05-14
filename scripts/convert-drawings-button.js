/* MIT License   Copyright (c) 2020 KayelGee    https://github.com/KayelGee/DrawingTokenizer */

import { convertDrawingsToImage } from './canvas-pixi-utils.js'
import { getSetting } from './precise-drawing-tools.js'
import { startProgressBar, stopProgressBar, updateProgressBar } from './progress-bar.js'

const localize = (key) => game.i18n.localize(`precise-drawing-tools.${key}`)

const getWorldPath = () => {
  return 'worlds/' + game.world.id
}

const getUploadPath = () => {
  return 'worlds/' + game.world.id + '/PDT-converted-drawings'
}

const uploadBlobToFoundry = async (blob, filename) => {
  await createUploadDirectory()
  const file = new File([blob], filename, { type: 'image/webp' })
  const storage = 'data'
  const filePath = getUploadPath()
  return foundry.applications.apps.FilePicker.upload(storage, filePath, file, {}, { notify: true })
}

const createTileFromImage = async (uploadedPath, left, top, width, height) => {
  const tileData = {
    x: left + width / 2,
    y: top + height / 2,
    width,
    height,
    texture: { src: uploadedPath },
  }
  return CONFIG.Tile.documentClass.create(tileData, { parent: canvas.scene })
}

/**
 * Create the default Upload directory
 */
const createUploadDirectory = async () => {
  const options = {}
  const source = 'data'
  const files = await foundry.applications.apps.FilePicker.browse(source, getWorldPath(), options)
  const target = getUploadPath()
  const dirExists = files.dirs.includes(target)
  if (!dirExists) {
    await foundry.applications.apps.FilePicker.createDirectory(source, target, options)
  }
}

/**
 * Present the user with a dialog to convert a drawing to an image.
 */
const openConvertDrawingsDialog = async () => {
  const selectedDrawings = canvas.drawings?.controlled ?? []
  if (selectedDrawings.length <= 0) return ui.notifications.error(localize('drawing-to-image.dialog-error-no-drawings-selected'))
  const quality = 0.92 // I decided not to let the user select the quality, usually it's irrelevant
  const { blob, left, top, width, height } = await convertDrawingsToImage(selectedDrawings, quality)
  const blobUrl = URL.createObjectURL(blob)
  const dialogWidth = 800
  const imageMaxHeight = 800
  const formHeight = 160
  let displayedImageHeight = Math.round(Math.min(height, imageMaxHeight))
  let displayedImageWidth = Math.round(width * (displayedImageHeight / height))
  if (displayedImageWidth > dialogWidth - 20) {
    displayedImageWidth = dialogWidth - 20
    displayedImageHeight = Math.round(height * (displayedImageWidth / width))
  }

  const randomId = foundry.utils.randomID(4)
  const contentDiv = document.createElement('div')
  contentDiv.innerHTML = `
<div class="form-group-stacked">
    <div style="display: flex; flex-direction: column; align-items: center;">
        <img src="${blobUrl}" alt="generated image" style="height: ${displayedImageHeight}px; width: ${displayedImageWidth}px"/>
    </div>
    <div class="form-group">
      <label>${localize('drawing-to-image.dialog-input-filename-label')}</label>
      <input type="text" name="filename" value="${localize('drawing-to-image.default-filename-prefix')}${randomId}" required/>
    </div>
</div>
`

  return foundry.applications.api.DialogV2.wait({
    window: {
      title: localize('drawing-to-image.dialog-title'),
      icon: 'fa-solid fa-image',
    },
    position: {
      width: dialogWidth,
      height: formHeight + displayedImageHeight,
    },
    content: contentDiv,
    buttons: [
      {
        action: 'download',
        icon: 'fa-solid fa-download',
        label: localize('drawing-to-image.dialog-button-download-label'),
        callback: async (_event, _button, dialog) => {
          const filename = $(dialog.element).find('input')[0].value.trim()
          if (filename.length === 0) {
            URL.revokeObjectURL(blobUrl)
            return ui.notifications.error(localize('drawing-to-image.dialog-error-no-file-name'))
          }
          const fullFilename = filename + '.webp'

          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fullFilename
          a.click()

          a.remove()
          URL.revokeObjectURL(blobUrl)
        },
      },
      {
        action: 'uploadAndKeep',
        icon: 'fa-solid fa-eye-slash',
        label: localize('drawing-to-image.dialog-button-uploadAndKeep-label'),
        callback: async (_event, _button, dialog) => {
          URL.revokeObjectURL(blobUrl)
          const filename = $(dialog.element).find('input')[0].value.trim()
          if (filename.length === 0) {
            return ui.notifications.error(localize('drawing-to-image.dialog-error-no-file-name'))
          }
          const fullFilename = filename + '.webp'

          startProgressBar({ label: localize('drawing-to-image.progress-uploading') })
          updateProgressBar({ label: localize('drawing-to-image.progress-uploading'), pctFraction: 0.1 })
          const uploadResult = await uploadBlobToFoundry(blob, fullFilename)
          const uploadedPath = uploadResult.path
          updateProgressBar({ label: localize('drawing-to-image.progress-creating-tile'), pctFraction: 0.2 })
          await createTileFromImage(uploadedPath, left, top, width, height)
          updateProgressBar({ label: localize('drawing-to-image.progress-hiding-drawings'), pctFraction: 0.3 })
          const updates = selectedDrawings.map(drawing => {
            return {
              _id: drawing.id,
              hidden: true,
            }
          })
          await canvas.scene.updateEmbeddedDocuments('Drawing', updates)
          stopProgressBar({ label: localize('drawing-to-image.progress-done-hiding-drawings') })
        },
      },
    ],
  })
}

/**
 * Hook into the Drawing toolbar and add a button for conversion of drawings
 */
export const addConvertDrawingsButton = (controls) => {
  if (!getSetting('enable-convert-drawings-button')) return
  controls.drawings.tools.preciseDrawingTools_convertToTile = {
    name: 'preciseDrawingTools_convertToTile',
    title: localize('drawing-to-image.toolbar-title'),
    icon: 'fa-solid fa-image',
    onChange: openConvertDrawingsDialog,
    button: true,
  }
}