import test from 'node:test'
import assert from 'node:assert/strict'
import { compileWorkflow, WorkflowRunner } from '../src/engine/workflow.ts'

const node = (id, type = 'basic-attack', duration = 1, damage = 100, hits = 1) => ({
  id,
  type,
  data: { label: id, duration, damage, hits },
})
const edge = (source, target) => ({ source, target })
const example = () => [
  [
    node('basic'),
    node('multi', 'multi-attack', 1.5, 60, 3),
    node('extra', 'extra-damage', 0.4, 40),
    node('wait', 'wait', 0.6, 0),
  ],
  [edge('basic', 'multi'), edge('multi', 'extra'), edge('extra', 'wait')],
]

test('orders execution by connections, independently of the node array', () => {
  const [nodes, edges] = example()
  assert.deepEqual(
    compileWorkflow(nodes.reverse(), edges).map((n) => n.id),
    ['basic', 'multi', 'extra', 'wait'],
  )
})

test('settles attacks only at their due times, including individual multi hits', () => {
  const runner = new WorkflowRunner(...example())
  assert.deepEqual(runner.advance(0.9), [])
  assert.equal(runner.totalDamage, 0)
  assert.equal(runner.activeNode.id, 'basic')
  assert.equal(runner.advance(0.1)[0].damage, 100)
  assert.equal(runner.activeNode.id, 'multi')
  assert.equal(runner.advance(0.5)[0].hit, 1)
  const hits = runner.advance(1)
  assert.deepEqual(
    hits.map((hit) => [hit.hit, hit.time, hit.damage]),
    [
      [2, 2, 60],
      [3, 2.5, 60],
    ],
  )
  assert.equal(runner.advance(0.4)[0].damage, 40)
  assert.equal(runner.activeNode.id, 'wait')
  assert.equal(runner.totalDamage, 320)
  assert.deepEqual(runner.advance(0.6), [])
  assert.equal(runner.completedCycles, 1)
  assert.equal(runner.activeNode.id, 'basic')
  assert.equal(runner.hitCount, 5)
  assert.ok(Math.abs(runner.elapsed - 3.5) < 1e-9)
})

test('carries time across nodes and cycles without losing or duplicating damage', () => {
  const runner = new WorkflowRunner(...example())
  const events = runner.advance(8)
  assert.equal(runner.completedCycles, 2)
  assert.equal(runner.totalDamage, 740)
  assert.equal(runner.hitCount, 11)
  assert.equal(runner.activeNode.id, 'multi')
  assert.ok(Math.abs(runner.nodeElapsed) < 1e-9)
  assert.deepEqual(
    events.map((e) => e.id),
    Array.from({ length: 11 }, (_, i) => i + 1),
  )
  assert.deepEqual(
    events.map((e) => e.cycle),
    [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
  )
})

test('small frame increments produce the same outcome as a single advance', () => {
  const batched = new WorkflowRunner(...example())
  const framed = new WorkflowRunner(...example())
  batched.advance(35)
  for (let i = 0; i < 2100; i++) framed.advance(1 / 60)
  assert.equal(framed.totalDamage, batched.totalDamage)
  assert.equal(framed.hitCount, 50)
  assert.equal(framed.completedCycles, 10)
  assert.equal(framed.activeNode.id, batched.activeNode.id)
  assert.ok(Math.abs(framed.elapsed - 35) < 1e-8)
})

test('a single attack loops; zero-damage nodes and waits consume time without hits', () => {
  const single = new WorkflowRunner([node('single')], [])
  assert.equal(single.advance(3).length, 3)
  assert.equal(single.completedCycles, 3)
  const runner = new WorkflowRunner(
    [node('zero', 'multi-attack', 1, 0, 3), node('attack')],
    [edge('zero', 'attack')],
  )
  assert.deepEqual(runner.advance(1), [])
  assert.equal(runner.elapsed, 1)
  assert.equal(runner.advance(1).length, 1)
})

test('copies configuration for a stable run and ignores invalid time increments', () => {
  const nodes = [node('attack')]
  const runner = new WorkflowRunner(nodes, [])
  nodes[0].data.damage = 999
  for (const value of [-1, 0, NaN, Infinity]) assert.deepEqual(runner.advance(value), [])
  assert.equal(runner.elapsed, 0)
  assert.equal(runner.advance(1)[0].damage, 100)
})

test('rejects empty, disconnected, branched, merged, cyclic and dangling workflows', () => {
  assert.throws(() => compileWorkflow([], []), /添加/)
  assert.throws(() => compileWorkflow([node('a'), node('a')], []), /重复/)
  assert.throws(() => compileWorkflow([node('a'), node('b')], []), /起点/)
  const nodes = [node('a'), node('b'), node('c')]
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'b'), edge('a', 'c')]), /单条/)
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'c'), edge('b', 'c')]), /单条/)
  assert.throws(() => compileWorkflow([node('a')], [edge('a', 'a')]), /自身/)
  assert.throws(
    () => compileWorkflow(nodes, [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]),
    /起点/,
  )
  assert.throws(() => compileWorkflow(nodes, [edge('b', 'c'), edge('c', 'b')]), /环路/)
  assert.throws(() => compileWorkflow(nodes, [edge('a', 'missing')]), /不存在/)
})

test('rejects unsupported types, invalid parameters and flows without damage', () => {
  for (const duration of [0, -1, 31, NaN, Infinity]) {
    assert.throws(() => compileWorkflow([node('a', 'basic-attack', duration)], []), /参数/)
  }
  for (const damage of [-1, 100001, NaN, Infinity]) {
    assert.throws(() => compileWorkflow([node('a', 'basic-attack', 1, damage)], []), /参数/)
  }
  for (const hits of [0, 21, 1.5, NaN]) {
    assert.throws(() => compileWorkflow([node('a', 'multi-attack', 1, 10, hits)], []), /参数/)
  }
  assert.throws(() => compileWorkflow([node('a', 'unknown')], []), /不支持/)
  assert.throws(() => compileWorkflow([node('a', 'wait', 1, 0)], []), /伤害/)
})
