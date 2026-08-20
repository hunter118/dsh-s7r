import { describe, expect, it } from 'vitest'
import { DSH_APP_STYLES } from '../src/apps/dsh/styles.ts'

describe('DSH Control Center layout', () => {
  it('uses the normal control font for every tab button', () => {
    const rule = DSH_APP_STYLES.match(/\.kd-native-tabs \.s7-button\s*\{([^}]*)\}/)?.[1]
    expect(rule).toBeDefined()
    expect(rule).not.toContain('font:')
    expect(rule).not.toContain('font-size:')
  })

  it('keeps long plugin inventory content inside the scroll body', () => {
    expect(DSH_APP_STYLES).toMatch(/\.kd-native-tabs[^}]*flex: 0 0 auto/)
    expect(DSH_APP_STYLES).toMatch(/\.kd-native-body[^}]*flex: 1 1 0/)
    expect(DSH_APP_STYLES).toMatch(/\.kd-native-body[^}]*overflow: auto/)
    expect(DSH_APP_STYLES).toMatch(/\.kd-native-body[^}]*contain: layout paint/)
  })
})
