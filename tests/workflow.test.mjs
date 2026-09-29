import test from 'node:test'
import assert from 'node:assert/strict'
import { compileWorkflow, connectionError, WorkflowRunner } from '../src/engine/workflow.ts'

const node = (id, type = 'basic-attack', duration = 1, damage = 100, hits = 1) => ({
  id,
  type,
  data: { label: id, duration, damage, hits },
})
const output = () => node('out', 'output', 0.2, 0)
const edge = (source, target) => ({ source, target })
const chain = (nodes) => [
  [...nodes, output()],
  nodes.map((n, i) => edge(n.id, nodes[i + 1]?.id ?? 'out')),
]
const example = () =>
  chain([
    node('basic'),
    node('multi', 'multi-attack', 1.5, 60, 3),
    node('extra', 'extra-damage', 0.4, 40),
    node('wait', 'wait', 0.6, 0),
  ])
const critical = (id) => node(id, 'critical', 0.1, 0)
const damageOnly = (events) => events.filter((event) => event.kind === 'damage')
const critOnly = (events) => events.filter((event) => event.kind === 'critical')
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

test('orders execution by connections and always ends at output', () => {
  const [nodes, edges] = example()
  assert.deepEqual(
    compileWorkflow(nodes.reverse(), edges).map((n) => n.id),
    ['basic', 'multi', 'extra', 'wait', 'out'],
  )
})

test('settles timed hits and waits for output completion before looping', () => {
  const runner = new WorkflowRunner(...example())
  assert.deepEqual(runner.advance(0.9), [])
  assert.equal(runner.totalDamage, 0)
  assert.equal(runner.advance(0.1)[0].damage, 100)
  assert.equal(runner.activeNode.id, 'multi')
  assert.equal(runner.advance(0.5)[0].hit, 1)
  assert.deepEqual(
    runner.advance(1).map((h) => [h.hit, h.time, h.damage]),
    [
      [2, 2, 60],
      [3, 2.5, 60],
    ],
  )
  assert.equal(runner.advance(0.4)[0].damage, 40)
  assert.equal(runner.activeNode.id, 'wait')
  assert.deepEqual(runner.advance(0.6), [])
  assert.equal(runner.activeNode.id, 'out')
  assert.equal(runner.completedCycles, 0)
  assert.equal(runner.totalDamage, 320)
  assert.deepEqual(runner.advance(0.2), [])
  assert.equal(runner.completedCycles, 1)
  assert.equal(runner.activeNode.id, 'basic')
  assert.equal(runner.hitCount, 5)
  close(runner.elapsed, 3.7)
})

test('carries time across multiple nodes and output boundaries without duplicate hits', () => {
  const runner = new WorkflowRunner(...example())
  const events = runner.advance(8.4)
  assert.equal(runner.completedCycles, 2)
  assert.equal(runner.totalDamage, 740)
  assert.equal(runner.hitCount, 11)
  assert.equal(runner.activeNode.id, 'multi')
  close(runner.nodeElapsed, 0)
  assert.deepEqual(
    events.map((e) => e.id),
    Array.from({ length: 11 }, (_, i) => i + 1),
  )
  assert.deepEqual(
    events.map((e) => e.cycle),
    [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
  )
})

test('frame increments and a single advance produce the same outcome', () => {
  const batched = new WorkflowRunner(...example())
  const framed = new WorkflowRunner(...example())
  batched.advance(37)
  for (let i = 0; i < 2220; i++) framed.advance(1 / 60)
  assert.equal(framed.totalDamage, batched.totalDamage)
  assert.equal(framed.hitCount, 50)
  assert.equal(framed.completedCycles, 10)
  assert.equal(framed.activeNode.id, batched.activeNode.id)
  close(framed.elapsed, 37)
})

test('allows branches, merges and multiple roots, executing each node once before output', () => {
  const nodes = [node('1'), node('2'), node('3'), node('4'), output()]
  const edges = [edge('1', '2'), edge('1', '3'), edge('2', '4'), edge('3', '4'), edge('4', 'out')]
  assert.deepEqual(
    compileWorkflow([...nodes].reverse(), edges).map((n) => n.id),
    ['1', '2', '3', '4', 'out'],
  )
  const runner = new WorkflowRunner(nodes, edges)
  assert.equal(runner.advance(4.2).length, 4)
  assert.equal(runner.totalDamage, 400)
  assert.equal(runner.completedCycles, 1)
  const roots = new WorkflowRunner(
    [node('2'), output(), node('1')],
    [edge('1', 'out'), edge('2', 'out')],
  )
  assert.deepEqual(
    roots.sequence.map((n) => n.id),
    ['1', '2', 'out'],
  )
  assert.equal(roots.advance(2.2).length, 2)
  assert.equal(roots.completedCycles, 1)
})

test('requires exactly one output, all paths connected to it, with no outgoing edges', () => {
  assert.throws(() => compileWorkflow([], []), /输出/)
  assert.throws(() => compileWorkflow([node('a')], []), /有且只有一个输出/)
  assert.throws(
    () => compileWorkflow([node('a'), output(), node('other', 'output')], []),
    /有且只有一个输出/,
  )
  assert.throws(
    () => compileWorkflow([node('a'), node('b'), output()], [edge('a', 'out')]),
    /没有通向输出/,
  )
  assert.throws(() => compileWorkflow([node('a'), output()], [edge('out', 'a')]), /唯一终点/)
  assert.throws(() => compileWorkflow([node('a'), node('a'), output()], []), /重复/)
})

test('rejects cycles even when a branch from the cycle reaches output, duplicates and dangling edges', () => {
  const nodes = [node('a'), node('b'), node('c'), output()]
  assert.throws(
    () =>
      compileWorkflow(nodes, [edge('a', 'b'), edge('b', 'c'), edge('c', 'a'), edge('c', 'out')]),
    /环路/,
  )
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'a')]), /自身/)
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'missing')]), /不存在/)
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'b'), edge('a', 'b')]), /重复/)
})

test('connection validation supports fan-in/out while preventing every cyclic path', () => {
  const nodes = [node('a'), node('b'), node('c'), node('d'), output()]
  const edges = [edge('a', 'b'), edge('a', 'c'), edge('c', 'd'), edge('d', 'out')]
  assert.equal(connectionError(nodes, edges, 'b', 'out'), '')
  assert.equal(connectionError(nodes, edges, 'b', 'd'), '')
  assert.match(connectionError(nodes, edges, 'd', 'a'), /环路/)
  assert.match(connectionError(nodes, edges, 'out', 'a'), /唯一终点/)
  assert.match(connectionError(nodes, edges, 'a', 'a'), /自身/)
  assert.match(connectionError(nodes, edges, 'a', 'b'), /已存在/)
  assert.match(connectionError(nodes, edges, 'a', 'missing'), /不存在/)
})

test('validates parameters and requires a real damage node', () => {
  for (const duration of [0, -1, 31, NaN, Infinity])
    assert.throws(() => compileWorkflow(...chain([node('a', 'basic-attack', duration)])), /参数/)
  for (const damage of [-1, 100001, NaN, Infinity])
    assert.throws(() => compileWorkflow(...chain([node('a', 'basic-attack', 1, damage)])), /参数/)
  for (const hits of [0, 21, 1.5, NaN])
    assert.throws(() => compileWorkflow(...chain([node('a', 'multi-attack', 1, 10, hits)])), /参数/)
  assert.throws(() => compileWorkflow(...chain([node('a', 'unknown')])), /不支持/)
  assert.throws(() => compileWorkflow(...chain([node('a', 'critical', 1, 999)])), /伤害/)
  assert.throws(() => compileWorkflow(...chain([node('a', 'wait', 1, 999)])), /伤害/)
})

test('snapshot configuration and invalid time increments remain safe', () => {
  const [nodes, edges] = chain([node('attack')])
  const runner = new WorkflowRunner(nodes, edges)
  nodes[0].data.damage = 999
  for (const value of [-1, 0, NaN, Infinity]) assert.deepEqual(runner.advance(value), [])
  assert.equal(runner.elapsed, 0)
  assert.equal(runner.advance(1)[0].damage, 100)
})

test('critical rolls occur exactly at node completion; failure adds five percentage points', () => {
  let rolls = 0
  const runner = new WorkflowRunner(...chain([critical('crit'), node('attack')]), () => {
    rolls++
    return 0
  })
  assert.deepEqual(runner.advance(0.05), [])
  assert.equal(rolls, 0)
  const result = runner.advance(0.05)[0]
  assert.equal(result.kind, 'critical')
  assert.equal(result.success, false) // Random 0 must still fail at a 0% chance.
  assert.equal(result.chanceBefore, 0)
  assert.equal(result.chanceAfter, 5)
  assert.equal(runner.critChance, 5)
  assert.equal(runner.hitCount, 0)
  assert.equal(runner.totalDamage, 0)
  runner.advance(0.5)
  assert.equal(rolls, 1)
})

test('chance persists over output and success resets it, doubling only the next hit', () => {
  const runner = new WorkflowRunner(
    ...chain([critical('crit'), node('multi', 'multi-attack', 0.3, 60, 3)]),
    () => 0,
  )
  const first = runner.advance(0.6)
  assert.equal(runner.critChance, 5)
  assert.equal(runner.completedCycles, 1)
  assert.deepEqual(
    damageOnly(first).map((e) => e.damage),
    [60, 60, 60],
  )
  const second = runner.advance(0.1)
  assert.equal(second[0].success, true)
  assert.equal(runner.critChance, 0)
  assert.equal(runner.criticalReady, true)
  const hits = damageOnly(runner.advance(0.3))
  assert.deepEqual(
    hits.map((e) => [e.damage, e.critical]),
    [
      [120, true],
      [60, false],
      [60, false],
    ],
  )
  assert.equal(runner.criticalReady, false)
  assert.equal(runner.criticalHits, 1)
  assert.equal(runner.hitCount, 6)
  assert.equal(runner.totalDamage, 420)
})

test('100% is a guaranteed critical after twenty failures, and resets to zero', () => {
  const runner = new WorkflowRunner(
    ...chain([critical('crit'), node('hit', 'basic-attack', 0.1)]),
    () => 0.999999,
  )
  const failures = critOnly(runner.advance(8))
  assert.equal(failures.length, 20)
  assert.deepEqual(
    failures.map((e) => e.chanceAfter),
    Array.from({ length: 20 }, (_, i) => (i + 1) * 5),
  )
  assert.equal(runner.critChance, 100)
  const success = runner.advance(0.1)[0]
  assert.equal(success.success, true)
  assert.equal(success.chanceBefore, 100)
  assert.equal(runner.critChance, 0)
  assert.equal(runner.criticalReady, true)
  assert.equal(runner.advance(0.1)[0].damage, 200)
})

test('rolls use the strict probability boundary before increasing the chance', () => {
  const runner = new WorkflowRunner(
    ...chain([critical('crit'), node('hit', 'basic-attack', 0.1)]),
    () => 0.05,
  )
  runner.advance(0.4)
  const atFive = runner.advance(0.1)[0]
  assert.equal(atFive.chanceBefore, 5)
  assert.equal(atFive.success, false) // roll == chance is not a success.
  assert.equal(atFive.chanceAfter, 10)
  runner.advance(0.3)
  assert.equal(runner.advance(0.1)[0].success, true)
})

test('shared chance accumulates across critical nodes, with no stacking or loss on failed rolls', () => {
  const runner = new WorkflowRunner(
    ...chain([
      critical('a'),
      critical('b'),
      critical('c'),
      critical('d'),
      critical('e'),
      node('wait', 'wait', 0.1, 999),
      node('zero', 'basic-attack', 0.1, 0),
      node('hit', 'extra-damage', 0.1, 40),
    ]),
    () => 0,
  )
  const rolls = critOnly(runner.advance(0.5))
  assert.deepEqual(
    rolls.map((e) => e.success),
    [false, true, false, true, false],
  )
  assert.equal(runner.critChance, 5)
  assert.equal(runner.criticalReady, true)
  assert.deepEqual(runner.advance(0.2), []) // wait and zero-damage never consume the buff.
  assert.equal(runner.criticalReady, true)
  assert.equal(runner.advance(0.1)[0].damage, 80) // x2, not x4.
  assert.equal(runner.criticalReady, false)
  assert.equal(runner.hitCount, 1)
})

test('unconsumed critical effect persists across output into the next round', () => {
  const runner = new WorkflowRunner(
    ...chain([node('attack', 'basic-attack', 0.1), critical('crit')]),
    () => 0,
  )
  runner.advance(0.8)
  assert.equal(runner.completedCycles, 2)
  assert.equal(runner.criticalReady, true)
  assert.equal(runner.critChance, 0)
  assert.equal(runner.advance(0.1)[0].damage, 200)
  assert.equal(runner.criticalReady, false)
})

test('batched and framed critical simulations agree, with unique event IDs and accurate counts', () => {
  const setup = () =>
    new WorkflowRunner(...chain([critical('crit'), node('hit', 'basic-attack', 0.1)]), () => 0)
  const batched = setup()
  const framed = setup()
  const events = batched.advance(4)
  const framedEvents = []
  for (let i = 0; i < 400; i++) framedEvents.push(...framed.advance(0.01))
  assert.deepEqual(
    events.map((e) => [e.id, e.kind, e.damage]),
    framedEvents.map((e) => [e.id, e.kind, e.damage]),
  )
  assert.equal(new Set(events.map((e) => e.id)).size, events.length)
  assert.equal(framed.totalDamage, 1500)
  assert.equal(framed.hitCount, 10)
  assert.equal(framed.criticalHits, 5)
  assert.equal(framed.completedCycles, 10)
  assert.equal(framed.critChance, 0)
  const fresh = setup()
  assert.equal(fresh.critChance, 0)
  assert.equal(fresh.criticalReady, false)
  assert.equal(fresh.criticalHits, 0)
})
