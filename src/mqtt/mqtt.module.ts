import { Module } from '@nestjs/common';
import { MqttConnectionService } from './mqtt-connection.service.js';
import { MqttSubscriberService } from './mqtt-subscriber.service.js';
import { MqttHandlerService } from './mqtt-handler.service.js';

@Module({
  providers: [MqttConnectionService, MqttSubscriberService, MqttHandlerService],
  exports: [MqttConnectionService],
})
export class MqttModule {}
