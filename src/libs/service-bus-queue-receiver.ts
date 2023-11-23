import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
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
  ) {
    this.serviceBusReceiver = serviceBusClient.createReceiver(
      queueName,
      serviceBusReceiverOptions,
    );
    this.serviceBusReceiver.subscribe({
      processMessage: (message) => this.processMessage(message),
      processError: (args) => this.processError(args),
    });
  }

  private async processMessage(message: ServiceBusReceivedMessage) {
    this.queueControllerInstance[this.queueControllerMethodName](
      message,
      this.serviceBusReceiver,
    );
  }

  private async processError(args: ProcessErrorArgs) {
    throw new InternalServerErrorException(args);
  }
}
