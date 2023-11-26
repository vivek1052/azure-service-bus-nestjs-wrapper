import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MessageConnection } from '../libs/message.connection';
import { QueueConnection } from '../libs/queue.connection';

@Injectable()
export class ConnectionPool {
  private readonly connectionPool: Map<
    string,
    MessageConnection | QueueConnection
  > = new Map();

  addConnection(
    queueName: string,
    connection: MessageConnection | QueueConnection,
  ) {
    if (!this.connectionPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} already exists in the connection pool`,
      );
    }

    this.connectionPool.set(queueName, connection);
  }

  getConnection(queueName: string): MessageConnection | QueueConnection {
    if (this.connectionPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} doesn't exists in the connection pool`,
      );
    }
    return this.connectionPool.get(queueName);
  }
}
