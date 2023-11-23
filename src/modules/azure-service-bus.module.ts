import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
} from '@azure/service-bus';
import { DynamicModule, Logger, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  MESSAGE_TYPE_PROPERTY_NAME,
  QUEUE_NAME_SEPARATOR,
} from 'src/constants';
import { ModuleOptions } from 'src/interfaces/module-options.interface';
import { ServiceBusExplorer } from 'src/libs/service-bus.explorer';
import { RegisterMessageReceiver } from 'src/providers/register-message-receiver';
import { RegisterQueueReceiver } from 'src/providers/register-queue-receiver';

export class AzureServiceBusModule {
  static forRoot(
    connectionString: string,
    options?: ModuleOptions,
  ): DynamicModule {
    const azureServiceBusClientProvider: Provider = {
      provide: ServiceBusClient,
      useValue: new ServiceBusClient(
        connectionString,
        options?.serviceBusClientOptions,
      ),
    };
    const azureServiceBusAdministrationClientProvider: Provider = {
      provide: ServiceBusAdministrationClient,
      useValue: new ServiceBusAdministrationClient(
        connectionString,
        options?.serviceBusAdministrationClientOptions,
      ),
    };
    return {
      module: AzureServiceBusModule,
      imports: [DiscoveryModule],
      providers: [
        azureServiceBusClientProvider,
        azureServiceBusAdministrationClientProvider,
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
