'use strict'

const debug = require('debug')('tymly-upload-plugin')
const fs = require('file-system')
const Buffer = require('safe-buffer').Buffer
const fileExtension = require('file-extension')
const upath = require('upath')
const process = require('process')

class UploadFile {
  init (resourceConfig, env, callback) {
    this.files = env.bootedServices.storage.models['tymly_files']
    this.uploadDirectoryPath = process.env.TYMLY_UPLOADS_DIRECTORY_PATH || './tymly_fallback_uploads/'
    callback(null)
  }

  run (event, context) {
    if (!event.fileName) {
      return context.sendTaskFailure({
        error: 'No fileName on input',
        cause: new Error('No fileName on input')
      })
    }

    if (!event.base64) {
      return context.sendTaskFailure({
        error: 'No base64 on input',
        cause: new Error('No base64 on input')
      })
    }

    const encodedBase64String = event.base64.replace(/^data:+[a-z]+\/+[a-z]+;base64,/, '')
    const binaryData = new Buffer(encodedBase64String, 'base64')

    debug(`Upserting file '${event.fileName}'`)
    this.files
      .upsert({fileName: event.fileName}, {})
      .then(doc => {
        const filePath = `${upath.normalize(this.uploadDirectoryPath)}${doc.idProperties.id}.${fileExtension(event.fileName)}`
        debug(`Writing file '${event.fileName}' to '${filePath}'`)
        fs.writeFile(filePath, binaryData, err => {
          if (err) {
            debug(`Failed to upload '${event.fileName}'`, err)
            context.sendTaskFailure(err)
          } else {
            debug(`Upload of '${event.fileName}' was successful`)
            context.sendTaskSuccess({
              fileId: doc.idProperties.id,
              fileName: event.fileName
            })
          }
        })
      })
      .catch(err => {
        debug(`Failed to upload '${event.fileName}'`, err)
        context.sendTaskFailure(err)
      })
  }
}

module.exports = UploadFile
