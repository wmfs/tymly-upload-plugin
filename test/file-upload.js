/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const fs = require('fs')
const expect = require('chai').expect

const UPLOAD_FILE_STATE_MACHINE = 'tymly_uploadFile_1_0'
const fileName = 'fixtures/test_file.txt'
const FILEPATH = path.resolve(__dirname, fileName)
let fileModel, fileId, statebox, tymlyService, base64

describe('file upload tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('should create some basic tymly services', done => {
    tymly.boot(
      {
        pluginPaths: [
          path.resolve(__dirname, './../lib')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        statebox = tymlyServices.statebox
        tymlyService = tymlyServices.tymly
        fileModel = tymlyServices.storage.models['tymly_files']
        done()
      }
    )
  })

  it('read the file in so we can pass it on', async () => {
    base64 = fs.readFileSync(FILEPATH).toString('base64')
  })

  it('should start the state machine to get file Upload data', async () => {
    const execDesc = await statebox.startExecution(
      { base64, fileName },
      UPLOAD_FILE_STATE_MACHINE,
      { sendResponse: 'COMPLETE', userId: 'test-user' }
    )

    expect(execDesc.currentStateName).to.eql('UploadFile')
    expect(execDesc.currentResource).to.eql('module:uploadFile')
    expect(execDesc.stateMachineName).to.eql(UPLOAD_FILE_STATE_MACHINE)
    expect(execDesc.status).to.eql('SUCCEEDED')
    expect(execDesc.ctx.fileName).to.eql(fileName)

    fileId = execDesc.ctx.fileId
  })

  it('should check that the file has been uploaded', async () => {
    const doc = await fileModel.findById(fileId)

    expect(doc.fileName).to.eql(fileName)
    expect(doc.id).to.eql(fileId)
    expect(doc.createdBy).to.eql('test-user')
  })

  it('should start the state machine without any file name', async () => {
    const execDesc = await statebox.startExecution(
      {},
      UPLOAD_FILE_STATE_MACHINE,
      { sendResponse: 'COMPLETE', userId: 'test-user' }
    )

    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorCode).to.eql('No fileName on input')
  })

  it('should start the state machine without any base64', async () => {
    const execDesc = await statebox.startExecution(
      { fileName },
      UPLOAD_FILE_STATE_MACHINE,
      { sendResponse: 'COMPLETE', userId: 'test-user' }
    )

    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorCode).to.eql('No base64 on input')
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
