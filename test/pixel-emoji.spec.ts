import { describe, expect, it } from 'vitest'
import { pixelizeEmoji } from '../src/display/pixel-emoji.ts'

describe('pixel emoji normalization', () => {
  it('replaces colored emoji sequences with monochrome pixel-font text', () => {
    expect(pixelizeEmoji('✅ Done ❌ failed ⚠️ check 📁 src 👍🏽')).toBe('☑ Done × failed [!] check [DIR] src +1')
    expect(pixelizeEmoji('unknown 🧪 and flag 🇭🇰')).toBe('unknown ◇ and flag [FLAG]')
  })

  it('leaves ordinary CJK, paths, and punctuation unchanged', () => {
    const text = '已生成：/Users/test/图片.svg。'
    expect(pixelizeEmoji(text)).toBe(text)
  })
})
