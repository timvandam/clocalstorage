const Namespace = require('../')

const session = new Namespace('sess')
it('sets namespace properties', () => new Promise(resolve => {
  session.set('a', 'b')
  expect(Namespace.getNamespace('sess')).toEqual(session)
  expect(Namespace.getNamespace('sess').get('a')).toBe('b')
  setTimeout(() => {
    try {
      expect(session.get('a')).toBe('b')
      resolve()
    } catch (error) {
      resolve(error)
    }
  }, 1)
})
)

it('namespace properties are only available in their scope', () => {
  expect(session.get('a')).toBeUndefined()
})
