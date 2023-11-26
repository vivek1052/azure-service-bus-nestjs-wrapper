import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
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

interface MessageConnectionType {
  queueController: InstanceWrapper;
  methodNames: string[];
}

@Injectable()
export class ServiceBusExplorer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceBusExplorer.name);
  constructor(
    private readonly serviceBusClient: ServiceBusClient,
    private readonly connectionFactory: ConnectionFactory,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly connectionPool: ConnectionPool,
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

      const messageConnection: MessageConnectionType = {
        queueController,
        methodNames: [],
      };

      for (const methodName of methodNames) {
        if (this.isQueueHandlerMethod(queueController, methodName)) {
          const queueConnection = this.connectionFactory.createQueueConnection(
            queueController,
            methodName,
          );
          this.connectionPool.addConnection(
            queueConnection.queueName,
            queueConnection,
          );
          this.logger.log(
            `Queue handler registered for queue ${queueConnection.queueName}`,
          );
        }

        if (this.isMethodTypeHandlerMethod(queueController, methodName)) {
          messageConnection.methodNames.push(methodName);
        }
      }

      if (messageConnection.methodNames.length > 0) {
        const messageQueue = this.connectionFactory.createMessageConnection(
          messageConnection.queueController,
          messageConnection.methodNames,
        );
        this.connectionPool.addConnection(messageQueue.queueName, messageQueue);
        this.logger.log(
          `Message handler registered for message types ${messageConnection.methodNames.toString()}`,
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
