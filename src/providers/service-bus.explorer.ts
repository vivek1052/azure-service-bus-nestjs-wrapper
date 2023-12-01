import { ServiceBusClient } from '@azure/service-bus';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MESSAGE_TYPE, QUEUE_CONTROLLER_NAME, QUEUE_NAME } from '../constants';
import { ConnectionFactory } from './connection-factory';
import { ConnectionPool } from './connection-pool';

@Injectable()
export class ServiceBusExplorer implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly connectionFactory: ConnectionFactory,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly connectionPool: ConnectionPool,
    private readonly logger: Logger,
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

      const messageTypeMethodNames: string[] = [];

      for (const methodName of methodNames) {
        if (this.isQueueHandlerMethod(queueController, methodName)) {
          const queueReceiver =
            await this.connectionFactory.createQueueReceiver(
              queueController,
              methodName,
            );
          this.connectionPool.addReceiver(
            queueReceiver.queueName,
            queueReceiver,
          );
          this.logger.log(
            `Queue handler registered for queue ${queueReceiver.queueName}`,
          );
        }

        if (this.isMethodTypeHandlerMethod(queueController, methodName)) {
          messageTypeMethodNames.push(methodName);
        }
      }

      if (messageTypeMethodNames.length > 0) {
        const messageReceiver =
          await this.connectionFactory.createMessageReceiver(
            queueController,
            messageTypeMethodNames,
          );
        this.connectionPool.addReceiver(
          messageReceiver.queueName,
          messageReceiver,
        );
        this.logger.log(
          `Message handler registered for message types ${messageTypeMethodNames.toString()}`,
        );
      }
    }
  }

  isQueueHandlerMethod(queueController: InstanceWrapper, methodName: string) {
    return !!this.reflector.get(
      QUEUE_NAME,
      queueController.instance[methodName],
    );
  }

  isMethodTypeHandlerMethod(
    queueController: InstanceWrapper,
    methodName: string,
  ) {
    return !!this.reflector.get(
      MESSAGE_TYPE,
      queueController.instance[methodName],
    );
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
