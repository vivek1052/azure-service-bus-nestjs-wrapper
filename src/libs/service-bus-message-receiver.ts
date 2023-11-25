import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
  SubscribeOptions,
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

  private async processMessage(
    message: ServiceBusReceivedMessage,
  ): Promise<void> {
    const { controllerInstance, methodName } = this.messageTypeMap.get(
      message.applicationProperties[this.messageTypePropertyName] as string,
    );
    return controllerInstance[methodName](message, this.serviceBusReceiver);
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
