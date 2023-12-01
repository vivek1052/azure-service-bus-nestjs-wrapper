import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
  ServiceBusReceiverOptions,
  SubscribeOptions,
  ServiceBusReceiver,
  ServiceBusReceivedMessage,
  ProcessErrorArgs,
} from '@azure/service-bus';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export class MessageReceiver {
  private serviceBusReceiver: ServiceBusReceiver;

  private readonly messageTypeMethodMap: Map<
    string,
    { queueControllerInstance: any; methodName: string }
  > = new Map();

  constructor(
    readonly queueName: string,
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly messageTypePropertyName: string,
    private readonly logger: Logger,
    private readonly serviceBusReceiverOptions?: ServiceBusReceiverOptions,
    private readonly subscribeOptions?: SubscribeOptions,
  ) {}

  async connect(): Promise<this> {
    if (this.serviceBusReceiver) {
      throw new InternalServerErrorException('Receiver already exists');
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

    this.serviceBusReceiver.subscribe(
      {
        processMessage: async (message) => this.processMessage(message),
        processError: async (args) => this.processError(args),
      },
      this.subscribeOptions,
    );

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
}
