import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
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
  QUEUE_NAME,
  QUEUE_NAME_SEPARATOR,
  QUEUE_OPTIONS,
} from '../constants';
import { QueueControllerOptions } from '../decorators/queue-controller.decorator';
import { QueueOptions } from '../decorators/queue.decorator';
import { MessageReceiver } from '../libs/message.receiver';
import { QueueReceiver } from '../libs/queue.receiver';
import { QueueSender } from '../libs/queue.sender';
import { MessageSender } from '../libs/message.sender';

@Injectable()
export class ConnectionFactory {
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly reflector: Reflector,
    @Inject(QUEUE_NAME_SEPARATOR) private readonly queueNameSeparator: string,
    @Inject(MESSAGE_TYPE_PROPERTY_NAME)
    private readonly messageTypePropertyName,
    private readonly logger: Logger,
  ) {}

  async createQueueReceiver(
    queueController: InstanceWrapper,
    methodName: string,
  ): Promise<QueueReceiver> {
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

    return new QueueReceiver(
      fullQueueName,
      this.serviceBusClient,
      this.serviceBusAdministrationClient,
      this.logger,
      queueOptions?.receiverOptions,
      queueOptions?.subscribeOptions,
    )
      .registerHandler(instance, methodName)
      .connect();
  }

  async createMessageReceiver(
    queueController: InstanceWrapper,
    methodNames: string[],
  ): Promise<MessageReceiver> {
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

    const messageReceiver = new MessageReceiver(
      queueControllerName,
      this.serviceBusClient,
      this.serviceBusAdministrationClient,
      this.messageTypePropertyName,
      this.logger,
      queueControllerOptions?.receiverOptions,
      queueControllerOptions?.subscribeOptions,
    );

    for (const methodName of methodNames) {
      messageReceiver.registerHandler(
        this.reflector.get(MESSAGE_TYPE, instance[methodName]),
        instance,
        methodName,
      );
    }

    return messageReceiver.connect();
  }

  async createQueueSender(queueName): Promise<QueueSender> {
    return new QueueSender(
      queueName,
      this.serviceBusClient,
      this.serviceBusAdministrationClient,
      this.logger,
    ).connect();
  }

  async createMessageSender(queueName): Promise<MessageSender> {
    return new MessageSender(
      queueName,
      this.serviceBusClient,
      this.messageTypePropertyName,
      this.serviceBusAdministrationClient,
      this.logger,
    ).connect();
  }
}
