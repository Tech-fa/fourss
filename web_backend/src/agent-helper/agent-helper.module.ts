import { Module } from '@nestjs/common'
import { AgentHelperController } from './agent-helper.controller'

@Module({
    controllers: [AgentHelperController]
})
export class AgentHelperModule {}
