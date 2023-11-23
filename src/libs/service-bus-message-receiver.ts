import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
} from '@azure/service-bus';
import { InternalServerErrorException } from '@nestjs/common';

export class ServiceBusMessageReceiver {
  private readonly serviceBusReceiver: ServiceBusReceiver;

  private readonly messageTypeMap = new Map<
    string,
    { controllerInstance: any; methodName: string }
  >();

  constructor(
    queueName: string,
    private readonly messageTypePropertyName: string,
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
    const { controllerInstance, methodName } = this.messageTypeMap.get(
      message.applicationProperties[this.messageTypePropertyName] as string,
    );
    controllerInstance[methodName](message, this.serviceBusReceiver);
  }

  private async processError(args: ProcessErrorArgs) {
    throw new InternalServerErrorException(args);
  }

  registerMessageTypeMethod(
    messageTypeName: string,
    controllerInstance: any,
    methodName: string,
  ) {
    if (this.messageTypeMap.has(messageTypeName)) {
      throw new InternalServerErrorException(
        `Message type ${messageTypeName} is already declared`,
      );
    }

    this.messageTypeMap.set(messageTypeName, {
      controllerInstance,
      methodName,
    });
  }
}
