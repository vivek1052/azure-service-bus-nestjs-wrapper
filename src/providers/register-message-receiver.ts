import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
} from '@azure/service-bus';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  MESSAGE_TYPE,
  MESSAGE_TYPE_PROPERTY_NAME,
  QUEUE_CONTROLLER_NAME,
  QUEUE_CONTROLLER_OPTIONS,
} from 'src/constants';
import { ServiceBusMessageReceiver } from 'src/libs/service-bus-message-receiver';

@Injectable()
export class RegisterMessageReceiver {
  private readonly logger = new Logger(RegisterMessageReceiver.name);
  private serviceBusMessageReceiver: ServiceBusMessageReceiver;

  constructor(
    private readonly reflector: Reflector,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly serviceBusClient: ServiceBusClient,
    @Inject(MESSAGE_TYPE_PROPERTY_NAME)
    private readonly messageTypePropertyName: string,
  ) {}

  async register(queueController: InstanceWrapper, methodName: string) {
    const { instance, metatype } = queueController;

    const queueControllerName = this.reflector.get(
      QUEUE_CONTROLLER_NAME,
      metatype,
    );

    if (!queueControllerName) {
      throw new InternalServerErrorException(
        'Message types cannot be registered without queue controller name',
      );
    }

    await this.createServiceBusQueue(queueControllerName);

    if (!this.serviceBusMessageReceiver) {
      this.serviceBusMessageReceiver = new ServiceBusMessageReceiver(
        queueControllerName,
        this.messageTypePropertyName,
        this.serviceBusClient,
        this.getServiceBusReceiverOptions(metatype),
      );
    }

    const messageTypeName = this.getMessageTypeName(instance[methodName]);

    this.serviceBusMessageReceiver.registerMessageTypeMethod(
      messageTypeName,
      instance,
      methodName,
    );

    this.logger.log(
      `Message receiver registered for message type ${messageTypeName} on queue controller ${queueControllerName}`,
    );
  }

  private getMessageTypeName(target): string {
    return this.reflector.get(MESSAGE_TYPE, target);
  }

  methodIsMessageHandler(target: any): boolean {
    return this.getMessageTypeName(target) ? true : false;
  }

  private getServiceBusReceiverOptions(target: any): ServiceBusReceiverOptions {
    return this.reflector.get(QUEUE_CONTROLLER_OPTIONS, target);
  }

  private async createServiceBusQueue(fullQueueName: string): Promise<void> {
    if (
      !(await this.serviceBusAdministrationClient.queueExists(fullQueueName))
    ) {
      try {
        await this.serviceBusAdministrationClient.createQueue(fullQueueName);
        this.logger.log(
          `Queue ${fullQueueName} created in service bus successfully`,
        );
      } catch (error) {
        this.logger.error(
          `Unable to create queue ${fullQueueName} in service bus`,
        );
      }
    }
  }
}
