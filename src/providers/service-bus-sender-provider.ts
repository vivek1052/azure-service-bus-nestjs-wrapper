import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConnectionPool } from './connection-pool';
import { QueueConnection } from '../libs/queue.connection';
import { ServiceBusSender } from '@azure/service-bus';
import {
  MessageConnection,
  MessageTypeSender,
} from '../libs/message.connection';

@Injectable()
export class ServiceBusSenderProvider {
  constructor(private readonly connectionPool: ConnectionPool) {}

  getSender(
    queueName: string,
    messageTypeName?: string,
  ): ServiceBusSender | MessageTypeSender {
    const connection = this.connectionPool.getConnection(queueName);

    if (connection instanceof QueueConnection) {
      return connection.getSender();
    } else if (connection instanceof MessageConnection) {
      if (!messageTypeName) {
        throw new InternalServerErrorException(
          'Message type name is required for message type sender',
        );
      }
      return connection.getSender(messageTypeName);
    } else {
      return null;
    }
  }
}
