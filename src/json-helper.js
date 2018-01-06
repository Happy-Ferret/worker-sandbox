'use strict'

import isPlainObject from 'lodash/isPlainObject'
import isString from 'lodash/isString'
import isRegExp from 'lodash/isRegExp'
import isError from 'lodash/isError'
import isFunction from 'lodash/isFunction'
import CircularJSON from 'circular-json'
import project from '../package'
import hash from 'object-hash'

const SYMBOL_KEY = hash.sha1(project)
const SYMBOL_VALUE = hash.MD5(project)

const TYPE_FUNCTION = 'type_function'
const TYPE_ERROR = 'type_error'
const TYPE_REGEXP = 'type_regexp'

function convertPathListToString(list) {
  return list.map(x => `["${ x.replace(/\"/g, '\\"') }"]`).join('')
}

function markSymbol(obj) {
  return Object.assign({}, obj, {
    [SYMBOL_KEY]: SYMBOL_VALUE
  })
}

function validateSymbol(obj) {
  return obj[SYMBOL_KEY] === SYMBOL_VALUE
}

function wrapDynamicScope(code) {
  return `(context => (function() {
    function isLegalName(name) {
      return ${ /^[_\$\w][\d\w\$_]*$/ }.test(name)
    }

    context = context || {}
    let keys, values = []
    keys = Array.from(new Set([
      ...Object.keys({
      // here
        keys
      , values
      , context
      , isLegalName
      // inside function unwrap
      , data
      , fn
      // outside function unwrap
      , SYMBOL_KEY
      , SYMBOL_VALUE
      , convertPathListToString
      , markSymbol
      , validateSymbol
      , wrapDynamicScope
      , createFunctionExpression
      , init
      , wrap
      , unwrap
      , replacer
      , reviver
      , stringify
      , parse
      })
    ])).filter(isLegalName)
    values.length = keys.length
    values.fill()
    return (
      new Function(
        ...keys
      , ${ JSON.stringify(`
        with(arguments[arguments.length - 2]) {
          return eval(${ JSON.stringify(`(${ code })`) })(...arguments[arguments.length - 1])
        }
        `) }
      )
    )(...values, context, arguments)
  }))`
}

function createFunctionExpression(fn) {
  let str = fn.toString()
  if (/{\s+\[native code\]\s+}$/.test(str)) {
    return null
  }
  if (fn.name) {
    // case for class method
    let startsWithPosition = 0
    if (str.startsWith('async ', startsWithPosition)) {
      // case for Async class method
      startsWithPosition += 'async '.length // 6
    }
    if (str.startsWith('*', startsWithPosition)) {
      // case for Generator class method
      startsWithPosition += '*'.length // 1
    }
    if (str.startsWith(fn.name, startsWithPosition)) {
      return wrapDynamicScope(`({ ${ str } })${ convertPathListToString([ fn.name ]) }`)
    }
  }
  return wrapDynamicScope(str)
}

export default function init(context) {
  function wrap(value) {
    if (isFunction(value)) {
      return {
        type: TYPE_FUNCTION
      , expression: createFunctionExpression(value)
      }
    }

    if (isError(value)) {
      return {
        type: TYPE_ERROR
      , name: value.name
      , message: value.message
      , stack: value.stack
      }
    }

    if (isRegExp(value)) {
      return {
        type: TYPE_REGEXP
      , expression: value.toString()
      }
    }
  }

  function unwrap(data) {
    if (data.type === TYPE_FUNCTION) {
      if (data.expression) {
        let fn = eval(data.expression)(context)
        return fn
      } else {
        return null
      }
    }

    if (data.type === TYPE_ERROR) {
      let err = new (window[data.name] || Error)(data.message)
      err.stack = data.stack
      return err
    }

    if (data.type === TYPE_REGEXP) {
      return eval(data.expression)
    }

    return null
  }

  function replacer(_, value) {
    let wrapped = wrap(value)
    if (isPlainObject(wrapped)) {
      return markSymbol(wrapped)
    } else {
      return value
    }
  }

  function reviver(_, value) {
    if (isPlainObject(value) && validateSymbol(value)) {
      return unwrap(value)
    } else {
      return value
    }
  }

  function stringify(value, space) {
    return CircularJSON.stringify(value, replacer, space)
  }

  function parse(text) {
    if (isString(text)) {
      return CircularJSON.parse(text, reviver)
    }
  }

  return {
    wrap
  , unwrap
  , replacer
  , reviver
  , stringify
  , parse
  }
}
