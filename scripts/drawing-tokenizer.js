/* MIT License   Copyright (c) 2020 KayelGee    https://github.com/KayelGee/DrawingTokenizer */

const TODO_LANGUAGE_STRINGS = {
  'DRAWINGTOKENIZER.error.NoDrawingsSelected': 'No drawings are selected!',
  'DRAWINGTOKENIZER.error.NoFilenameEntered': 'You did not enter a filename! Drawing was not saved.',
  'DRAWINGTOKENIZER.ConvertToImage': 'Convert Drawing to Image',
}

const IS_WEBP_EXPORT_SUPPORTED = document.createElement('canvas').toDataURL('image/webp').includes('data:image/webp')

const initialize = () => {
  (async () => {
    createUploadDirectory()
  })().catch(e => {
    console.log('DrawingTokenizer | ' + e.message)
  })
}

const getWorldPath = () => {
  return 'worlds/' + game.world.id
}

const getUploadPath = () => {
  return 'worlds/' + game.world.id + '/DrawingTokenizerData'
}

/**
 * Convert the selected drawings to an png image
 */
const convertDrawing = async (filename, drawings, type, quality) => {
  let container = new PIXI.Container()
  const savedGridVisibility = canvas.grid.visible

  //Deactivate the grid
  canvas.grid.visible = false

  //canvas.drawings.releaseAll();
  //Copy all drawings into a PIXI Container
  for (let i = 0; i < drawings.length; i++) {
    container.addChild(drawings[i].shape.clone())
    container.children[i].transform = drawings[i].shape.transform
    //await container.children[i].draw();
  }
  switch (type) {
    case 'image/png':
      filename += '.png'
      break
    case 'image/jpeg':
      filename += '.jpeg'
      break
    case 'image/webp':
      filename += '.webp'
      break
  }
  await convertContainerToBlobAndUpload(container, filename, type, quality)

  //Reactivate the grid
  canvas.grid.visible = savedGridVisibility

  container.destroy({ children: true })
}

const convertContainerToBlobAndUpload = async (container, fileName, type, quality) => {
  return uploadToFoundry(getContainerBlob(container, type, quality), fileName)
}

/**
 * Convert canvas to Blob
 */
const getContainerBlob = (container, type, quality) => {
  return new Promise(function (resolve, reject) {
    (async () => {
      let img = await canvas.app.renderer.extract.image(container, type, quality)
      console.log(img.src)
      fetch(img.src).then(res => res.blob()).then(blob => {
        resolve(blob)
      })
    })()
  })
}

/**
 * Upload blob to foundry
 */
const uploadToFoundry = async (data, filename) => {
  // Create the form data to post
  const fd = new FormData()
  const path = getUploadPath()
  let test = await data
  fd.set('source', 'data')
  fd.set('target', path)
  fd.set('upload', test, filename)

  // Dispatch the request
  const request = await fetch('/upload', { method: 'POST', body: fd })
  if (request.status === 413) {
    return ui.notifications.error(game.i18n.localize('FILES.ErrorTooLarge'))
  } else if (request.status !== 200) {
    return ui.notifications.error(game.i18n.localize('FILES.ErrorSomethingWrong'))
  }

  // Retrieve the server response
  const response = await request.json()
  if (response.error) {
    ui.notifications.error(response.error)
    return false
  } else if (response.message) {
    if (/^(modules|systems)/.test(response.path)) {
      ui.notifications.warn(game.i18n.localize('FILES.WarnUploadModules'))
    }
    ui.notifications.info(response.message)
  }
  return response
}

/**
 * Create the default Upload directory
 */
const createUploadDirectory = async () => {
  const options = {}
  const source = 'data'
  let target = getWorldPath()

  let files = await FilePicker.browse(source, target, options)
  let DirExists = false
  target = getUploadPath()
  files.dirs.forEach(dir => {
    DirExists = DirExists || dir === target
  })
  if (!DirExists) {
    await FilePicker.createDirectory(source, target, options)
  }
}

/**
 * Hook into the Drawing toolbar and add a button for conversion of drawings
 */
const _getControlButtons = (controls) => {
  for (let i = 0; i < controls.length; i++) {
    if (controls[i].name === 'drawings') {
      controls[i].tools.push({
        name: 'DTtoImage',
        title: game.i18n.localize('DRAWINGTOKENIZER.ConvertToImage'),
        icon: 'fas fa-image',
        visible: game.user.isGM,
        onClick: () => _convertDrawingDialog(),
        button: true,
      })
    }

  }
  console.log('DrawingTokenizer | Tool added.')
}

/**
 * Present the user with a dialog to convert a drawing to an image.
 */
const _convertDrawingDialog = () => {
  if (Object.keys(canvas.drawings.controlled).length <= 0) return ui.notifications.error(
    game.i18n.localize('DRAWINGTOKENIZER.error.NoDrawingsSelected'))
  const selectedDrawings = canvas.drawings.controlled
  const WebPText = IS_WEBP_EXPORT_SUPPORTED ? 'WebP' : 'WebP(Unsupported by your browser)'
  let form = `<form><div class="form-group-stacked">
    <div class="form-group">
      <label>Image filename</label>
      <input type="text" name="filename" placeholder="drawing-name" required/>
    </div>
    <div class="form-group">
      <label>Image type</label>
      <select name="type">
        <option value="image/png" selected="selected">Png</option>
        <option value="image/webp">${WebPText}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Image Quality 0-1(for WebP only)</label>
      <input type="text" name="quality" placeholder="0.92"/>
    </div>
    </div></form>`

  return Dialog.confirm({
    title: 'Convert drawing to image',
    content: form,
    yes: html => {
      const filename = html.find('input')[0].value
      let type = html.find('select')[0].value
      let quality = html.find('input')[1].value
      try {
        quality = parseFloat(quality)
      } catch (error) {
        quality = 0.92
      }
      if (isNaN(quality)) quality = 0.92
      if (quality < 0) quality = 0
      if (quality > 1) quality = 1

      if (!IS_WEBP_EXPORT_SUPPORTED) {
        type = 'image/png'
      }
      if (filename.trim().length == 0) return ui.notifications.error(
        game.i18n.localize('DRAWINGTOKENIZER.error.NoFilenameEntered'))

      convertDrawing(filename, selectedDrawings, type, quality)
    },
  })
}

Hooks.on('getSceneControlButtons', (controls) => _getControlButtons(controls))
Hooks.once('canvasReady', () => initialize())