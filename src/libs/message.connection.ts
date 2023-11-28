import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
  ServiceBusReceiverOptions,
  SubscribeOptions,
  ServiceBusReceiver,
  ServiceBusSender,
  OperationOptionsBase,
  ServiceBusMessage,
  ServiceBusMessageBatch,
  ServiceBusReceivedMessage,
  ProcessErrorArgs,
} from '@azure/service-bus';
import { InternalServerErrorException, Logger } from '@nestjs/common';

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

export class MessageConnection {
  private readonly logger = new Logger(MessageConnection.name);

  private serviceBusReceiver: ServiceBusReceiver;

  private readonly messageTypeMethodMap: Map<
    string,
    { queueControllerInstance: any; methodName: string }
  > = new Map();

  private readonly messageTypeSenderMap: Map<string, MessageTypeSender> =
    new Map();

  private serviceBusSender: ServiceBusSender;

  constructor(
    readonly queueName: string,
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly messageTypePropertyName: string,
    private readonly serviceBusReceiverOptions?: ServiceBusReceiverOptions,
    private readonly subscribeOptions?: SubscribeOptions,
  ) {}

  async connect(): Promise<this> {
    if (this.serviceBusReceiver && this.serviceBusSender) {
      throw new InternalServerErrorException('Connection already exists');
    }

    if (this.messageTypeMethodMap.size === 0) {
      this.logger.error('No message handlers registered');
      return null;
    }

    await this.createQueueInServiceBus();

    this.serviceBusReceiver = this.serviceBusClient.createReceiver(
      this.queueName,
      this.serviceBusReceiverOptions,
    );

    this.serviceBusSender = this.serviceBusClient.createSender(this.queueName);

    this.serviceBusReceiver.subscribe(
      {
        processMessage: async (message) => this.processMessage(message),
        processError: async (args) => this.processError(args),
      },
      this.subscribeOptions,
    );

    for (const key of this.messageTypeMethodMap.keys()) {
      this.messageTypeSenderMap.set(
        key,
        new MessageTypeSender(
          this.serviceBusSender,
          key,
          this.messageTypePropertyName,
        ),
      );
    }

    return this;
  }

  private async processMessage(
    message: ServiceBusReceivedMessage,
  ): Promise<void> {
    const { methodName, queueControllerInstance } =
      this.messageTypeMethodMap.get(
        message.applicationProperties[this.messageTypePropertyName] as string,
      );
    return queueControllerInstance[methodName](
      message,
      this.serviceBusReceiver,
    );
  }

  private async processError(args: ProcessErrorArgs): Promise<void> {
    this.logger.error(args);
  }

  registerHandler(
    messageTypeName: string,
    queueControllerInstance: any,
    methodName: string,
  ): this {
    if (this.messageTypeMethodMap.has(messageTypeName)) {
      throw new InternalServerErrorException(
        `Message type ${messageTypeName} already registered`,
      );
    }

    this.messageTypeMethodMap.set(messageTypeName, {
      queueControllerInstance,
      methodName,
    });

    return this;
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

  getSender(messageTypeName: string): MessageTypeSender {
    if (!this.messageTypeSenderMap.has(messageTypeName)) {
      throw new InternalServerErrorException(`${messageTypeName} doesnt exist`);
    }
    return this.messageTypeSenderMap.get(messageTypeName);
  }
}
