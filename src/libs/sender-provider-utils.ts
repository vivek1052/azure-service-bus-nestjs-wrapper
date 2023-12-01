import { Logger, Provider } from '@nestjs/common';
import { ConnectionFactory } from '../providers/connection-factory';
import { ConnectionPool } from '../providers/connection-pool';
import { QueueSender } from './queue.sender';
import { MESSAGE_TYPE, QUEUE_NAME } from 'src/constants';
import { ServiceBusSender } from '@azure/service-bus';
import { MessageSender, MessageTypeSender } from './message.sender';

export interface MessageTypeSendersToBeInjected {
  queueName: string;
  messageTypeNames: string[];
}

export const getQueueSenderProviders = (
  queueSendersToBeInjected: string[],
): Provider[] => {
  const queueSenderProviders: Provider[] = [];

  for (const queueName of queueSendersToBeInjected) {
    queueSenderProviders.push({
      provide: getQueueSenderToken(queueName),
      useFactory: async (
        connectionFactory: ConnectionFactory,
        connectionPool: ConnectionPool,
        logger: Logger,
      ): Promise<ServiceBusSender> => {
        let queueSender: QueueSender;

        try {
          queueSender = connectionPool.getSender(queueName) as QueueSender;
        } catch (error) {
          queueSender = await connectionFactory.createQueueSender(queueName);

          connectionPool.addSender(queueName, queueSender);

          logger.log(`Queue Sender injected for queue ${queueName}`);
        }

        return queueSender.getSender();
      },
      inject: [ConnectionFactory, ConnectionPool, Logger],
    });
  }

  return queueSenderProviders;
};

export const getMessageSenderProviders = (
  messageTypeSendersToBeInjected: MessageTypeSendersToBeInjected[],
): Provider[] => {
  const messageSenderProviders: Provider[] = [];

  for (const { queueName } of messageTypeSendersToBeInjected) {
    messageSenderProviders.push({
      provide: getMessageSenderToken(queueName),
      useFactory: async (
        connectionFactory: ConnectionFactory,
        connectionPool: ConnectionPool,
      ): Promise<MessageSender> => {
        let messageSender: MessageSender;

        try {
          messageSender = connectionPool.getSender(queueName) as MessageSender;
        } catch (error) {
          messageSender = await connectionFactory.createMessageSender(
            queueName,
          );

          connectionPool.addSender(queueName, messageSender);
        }

        return messageSender;
      },
      inject: [ConnectionFactory, ConnectionPool],
    });
  }

  return messageSenderProviders;
};

export const getMessageTypeSenderProviders = (
  messageTypeSendersToBeInjected: MessageTypeSendersToBeInjected[],
): Provider[] => {
  const messageTypeSenderProviders: Provider[] = [];

  for (const {
    queueName,
    messageTypeNames,
  } of messageTypeSendersToBeInjected) {
    for (const messageTypeName of messageTypeNames) {
      messageTypeSenderProviders.push({
        provide: getMessageTypeSenderToken(queueName, messageTypeName),
        useFactory: (messageSender: MessageSender): MessageTypeSender => {
          return messageSender.getSender(messageTypeName);
        },
        inject: [getMessageSenderToken(queueName)],
      });
    }
  }
  return messageTypeSenderProviders;
};

export const getQueueSenderToken = (queueName: string): string =>
  `${QUEUE_NAME}_${queueName}`;

export const getMessageSenderToken = (queueName: string): string =>
  `${MESSAGE_TYPE}_${queueName}`;

export const getMessageTypeSenderToken = (
  queueName: string,
  messageTypeName: string,
) => `${MESSAGE_TYPE}_${queueName}_${messageTypeName}`;
