const { createHook, triggerAsyncId, executionAsyncId, executionAsyncResource, AsyncLocalStorage } = require('async_hooks')

const STORE = Symbol('store')

class Namespace {
  constructor (name) {
    Namespace.instances[name] = this
    this.localStorage = new AsyncLocalStorage()
  }

  get active () {
    const trigger = triggerAsyncId()
    const resource = executionAsyncResource()
    if (!resource[STORE]) resource[STORE] = new Map()
    this.localStorage.enterWith(resource[STORE])
    return this.localStorage.getStore()
  }

  set (prop, value) {
    this.active.set(prop, value)
    return value
  }

  get (prop) {
    return this.active.get(prop)
  }
}

Namespace.instances = {}

const ns = new Namespace()
setTimeout(() => {
  ns.set('a', 'b')
  console.log(ns.get('a'))
  next()
})
setTimeout(() => console.log(ns.get('a')), 100)
function next () {
  console.log(ns.get('a'))
}
