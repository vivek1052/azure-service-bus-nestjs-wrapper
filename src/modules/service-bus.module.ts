import {
  ServiceBusAdministrationClient,
  ServiceBusAdministrationClientOptions,
  ServiceBusClient,
  ServiceBusClientOptions,
} from '@azure/service-bus';
import { DynamicModule, Logger, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MESSAGE_TYPE_PROPERTY_NAME, QUEUE_NAME_SEPARATOR } from '../constants';
import { ConnectionFactory } from '../providers/connection-factory';
import { ConnectionPool } from '../providers/connection-pool';
import { ServiceBusExplorer } from '../providers/service-bus.explorer';
import {
  MessageTypeSendersToBeInjected,
  getMessageSenderProviders,
  getMessageTypeSenderProviders,
  getQueueSenderProviders,
} from '../libs/sender-provider-utils';

export interface ModuleOptions {
  connectionString: string;
  queueSendersToBeInjected?: string[];
  messageTypeSendersToBeInjected?: MessageTypeSendersToBeInjected[];
  separator?: string;
  messageTypePropertyName?: string;
  serviceBusClientOptions?: ServiceBusClientOptions;
  serviceBusAdministrationClientOptions?: ServiceBusAdministrationClientOptions;
}

export class ServiceBusModule {
  static forRoot(moduleOptions: ModuleOptions): DynamicModule {
    const {
      connectionString,
      messageTypePropertyName,
      messageTypeSendersToBeInjected,
      queueSendersToBeInjected,
      separator,
      serviceBusAdministrationClientOptions,
      serviceBusClientOptions,
    } = moduleOptions;
    const serviceBusClientProvider: Provider = {
      provide: ServiceBusClient,
      useValue: new ServiceBusClient(connectionString, serviceBusClientOptions),
    };

    const serviceBusAdministrationClientProvider: Provider = {
      provide: ServiceBusAdministrationClient,
      useValue: new ServiceBusAdministrationClient(
        connectionString,
        serviceBusAdministrationClientOptions,
      ),
    };

    const queueSenderProviders = getQueueSenderProviders(
      queueSendersToBeInjected,
    );
    const messageSenderProviders = getMessageSenderProviders(
      messageTypeSendersToBeInjected,
    );
    const messageTypeSenderProviders = getMessageTypeSenderProviders(
      messageTypeSendersToBeInjected,
    );

    return {
      module: ServiceBusModule,
      imports: [DiscoveryModule],
      providers: [
        serviceBusClientProvider,
        serviceBusAdministrationClientProvider,
        {
          provide: QUEUE_NAME_SEPARATOR,
          useValue: separator || '.',
        },
        {
          provide: MESSAGE_TYPE_PROPERTY_NAME,
          useValue: messageTypePropertyName || 'messageType',
        },
        {
          provide: Logger,
          useValue: new Logger(ServiceBusModule.name),
        },
        ServiceBusExplorer,
        ConnectionFactory,
        ConnectionPool,
        ...queueSenderProviders,
        ...messageSenderProviders,
        ...messageTypeSenderProviders,
      ],
      exports: [...queueSenderProviders, ...messageTypeSenderProviders],
    };
  }
}
