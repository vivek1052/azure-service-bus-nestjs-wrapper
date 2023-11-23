import {
  ServiceBusAdministrationClient,
  ServiceBusClient,
} from '@azure/service-bus';
import { DynamicModule, Logger, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { QUEUE_NAME_SEPARATOR } from 'src/constants';
import { ModuleOptions } from 'src/interfaces/module-options.interface';
import { AzureServiceBusExplorer } from 'src/libs/azure-service-bus.explorer';

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
        AzureServiceBusExplorer,
        Logger,
      ],
      exports: [],
    };
  }
}
