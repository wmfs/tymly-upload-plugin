/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect

const UPLOAD_FILE_STATE_MACHINE = 'tymly_uploadFile_1_0'
const FILENAME = 'fixtures/test_file.txt'
let executionName, fileService, fileId

describe('file upload tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let statebox, tymlyService

  it('should create some basic tymly services', function (done) {
    tymly.boot(
      {
        pluginPaths: [
          path.resolve(__dirname, './../lib')
        ]
      },
      function (err, tymlyServices) {
        expect(err).to.eql(null)
        statebox = tymlyServices.statebox
        tymlyService = tymlyServices.tymly
        fileService = tymlyServices.storage.models['tymly_files']
        done()
      }
    )
  })

  it('should start the state machine to get file Upload data', function (done) {
    statebox.startExecution(
      {
        fileName: 'fixtures/test_file.txt'
      },
      UPLOAD_FILE_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      },
      function (err, executionDescription) {
        expect(err).to.eql(null)
        expect(executionDescription.currentStateName).to.eql('UploadFile')
        expect(executionDescription.currentResource).to.eql('module:uploadFile')
        expect(executionDescription.stateMachineName).to.eql(UPLOAD_FILE_STATE_MACHINE)
        expect(executionDescription.status).to.eql('SUCCEEDED')

        console.log('setting fileid as ', executionDescription.ctx.ctx.fileId)

        fileId = executionDescription.ctx.ctx.fileId
        executionName = executionDescription.executionName
        done()
      }
    )
  })

  it('should await upload complete', done => {
    statebox.waitUntilStoppedRunning(
      executionName,
      (err, executionDescription) => {
        expect(executionDescription.status).to.eql('SUCCEEDED')
        expect(executionDescription.ctx.ctx.fileName).to.eql(FILENAME)
        expect(executionDescription.currentStateName).to.eql('UploadFile')
        expect(err).to.eql(null)
        done()
      }
    )
  })

  it('should check that the file has been uploaded', done => {
    fileService.findById(
      fileId,
      (err, doc) => {
        expect(err).to.eql(null)
        expect(doc.fileName).to.eql(FILENAME)
        expect(doc.id).to.eql(fileId)
        expect(doc.createdBy).to.eql('test-user')
        done()
      }
    )
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
