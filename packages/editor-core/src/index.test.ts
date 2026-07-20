import { describe, expect, it } from 'vitest'
import { createIdentities, createProject, replaceCommentCount, replaceLikeCount } from './index'

describe('editor core', () => {
  it('creates unique identities up to the like limit', () => {
    const identities = createIdentities(100, 100)
    expect(identities).toHaveLength(100)
    expect(new Set(identities.map((item) => item.nickname)).size).toBe(100)
  })

  it('clamps likes and comments to product limits', () => {
    const project = createProject()
    const target = project.posts.find((post) => post.id === project.targetPostId)!
    expect(replaceLikeCount(target, 120).likers).toHaveLength(100)
    expect(replaceCommentCount(target, 20).comments).toHaveLength(8)
  })
})
