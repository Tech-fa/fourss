import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'source-map-support/register';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import { HistoryInterceptor } from './history/history.interceptor';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logLevel: LogLevel[] =
    process.env.DEBUG == 'true'
      ? ['error', 'warn', 'log', 'debug']
      : ['error', 'warn', 'log'];

  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV == 'development'
              ? winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.ms(),
                  nestWinstonModuleUtilities.format.nestLike('Documents', {
                    colors: true,
                    prettyPrint: true,
                  }),
                )
              : winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.ms(),
                  nestWinstonModuleUtilities.format.nestLike('Documents', {
                    colors: true,
                    prettyPrint: true,
                  }),
                ),
        }),
        // other transports...
      ],
    }),
    cors: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use('/documents', json({ limit: '1000mb' }));
  app.use('/documents', urlencoded({ limit: '1000mb', extended: true }));
  app.use('/documents/:id/versions/:versionId/editor-content', json({ limit: '1000mb' }));
  app.use('/documents/:id/versions/:versionId/editor-content', urlencoded({ limit: '1000mb', extended: true }));
  app.use('/documents/:id/versions', json({ limit: '1000mb' }));
  app.use('/documents/:id/versions', urlencoded({ limit: '1000mb', extended: true }));

  app.use('/documents/templates/:id', json({ limit: '1000mb' }));
  app.use('/documents/templates/:id', urlencoded({ limit: '1000mb', extended: true }));
  app.use('/documents/templates', json({ limit: '1000mb' }));
  app.use('/documents/templates', urlencoded({ limit: '1000mb', extended: true }));

  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ limit: '100kb', extended: true }));

  

  // Enable CORS
  app.enableCors();
  
  // History tracking for all requests
  const historyInterceptor = app.get(HistoryInterceptor);
  app.useGlobalInterceptors(historyInterceptor);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Documents API')
    .setDescription(
      'HTTP API for documents, users, teams, permissions, and notifications. Authenticate with POST /auth/token using a client id and client secret created in the application UI. Login and registration are application-only and are omitted from this specification.',
    )
    .setVersion('7.3.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3012);
  logger.log('okay we are live');
}
bootstrap();
