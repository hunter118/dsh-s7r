const PIXEL_SYMBOLS: Readonly<Record<string, string>> = {
  '✅': '☑', '✔': '√', '☑': '☑', '❌': '×', '❎': '⊠', '✖': '×',
  '⚠': '[!]', 'ℹ': '[i]', '⭐': '*', '✨': '*', '🔥': '*', '🎉': '*',
  '📁': '[DIR]', '📂': '[DIR]', '📄': '[DOC]', '📝': '[NOTE]', '📎': '[ATT]',
  '🖼': '[IMG]', '🔗': '[LINK]', '💡': '[TIP]', '🚀': '↑', '🔍': '[FIND]',
  '👍': '+1', '👎': '-1', '❤️': '<3', '❤': '<3', '💔': '</3',
  '🙂': ':)', '😊': ':)', '😀': ':D', '😄': ':D', '😂': ':D', '😢': ':(',
  '😭': ':(', '😞': ':(', '😕': ':/', '🤔': ':?', '😉': ';)', '😎': 'B)',
  '🙏': '[THANKS]', '👏': '[CLAP]', '👋': '[WAVE]',
}

const EMOJI_SEQUENCE = /\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\p{Emoji_Modifier})?)*/gu
const FLAG_SEQUENCE = /\p{Regional_Indicator}{2}/gu

export function pixelizeEmoji(text: string): string {
  return text
    .replace(EMOJI_SEQUENCE, sequence => {
      const plain = sequence.replace(/[\uFE0E\uFE0F]/g, '').replace(/\p{Emoji_Modifier}/gu, '')
      return PIXEL_SYMBOLS[plain] ?? PIXEL_SYMBOLS[[...plain][0] ?? ''] ?? '◇'
    })
    .replace(FLAG_SEQUENCE, '[FLAG]')
}
