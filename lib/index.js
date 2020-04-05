const { createHook } = require('async_hooks')

/**
 * Class that represents a named container, containing data based on the context in which it is invoked
 */
class Namespace {
  /**
   * Constructs a Aamespace
   * @param {any} name - whatever you want to call your namespace
   */
  constructor (name) {
    // Invoke a default storage, 1 should be the asyncId of the root of the code
    this.storages = new Map([[1, new Map()]]) // store storages for all contexts
    this.storage = this.storages.get(1) // storage for current context

    Namespace.instances.set(name, this) // save this instance so we can call Namespace.getNamespace

    // Set up hooks so we can know which storage to pick
    createHook({
      init: (asyncId, type, triggerAsyncId, resource) => {
        Namespace.triggers.set(asyncId, Namespace.getTrigger(triggerAsyncId))
      },
      before: asyncId => {
        Namespace.active.unshift(asyncId)
        const active = Namespace.getActive()
        if (!this.storages.has(active)) this.storages.set(active, new Map())
        this.storage = this.storages.get(active)
      },
      after: asyncId => {
        const prev = Namespace.active.shift()
        if (!(new Set(Namespace.triggers.values()).has(prev))) this.storages.delete(prev)
        Namespace.triggers.delete(asyncId)

        const active = Namespace.getActive()
        this.storage = this.storages.get(active)
      },
      promiseResolve: asyncId => {
        const prev = Namespace.active.shift()
        if (!(new Set(Namespace.triggers.values()).has(prev))) this.storages.delete(prev)
        Namespace.triggers.delete(asyncId)

        const active = Namespace.getActive()
        this.storage = this.storages.get(active)
      }
    }).enable()
  }

  /**
   * Gets a Namespace by its name
   * @param {any} name - The name of the namespace to get
   * @returns {Namespace|undefined} the requested Namespace or undefined if it does not exist
   */
  static getNamespace (name) {
    return Namespace.instances.get(name)
  }

  /**
   * Recursively finds the (root) trigger of an event
   * It does not just find the trigger, but the trigger of the trigger of the trigger ...
   * @param {Number} asyncId - the asyncId to find the trigger for
   * @returns {Number} the asyncId of the absolute trigger of the given asyncId
   */
  static getTrigger (asyncId) {
    const trigger = Namespace.triggers.get(asyncId)
    if (trigger === 1 || trigger === undefined) return asyncId
    return Namespace.getTrigger(trigger)
  }

  /**
   * Gets the asyncId of the active storage
   * @returns {Number} the asyncId of the storage we are currently using
   */
  static getActive () {
    return Namespace.getTrigger(Namespace.active[0]) || Namespace.active[0]
  }

  /**
   * Stores a key-value pair in this namespace's storage
   * @param {any} property - The name of the property to set
   * @param {any} value - The value to set a property to
   * @returns {Boolean} whether a value was overwritten
   */
  set (property, value) {
    const exists = this.get(property) !== undefined
    this.storage.set(property, value)
    return exists
  }

  get (property) {
    return this.storage.get(property)
  }
}

Namespace.instances = new Map()
Namespace.active = [1]
Namespace.triggers = new Map()

module.exports = Namespace
