import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
} from '@azure/service-bus';
import { DynamicModule, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  MESSAGE_TYPE_PROPERTY_NAME,
  QUEUE_NAME_SEPARATOR,
} from 'src/constants';
import { ModuleOptions } from '../interfaces/module-options.interface';
import { ServiceBusExplorer } from '../libs/service-bus.explorer';
import { RegisterMessageReceiver } from '../providers/register-message-receiver';
import { RegisterQueueReceiver } from '../providers/register-queue-receiver';

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
        RegisterMessageReceiver,
        RegisterQueueReceiver,
      ],
      exports: [],
    };
  }
}
