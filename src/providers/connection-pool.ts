import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MessageReceiver } from '../libs/message.receiver';
import { QueueReceiver } from '../libs/queue.receiver';
import { MessageSender } from '../libs/message.sender';
import { QueueSender } from '../libs/queue.sender';

@Injectable()
export class ConnectionPool {
  private readonly receiverPool: Map<string, MessageReceiver | QueueReceiver> =
    new Map();

  private readonly senderPool: Map<string, QueueSender | MessageSender> =
    new Map();

  addReceiver(queueName: string, receiver: MessageReceiver | QueueReceiver) {
    if (this.receiverPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} already exists in the receiver pool`,
      );
    }

    this.receiverPool.set(queueName, receiver);
  }

  getReceiver(queueName: string): MessageReceiver | QueueReceiver {
    if (!this.receiverPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} doesn't exists in the receiver pool`,
      );
    }
    return this.receiverPool.get(queueName);
  }

  addSender(queueName: string, sender: QueueSender | MessageSender) {
    if (this.senderPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} already exists in sender pool`,
      );
    }

    this.senderPool.set(queueName, sender);
  }

  getSender(queueName): QueueSender | MessageSender {
    if (!this.senderPool.has(queueName)) {
      throw new InternalServerErrorException(
        `${queueName} doesn't exists in sender pool`,
      );
    }

    return this.senderPool.get(queueName);
  }
}
