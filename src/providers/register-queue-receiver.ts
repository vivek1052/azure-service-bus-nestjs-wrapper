import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
} from '@azure/service-bus';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  QUEUE_CONTROLLER_NAME,
  QUEUE_NAME,
  QUEUE_NAME_SEPARATOR,
  QUEUE_OPTIONS,
} from '../constants';
import { ServiceBusQueueReceiver } from '../libs/service-bus-queue-receiver';

@Injectable()
export class RegisterQueueReceiver {
  private readonly logger = new Logger(RegisterQueueReceiver.name);
  private readonly serviceBusQueueReceivers: ServiceBusQueueReceiver[] = [];

  constructor(
    private readonly reflector: Reflector,
    @Inject(QUEUE_NAME_SEPARATOR) private readonly queueNameSeparator: string,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly serviceBusClient: ServiceBusClient,
  ) {}

  async register(queueController: InstanceWrapper, methodName: string) {
    const { instance, metatype } = queueController;
    const queueControllerName = this.reflector.get(
      QUEUE_CONTROLLER_NAME,
      metatype,
    );
    const queueName = this.getQueueName(instance[methodName]);
    const fullQueueName = this.getFullQueueName(queueControllerName, queueName);

    await this.createServiceBusQueue(fullQueueName);

    const serviceBusReceiverOptions = this.getServiceBusReceiverOptions(
      instance[methodName],
    );

    this.serviceBusQueueReceivers.push(
      new ServiceBusQueueReceiver(
        fullQueueName,
        instance,
        methodName,
        this.serviceBusClient,
        serviceBusReceiverOptions,
      ),
    );
    this.logger.log(`Queue receiver registered for queue ${fullQueueName}`);
  }

  private getQueueName(target: any): string {
    return this.reflector.get(QUEUE_NAME, target);
  }

  private getFullQueueName(
    queueControllerName: string,
    queueName: string,
  ): string {
    return queueControllerName
      ? queueControllerName + this.queueNameSeparator + queueName
      : queueName;
  }

  methodIsQueueHandler(target: any): boolean {
    return !!this.getQueueName(target);
  }

  private getServiceBusReceiverOptions(target: any) {
    return this.reflector.get(QUEUE_OPTIONS, target);
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
