import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { QUEUE_CONTROLLER_NAME } from '../constants';
import { RegisterQueueReceiver } from '../providers/register-queue-receiver';
import { RegisterMessageReceiver } from '../providers/register-message-receiver';

export interface QueueType {
  queueControllerName: string;
  queueName: string;
  controllerInstance: any;
  methodName: string;
  serviceBusReceiver: ServiceBusReceiver;
}

export interface MessageType {
  queueControllerName: string;
  messageType: string;
  controllerInstance: any;
  methodName: string;
  serviceBusReceiver: ServiceBusReceiver;
}

@Injectable()
export class ServiceBusExplorer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceBusExplorer.name);
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly registerQueueReceiver: RegisterQueueReceiver,
    private readonly registerMessageReceiver: RegisterMessageReceiver,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}
  onModuleDestroy() {
    this.serviceBusClient.close();
  }

  async onModuleInit() {
    const queueControllers: InstanceWrapper[] = this.getQueueControllers();

    for (const queueController of queueControllers) {
      const methodNames = this.metadataScanner.getAllMethodNames(
        queueController.instance,
      );
      this.logger.log(
        `Registering handler for queue controller ${queueController.metatype.name}`,
      );
      for (const methodName of methodNames) {
        if (
          this.registerQueueReceiver.methodIsQueueHandler(
            queueController.instance[methodName],
          )
        ) {
          this.registerQueueReceiver.register(queueController, methodName);
        }

        if (
          this.registerMessageReceiver.methodIsMessageHandler(
            queueController.instance[methodName],
          )
        ) {
          this.registerMessageReceiver.register(queueController, methodName);
        }
      }
    }
  }

  getQueueControllers(): InstanceWrapper[] {
    return this.discoveryService
      .getProviders()
      .filter(
        (wrapper: InstanceWrapper) =>
          wrapper.metatype &&
          this.reflector.get(QUEUE_CONTROLLER_NAME, wrapper.metatype),
      );
  }
}
