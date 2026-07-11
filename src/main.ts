import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino Logger
  app.useLogger(app.get(Logger));

  // Security: Helmet
  app.use(helmet());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Enable CORS
  app.enableCors();

  // Swagger Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AGRI-MOTION API')
    .setDescription(
      'Smart Farming Monitoring System API — Backend for IoT-based agricultural monitoring with MQTT integration.',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Farms', 'Farm management')
    .addTag('Devices', 'Device management')
    .addTag('Sensors', 'Sensor management')
    .addTag('Telemetry', 'Telemetry data endpoints')
    .addTag('Alerts', 'Alert management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Start server
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`🌱 AGRI-MOTION API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

void bootstrap();
