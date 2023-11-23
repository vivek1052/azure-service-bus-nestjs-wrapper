import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
  ServiceBusReceiver,
} from '@azure/service-bus';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  QUEUE_CONTROLLER_NAME,
  QUEUE_NAME,
  QUEUE_NAME_SEPARATOR,
  QUEUE_OPTIONS,
} from 'src/constants';
import { ServiceBusQueueReceiver } from './service-bus-queue-receiver';
import { RegisterQueueReceiver } from 'src/providers/register-queue-receiver';

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
export class AzureServiceBusExplorer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AzureServiceBusExplorer.name);
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly registerQueueReceiver: RegisterQueueReceiver,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
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

      for (const methodName of methodNames) {
        if (
          this.registerQueueReceiver.methodIsQueueHandler(
            queueController.instance[methodName],
          )
        ) {
          this.registerQueueReceiver.register(queueController, methodName);
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
