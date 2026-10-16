import assert from 'node:assert/strict'
import vm from 'node:vm'
import { startTheme } from '../src/lib/theme-runtime.mjs'

function fixture(hour, saved, blocked = false) {
  const root = { dataset: {}, style: {} }, listeners = {}, intervals = new Set()
  const storage = new Map(saved ? [['health-display-theme', saved]] : [])
  const document = { documentElement: root, querySelector: () => null, querySelectorAll: () => [], addEventListener: (key, fn) => { listeners[key] = fn }, removeEventListener: key => { delete listeners[key] } }
  const window = { addEventListener: document.addEventListener, removeEventListener: document.removeEventListener, dispatchEvent: () => {} }
  const context = vm.createContext({ window, document, Event: class {}, Date: class { getHours() { return hour } },
    localStorage: { getItem: key => { if (blocked) throw Error(); return storage.get(key) }, setItem: (key, value) => { if (blocked) throw Error(); storage.set(key, value) } },
    setInterval: fn => { intervals.add(fn); return fn }, clearInterval: fn => intervals.delete(fn) })
  const run = () => vm.runInContext(`(${startTheme.toString()})()`, context)
  run()
  return { root, listeners, storage, intervals, run, setHour: value => { hour = value; [...intervals][0]() }, choose: mode => listeners.click({ target: { closest: () => ({ dataset: { themeChoice: mode }, closest: () => null }) } }) }
}
for (const [hour, expected] of [[0,'dark'],[6,'dark'],[7,'light'],[18,'light'],[19,'dark'],[23,'dark']]) assert.equal(fixture(hour).root.dataset.theme, expected)
const f = fixture(12)
f.setHour(19); assert.equal(f.root.dataset.theme, 'dark')
f.choose('light'); f.setHour(23); assert.equal(f.root.dataset.theme, 'light')
assert.equal(f.storage.get('health-display-theme'), 'light')
f.choose('auto'); assert.equal(f.root.dataset.theme, 'dark')
f.setHour(7); assert.equal(f.root.dataset.theme, 'light')
f.listeners.storage({ key:'health-display-theme', newValue:'dark' }); assert.equal(f.root.dataset.theme, 'dark')
f.run(); assert.equal(f.intervals.size, 1, 'No duplicate timers after login/React strict mode')
assert.equal(fixture(12,'dark').root.dataset.theme, 'dark')
assert.equal(fixture(23,'light').root.dataset.theme, 'light')
assert.equal(fixture(12,'invalid').root.dataset.theme, 'light')
const b = fixture(12, null, true); b.choose('dark'); b.run(); assert.equal(b.root.dataset.theme, 'dark')
console.log('PASS: local time boundaries, live rollover, manual override, persistence, cross-tab sync, blocked storage and cleanup.')
