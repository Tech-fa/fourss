import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Events, getListening } from '../../queue/queue-constants';
import { Public } from '../../util/constants';
import { DocumentAiIndexService } from '../document-ai-index.service';

@Injectable()
export class DocumentAiIndexHandlerService {
  private readonly logger = new Logger(DocumentAiIndexHandlerService.name);

  constructor(
    private readonly documentAiIndexService: DocumentAiIndexService,
  ) {}

  @RabbitSubscribe(getListening(Events.DOCUMENT_AI_INDEX))
  @Public()
  async handleDocumentAiIndex(data: { documentId: string; versionId: number }) {
    try {
      const { documentId, versionId } = data || ({} as never);
      if (!documentId || !versionId) {
        this.logger.warn(
          'Skipping document AI index: missing documentId or versionId',
        );
        return;
      }
      await this.documentAiIndexService.indexDocumentVersion({
        documentId,
        versionId,
      });
    } catch (error) {
      this.logger.error('Failed to handle document AI index', error);
    }
  }
}
