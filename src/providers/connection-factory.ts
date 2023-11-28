import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
} from '@azure/service-bus';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  MESSAGE_TYPE,
  MESSAGE_TYPE_PROPERTY_NAME,
  QUEUE_CONTROLLER_NAME,
  QUEUE_CONTROLLER_OPTIONS,
  QUEUE_NAME,
  QUEUE_NAME_SEPARATOR,
  QUEUE_OPTIONS,
} from '../constants';
import { QueueControllerOptions } from '../decorators/queue-controller.decorator';
import { QueueOptions } from '../decorators/queue.decorator';
import { MessageConnection } from '../libs/message.connection';
import { QueueConnection } from '../libs/queue.connection';

@Injectable()
export class ConnectionFactory {
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly reflector: Reflector,
    @Inject(QUEUE_NAME_SEPARATOR) private readonly queueNameSeparator: string,
    @Inject(MESSAGE_TYPE_PROPERTY_NAME)
    private readonly messageTypePropertyName,
  ) {}

  async createQueueConnection(
    queueController: InstanceWrapper,
    methodName: string,
  ): Promise<QueueConnection> {
    const { instance, metatype } = queueController;

    const queueControllerName = this.reflector.get(
      QUEUE_CONTROLLER_NAME,
      metatype,
    );

    const queueName = this.reflector.get(QUEUE_NAME, instance[methodName]);

    const fullQueueName = queueControllerName
      ? queueControllerName + this.queueNameSeparator + queueName
      : queueName;

    const queueOptions: QueueOptions = this.reflector.get(
      QUEUE_OPTIONS,
      instance[methodName],
    );

    return new QueueConnection(
      fullQueueName,
      this.serviceBusClient,
      this.serviceBusAdministrationClient,
      queueOptions?.receiverOptions,
      queueOptions?.subscribeOptions,
    )
      .registerHandler(instance, methodName)
      .connect();
  }

  async createMessageConnection(
    queueController: InstanceWrapper,
    methodNames: string[],
  ): Promise<MessageConnection> {
    const { instance, metatype } = queueController;

    const queueControllerName = this.reflector.get(
      QUEUE_CONTROLLER_NAME,
      metatype,
    );

    if (!queueControllerName) {
      throw new InternalServerErrorException(
        'Queue controller name cannot be empty while using message types',
      );
    }

    const queueControllerOptions: QueueControllerOptions = this.reflector.get(
      QUEUE_CONTROLLER_OPTIONS,
      metatype,
    );

    const messageConnection = new MessageConnection(
      queueControllerName,
      this.serviceBusClient,
      this.serviceBusAdministrationClient,
      this.messageTypePropertyName,
      queueControllerOptions?.receiverOptions,
      queueControllerOptions?.subscribeOptions,
    );

    for (const methodName of methodNames) {
      messageConnection.registerHandler(
        this.reflector.get(MESSAGE_TYPE, instance[methodName]),
        instance,
        methodName,
      );
    }

    return messageConnection.connect();
  }
}
