/* MIT License   Copyright (c) 2020 KayelGee    https://github.com/KayelGee/DrawingTokenizer */

import { convertDrawingsToImage } from './canvas-pixi-utils.js'

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
  return FilePicker.upload(storage, filePath, file, {}, { notify: true })
}

const createTileFromImage = async (uploadedPath, left, top, width, height) => {
  const tileData = {
    x: left,
    y: top,
    width,
    height,
    texture: { src: uploadedPath },
  }
  return TileDocument.create(tileData, { parent: canvas.scene })
}

/**
 * Create the default Upload directory
 */
const createUploadDirectory = async () => {
  const options = {}
  const source = 'data'
  const files = await FilePicker.browse(source, getWorldPath(), options)
  const target = getUploadPath()
  const dirExists = files.dirs.includes(target)
  if (!dirExists) {
    await FilePicker.createDirectory(source, target, options)
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
  const formHeight = 120
  let displayedImageHeight = Math.min(height, imageMaxHeight)
  let displayedImageWidth = width * (displayedImageHeight / height)
  if (displayedImageWidth > dialogWidth - 20) {
    displayedImageWidth = dialogWidth - 20
    displayedImageHeight = height * (displayedImageWidth / width)
  }

  const randomId = foundry.utils.randomID(4)
  const form = `
<form><div class="form-group-stacked">
    <div style="display: flex; flex-direction: column; align-items: center;">
        <img src="${blobUrl}" alt="generated image" style="height: ${displayedImageHeight}px; width: ${displayedImageWidth}px"/>
    </div>
    <div class="form-group">
      <label>Image filename</label>
      <input type="text" name="filename" value="MyFoundryDrawing_${randomId}" required/>
    </div>
</div></form>
`

  new Dialog({
    title: 'Convert drawing to image',
    content: form,
    options: {
      height: 'auto',
    },
    buttons: {
      download: {
        icon: '<i class="fas fa-download"></i>',
        label: 'Download image',
        callback: async html => {
          const filename = html.find('input')[0].value.trim()
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
      uploadAndKeep: {
        icon: '<i class="fas fa-eye-slash"></i>',
        label: 'Hide drawings + replace with tile',
        callback: async html => {
          URL.revokeObjectURL(blobUrl)
          const filename = html.find('input')[0].value.trim()
          if (filename.length === 0) {
            return ui.notifications.error('No file name entered.')
          }
          const fullFilename = filename + '.webp'

          const uploadResult = await uploadBlobToFoundry(blob, fullFilename)
          const uploadedPath = uploadResult.path
          await createTileFromImage(uploadedPath, left, top, width, height)
          const updates = selectedDrawings.map(drawing => {
            return {
              _id: drawing.id,
              hidden: true,
            }
          })
          await canvas.scene.updateEmbeddedDocuments('Drawing', updates)
        },
      },
    },
  }, {
    width: dialogWidth,
    height: formHeight + displayedImageHeight,
  }).render(true)
}

/**
 * Hook into the Drawing toolbar and add a button for conversion of drawings
 */
export const addConvertDrawingsButton = (controls) => {
  for (let i = 0; i < controls.length; i++) {
    if (controls[i].name === 'drawings') {
      controls[i].tools.push({
        name: 'precise-drawing-tools_convert-to-image',
        title: 'Convert Drawings to Image',
        icon: 'fas fa-image',
        onClick: openConvertDrawingsDialog,
        button: true,
      })
    }
  }
}