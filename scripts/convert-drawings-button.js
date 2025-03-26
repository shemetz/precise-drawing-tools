/* MIT License   Copyright (c) 2020 KayelGee    https://github.com/KayelGee/DrawingTokenizer */

import { convertDrawingsToImage } from './canvas-pixi-utils.js'
import { getSetting } from './precise-drawing-tools.js'
import { startProgressBar, stopProgressBar, updateProgressBar } from './progress-bar.js'

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
    x: left,
    y: top,
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
  if (selectedDrawings.length <= 0) return ui.notifications.error('No drawings are selected!')
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
      <label>Image filename</label>
      <input type="text" name="filename" value="MyFoundryDrawing_${randomId}" required/>
    </div>
</div>
`

  return foundry.applications.api.DialogV2.wait({
    window: {
      title: 'Convert drawing to image',
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
        label: 'Download image',
        callback: async (_event, _button, dialog) => {
          const filename = $(dialog).find('input')[0].value.trim()
          if (filename.length === 0) {
            URL.revokeObjectURL(blobUrl)
            return ui.notifications.error('No file name entered.')
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
        label: 'Hide drawings + replace with tile',
        callback: async (_event, _button, dialog) => {
          URL.revokeObjectURL(blobUrl)
          const filename = $(dialog).find('input')[0].value.trim()
          if (filename.length === 0) {
            return ui.notifications.error('No file name entered.')
          }
          const fullFilename = filename + '.webp'

          startProgressBar({ label: 'Uploading tile image...' })
          updateProgressBar({ label: 'Uploading tile image...', pctFraction: 0.1 })
          const uploadResult = await uploadBlobToFoundry(blob, fullFilename)
          const uploadedPath = uploadResult.path
          updateProgressBar({ label: 'Creating tile...', pctFraction: 0.2 })
          await createTileFromImage(uploadedPath, left, top, width, height)
          updateProgressBar({ label: 'Hiding drawings (this may take a while)...', pctFraction: 0.3 })
          const updates = selectedDrawings.map(drawing => {
            return {
              _id: drawing.id,
              hidden: true,
            }
          })
          await canvas.scene.updateEmbeddedDocuments('Drawing', updates)
          stopProgressBar({ label: 'Done hiding drawings!' })
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
    title: 'Convert Drawings to Tile',
    icon: 'fa-solid fa-image',
    onChange: openConvertDrawingsDialog,
    button: true,
  }
}