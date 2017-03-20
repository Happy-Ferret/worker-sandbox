'use strict'

import { MessageSystem, PERMISSIONS } from '../src/message-system'
import { expect } from 'chai'

self.window = self

let messenger = new MessageSystem(self, {
  sayGoodbye() {
    return 'Goodbye'
  }
}, [
  PERMISSIONS.SEND_ASSIGN
, PERMISSIONS.SEND_EVAL
, PERMISSIONS.SEND_CALL
, PERMISSIONS.SEND_ACCESS
, PERMISSIONS.SEND_REMOVE
, PERMISSIONS.SEND_REGISTER
, PERMISSIONS.RECEIVE_CALL
])

async function testPermissions() {
  try {
    await messenger.sendEvalMessage()
  } catch(e) {
    try {
      await messenger.sendCallMessage()
    } catch(e) {
      try {
        await messenger.sendRegisterMessage()
      } catch(e) {
        try {
          await messenger.sendAssignMessage()
        } catch(e) {
          try {
            await messenger.sendAccessMessage()
          } catch(e) {
            try {
              await messenger.sendRemoveMessage()
            } catch(e) {
              self.postMessage('ok')
            }
          }
        }
      }
    }
  }
}

async function testReceiveMessages() {
  expect(await messenger.sendEvalMessage('12345')).to.equal(12345)
  expect(await messenger.sendCallMessage('sayHello')).to.equal('Hello')
  await messenger.sendRegisterMessage('sayGoodbye')
  await messenger.sendAssignMessage('assignTest', 54321)
  expect(await messenger.sendAccessMessage('assignTest')).to.equal(54321)
  await messenger.sendRemoveMessage('assignTest')
  messenger.sendErrorMessage(new Error('just a joke'))
  self.postMessage('ok')
}

self.addEventListener('message', ({ data }) => {
  switch (data) {
    case 'PermissionsTest':
      testPermissions()
      break
    case 'ReceiveMessagesTest':
      testReceiveMessages()
      break
  }
})