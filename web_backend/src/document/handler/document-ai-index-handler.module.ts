import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module';
import { DocumentModule } from '../document.module';
import { DocumentAiIndexHandlerService } from './document-ai-index-handler.service';

@Module({
  imports: [DocumentModule, QueueModule],
  providers: [DocumentAiIndexHandlerService],
})
export class DocumentAiIndexHandlerModule {}
