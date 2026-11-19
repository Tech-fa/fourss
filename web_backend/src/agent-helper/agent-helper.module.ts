import { Module } from '@nestjs/common'
import { AgentHelperController } from './agent-helper.controller'

export { AUDIT_PROGRAM_GUIDE } from './audit-program'
export { NON_CONFORMITY_GUIDE } from './non-conformity'

@Module({
    controllers: [AgentHelperController]
})
export class AgentHelperModule {}
