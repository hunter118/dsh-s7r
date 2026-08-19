import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { DshClientAdapter } from '../dsh-compat/client.ts'
import { DesktopRoot } from '../desktop/Desktop.tsx'
import { installSystem7Styles } from '../system7/styles.ts'

export const inject = ['slots', 'sessions', 'workspaces', 'connection']

export function apply(ctx: ClientContext): void {
  const adapter = new DshClientAdapter(ctx)
  ctx.effect(() => installSystem7Styles(), 'knowledge-desk: System 7 stylesheet')
  ctx.effect(() => ctx.slots.register({
    name: 'root',
    priority: -100,
    inject: () => ({ adapter }),
  }, DesktopRoot), 'knowledge-desk: root desktop shell')
}
