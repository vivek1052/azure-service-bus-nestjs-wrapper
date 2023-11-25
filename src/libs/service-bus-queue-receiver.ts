import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
  SubscribeOptions,
} from '@azure/service-bus';
import { InternalServerErrorException } from '@nestjs/common';

export class ServiceBusQueueReceiver {
  private readonly serviceBusReceiver: ServiceBusReceiver;

  constructor(
    queueName: string,
    private readonly queueControllerInstance: any,
    private readonly queueControllerMethodName: string,
    serviceBusClient: ServiceBusClient,
    serviceBusReceiverOptions?: ServiceBusReceiverOptions,
    subscribeOptions?: SubscribeOptions,
  ) {
    this.serviceBusReceiver = serviceBusClient.createReceiver(
      queueName,
      serviceBusReceiverOptions,
    );
    this.serviceBusReceiver.subscribe(
      {
        processMessage: (message) => this.processMessage(message),
        processError: (args) => this.processError(args),
      },
      subscribeOptions,
    );
  }

  private async processMessage(message: ServiceBusReceivedMessage) {
    return this.queueControllerInstance[this.queueControllerMethodName](
      message,
      this.serviceBusReceiver,
    );
  }

  private async processError(args: ProcessErrorArgs) {
    throw new InternalServerErrorException(args);
  }
}
