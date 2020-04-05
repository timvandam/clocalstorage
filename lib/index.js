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
    this.active = this.storages.get(1) // storage for current context

    Namespace.instances.set(name, this) // save this instance so we can call Namespace.getNamespace

    // Set up hooks so we can know which storage to pick
    this.hook = createHook({
      init: (asyncId, type, triggerAsyncId, resource) => {
        Namespace.triggers.set(asyncId, Namespace.getTrigger(triggerAsyncId))
      },
      before: asyncId => {
        Namespace.active.unshift(asyncId)
        const active = Namespace.getActive()
        if (!this.storages.has(active)) this.storages.set(active, new Map())
        this.active = this.storages.get(active)
      },
      after: asyncId => {
        const prev = Namespace.active.shift()
        if (!(new Set(Namespace.triggers.values()).has(prev))) this.storages.delete(prev)
        Namespace.triggers.delete(asyncId)

        const active = Namespace.getActive()
        this.active = this.storages.get(active)
      },
      promiseResolve: asyncId => {
        const prev = Namespace.active.shift()
        if (!(new Set(Namespace.triggers.values()).has(prev))) this.storages.delete(prev)
        Namespace.triggers.delete(asyncId)

        const active = Namespace.getActive()
        this.active = this.storages.get(active)
      }
    }).enable()
  }

  /**
   * Resets all namespaces
   */
  static reset () {
    Namespace.instances.forEach(namespace => {
      namespace.storages = new Map([[1, new Map()]])
      namespace.storage = namespace.storages.get(1)
    })
    Namespace.instances.clear()
    Namespace.active = [1]
    Namespace.triggers.clear()
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
   * Destroys a namespace
   * @param {any} name - The name of the namespace to get
   */
  static destroyNamespace (name) {
    Namespace.instances.delete(name)
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
   * @returns {any} the value that was set
   */
  set (property, value) {
    this.active.set(property, value)
    return value
  }

  /**
   * Fetches the value for a property
   * @param {any} property - the property to fetch the value for
   * @returns {any} the value of the property or undefined
   */
  get (property) {
    return this.active.get(property)
  }
}

Namespace.instances = new Map()
Namespace.active = [1]
Namespace.triggers = new Map()

process.namespaces = Namespace.instances

module.exports = {
  createNamespace (name) {
    return new Namespace(name)
  },
  getNamespace: Namespace.getNamespace,
  destroyNamespace: Namespace.destroyNamespace,
  reset: Namespace.reset
}
