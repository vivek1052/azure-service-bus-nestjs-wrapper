import {
  ProcessErrorArgs,
  ServiceBusAdministrationClient,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
  SubscribeOptions,
} from '@azure/service-bus';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export class QueueReceiver {
  private serviceBusReceiver: ServiceBusReceiver;
  private queueControllerInstance: any;
  private methodName: string;

  constructor(
    readonly queueName: string,
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly logger: Logger,
    private readonly serviceBusReceiverOptions?: ServiceBusReceiverOptions,
    private readonly subscribeOptions?: SubscribeOptions,
  ) {}

  async connect(): Promise<this> {
    if (this.serviceBusReceiver) {
      throw new InternalServerErrorException('Receiver already exists');
    }

    if (!this.queueControllerInstance || !this.methodName) {
      throw new InternalServerErrorException('No queue handler registered');
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

  private async processError(args: ProcessErrorArgs): Promise<void> {
    this.logger.error(args);
  }

  private async processMessage(
    message: ServiceBusReceivedMessage,
  ): Promise<void> {
    return this.queueControllerInstance[this.methodName](
      message,
      this.serviceBusReceiver,
    );
  }

  registerHandler(queueControllerInstance: any, methodName: string): this {
    this.queueControllerInstance = queueControllerInstance;
    this.methodName = methodName;
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
