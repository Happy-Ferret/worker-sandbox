'use strict'

import { expect } from 'chai'
import { Sandbox, TimeoutError } from '../src/sandbox'

describe('Sandbox', function() {
  describe('#execute', function() {
    it('should always return undefined', async function() {
      let sandbox = new Sandbox()
        , result = await sandbox.execute('12345')
      expect(result).to.be.undefined
    })
  })

  describe('#eval', function() {
    it('should return a literal when code return a literal', async function() {
      let sandbox = new Sandbox()
        , result = await sandbox.eval('12345')
      expect(result).to.equal(12345)
    })

    it('should return a Promise when code return a Promise', async function() {
      let sandbox = new Sandbox()
        , result = await sandbox.eval('Promise.resolve(12345)')
      expect(result).to.equal(12345)
    })

    it('should return a literal when function return a literal', async function() {
      let sandbox = new Sandbox()
        , result = await sandbox.eval(function() {
            return 12345
          })
      expect(result).to.equal(12345)
    })

    it('should return new value', async function() {
      let sandbox = new Sandbox()
      await sandbox.execute('self.a = "hello world"')
      let result = await sandbox.eval('a')
      expect(result).to.equal('hello world')
    })
  })

  describe('#registerCall, #cancelCall', function() {
    it('should register a callable function', async function() {
      const x = 'HelloWorld'
      let sandbox = new Sandbox()
      await sandbox.registerCall('sayX', function() {
        return x
      })
      expect(await sandbox.eval('sayX()')).to.equal(x)
    })

    it('should cancel a callable function', async function() {
      const a = 'GoodbyeWorld'
      let sandbox = new Sandbox()
      await sandbox.registerCall('sayGoodbyeWorld', function() {
        return a
      })
      await sandbox.cancelCall('sayGoodbyeWorld')
      try {
        await sandbox.eval('sayGoodbyeWorld()')
        expect(false).to.be.true
      } catch(e) {
        expect(e instanceof ReferenceError).to.be.true
      }
    })
  })

  describe('#context, #callable', function() {
    it('should context accesible', async function() {
      let sandbox = new Sandbox()
      await sandbox.assign({
        a: 12345
      , b() {
          return 12345
        }
      , c: {
          a: 12345
        , b() {
            return 12345
          }
        }
      })
      expect(await sandbox.context.a).to.equal(12345)
      expect((await sandbox.context.b)()).to.equal(12345)
      expect(await sandbox.context.b()).to.equal(12345)
      expect(await sandbox.context.c.a).to.equal(12345)
      expect((await sandbox.context.c.b)()).to.equal(12345)
      expect(await sandbox.context.c.b()).to.equal(12345)
    })

    it('should callable get, set, delete', async function() {
      let sandbox = new Sandbox()
      try {
        sandbox.callable.num = 12345
        expect(false).to.be.true
      } catch(e) {
        expect(e instanceof TypeError).to.be.true
      }
      sandbox.callable.fn = () => 12345
      expect(await sandbox.callable.fn()).to.equal(12345)
      delete sandbox.callable.fn
      expect(await sandbox.callable.fn).to.be.undefined
    })

    it('should context call callable', async function() {
      // BUG
      let sandbox = new Sandbox()
      sandbox.callable.sayMorning = function() {
        return 'Morning'
      }
      sandbox.context.wantSayMorning = function() {
        return sayMorning()
      }
      expect(await sandbox.eval('wantSayMorning()')).to.equal('Morning')
    })
  })

  describe('#context', function() {
    it('should get, set, delete', async function() {
      let sandbox = new Sandbox()
      sandbox.context.num = 12345
      expect(await sandbox.context.num).to.equal(12345)
      delete sandbox.context.num
      expect(await sandbox.context.num).to.be.undefined
    })
  })

  describe('#set, #get, #assign, #remove', function() {
    it('should set and get a number literal', async function() {
      let sandbox = new Sandbox()
      await sandbox.set('a', 12345)
      let result = await sandbox.get('a')
      expect(result).to.equal(12345)
    })

    it('should set and get a string literal', async function() {
      let sandbox = new Sandbox()
      await sandbox.set('a', '12345')
      let result = await sandbox.get('a')
      expect(result).to.equal('12345')
    })

    it('should set and get a function', async function() {
      let sandbox = new Sandbox()
      await sandbox.set('sayHello', function() { return 'hello' })
      let fn = await sandbox.get('sayHello')
      expect(fn()).to.equal('hello')
    })

    it('should assign multiple property', async function() {
      let sandbox = new Sandbox()
      await sandbox.assign({
        a: 12345
      , b: 54321
      , c(test) {
          return test
        }
      , async d(test) {
          return test
        }
      })
      let a = await sandbox.get('a')
        , b = await sandbox.get('b')
        , c = await sandbox.get('c')
        , d = await sandbox.get('d')
      expect(a).to.equal(12345)
      expect(b).to.equal(54321)
      expect(c(12345)).to.equal(12345)
      expect(await d(54321)).to.equal(54321)
    })

    it('should remove property', async function() {
      let sandbox = new Sandbox()
      await sandbox.set('a', '12345')
      await sandbox.remove('a')
      let result = await sandbox.get('a')
      expect(result).to.be.undefined
    })
  })

  describe('#call', function() {
    it('should return value', async function() {
      let sandbox = new Sandbox()
      await sandbox.set('a', function(value) {
        return value
      })
      let result = await sandbox.call('a', 12345)
      expect(result).to.equal(12345)
    })
  })

  describe('#destroy', function() {
    it('should destroy worker', async function() {
      let sandbox = new Sandbox()
      expect(sandbox.destroy()).to.equal(true)
      expect(sandbox._worker).to.be.null
      expect(sandbox.destroy()).to.equal(false)
    })
  })

  describe('#addEventListener, #removeEventListener, #dispatchEvent', function() {
    it('should trigger error event', function(done) {
      let sandbox = new Sandbox()
      sandbox.addEventListener('error', function({ detail }) {
        expect(detail instanceof Error).to.be.true
        expect(detail.message).to.equal('too young to die')
        done()
      })
      sandbox.dispatchEvent(new CustomEvent('error', {
        detail: new Error('too young to die')
      }))
    })

    it('should remove the always-fail listenner', function() {
      let sandbox = new Sandbox()
      function alwaysFail() {
        expect(false).to.be.true
      }
      sandbox.addEventListener('error', alwaysFail)
      sandbox.removeEventListener('error', alwaysFail)
      sandbox.dispatchEvent(new CustomEvent('error', {
        detail: new Error('too young to die')
      }))
    })
  })
})
