import {
  ServiceBusAdministrationClient,
  ServiceBusAdministrationClientOptions,
  ServiceBusClient,
  ServiceBusClientOptions,
} from '@azure/service-bus';
import { DynamicModule, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  MESSAGE_TYPE_PROPERTY_NAME,
  QUEUE_NAME_SEPARATOR,
} from 'src/constants';
import { ConnectionFactory } from '../providers/connection-factory';
import { ConnectionPool } from '../providers/connection-pool';
import { ServiceBusExplorer } from '../providers/service-bus.explorer';

export interface ModuleOptions {
  separator?: string;
  messageTypePropertyName: string;
  serviceBusClientOptions?: ServiceBusClientOptions;
  serviceBusAdministrationClientOptions?: ServiceBusAdministrationClientOptions;
}

export class ServiceBusModule {
  static forRoot(
    connectionString: string,
    options?: ModuleOptions,
  ): DynamicModule {
    const serviceBusClientProvider: Provider = {
      provide: ServiceBusClient,
      useValue: new ServiceBusClient(
        connectionString,
        options?.serviceBusClientOptions,
      ),
    };
    const serviceBusAdministrationClientProvider: Provider = {
      provide: ServiceBusAdministrationClient,
      useValue: new ServiceBusAdministrationClient(
        connectionString,
        options?.serviceBusAdministrationClientOptions,
      ),
    };
    return {
      module: ServiceBusModule,
      imports: [DiscoveryModule],
      providers: [
        serviceBusClientProvider,
        serviceBusAdministrationClientProvider,
        {
          provide: QUEUE_NAME_SEPARATOR,
          useValue: options?.separator || '.',
        },
        {
          provide: MESSAGE_TYPE_PROPERTY_NAME,
          useValue: options?.messageTypePropertyName || 'messageType',
        },
        ServiceBusExplorer,
        ConnectionFactory,
        ConnectionPool,
      ],
      exports: [],
    };
  }
}
