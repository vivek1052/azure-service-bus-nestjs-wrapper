import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import {
  ServiceBusSender,
  ServiceBusClient,
  ServiceBusAdministrationClient,
  OperationOptionsBase,
  ServiceBusMessage,
  ServiceBusMessageBatch,
} from '@azure/service-bus';
import { Logger, InternalServerErrorException } from '@nestjs/common';

export class MessageTypeSender {
  constructor(
    private readonly serviceBusSender: ServiceBusSender,
    private readonly messageTypeName: string,
    private readonly messageTypePropertyName: string,
  ) {}

  async sendMessages(
    messages:
      | ServiceBusMessage
      | ServiceBusMessage[]
      | ServiceBusMessageBatch
      | AmqpAnnotatedMessage
      | AmqpAnnotatedMessage[],
    options?: OperationOptionsBase,
  ): Promise<void> {
    const metadata = {};
    metadata[this.messageTypePropertyName] = this.messageTypeName;

    return this.serviceBusSender.sendMessages(
      { ...messages, applicationProperties: metadata },
      options,
    );
  }
}

export class MessageSender {
  private serviceBusSender: ServiceBusSender;

  private readonly messageTypeSenderMap: Map<string, MessageTypeSender> =
    new Map();

  constructor(
    private readonly queueName: string,
    private readonly serviceBusClient: ServiceBusClient,
    private readonly messageTypePropertyName: string,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly logger: Logger,
  ) {}

  async connect(): Promise<this> {
    await this.createQueueInServiceBus();

    this.serviceBusSender = this.serviceBusClient.createSender(this.queueName);

    return this;
  }

  getSender(messageTypeName: string): MessageTypeSender {
    if (this.messageTypeSenderMap.has(messageTypeName)) {
      return this.messageTypeSenderMap.get(messageTypeName);
    } else {
      const messageTypeSender = new MessageTypeSender(
        this.serviceBusSender,
        messageTypeName,
        this.messageTypePropertyName,
      );

      this.messageTypeSenderMap.set(messageTypeName, messageTypeSender);

      this.logger.log(
        `Message Type Sender injected for queue ${this.queueName} and message type ${messageTypeName}`,
      );

      return messageTypeSender;
    }
  }

  private async createQueueInServiceBus(): Promise<any> {
    if (
      !(await this.serviceBusAdministrationClient.queueExists(this.queueName))
    ) {
      try {
        await this.serviceBusAdministrationClient.createQueue(this.queueName);
        this.logger.log(
          `Queue ${this.queueName} created in service bus successfully`,
        );
      } catch (error) {
        throw new InternalServerErrorException(
          `Unable to create queue ${this.queueName} in service bus`,
        );
      }
    }
  }
}
