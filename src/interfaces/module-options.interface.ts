import {
  ServiceBusAdministrationClientOptions,
  ServiceBusClientOptions,
} from '@azure/service-bus';

export interface ModuleOptions {
  separator?: string;
  messageTypePropertyName: string;
  serviceBusClientOptions?: ServiceBusClientOptions;
  serviceBusAdministrationClientOptions?: ServiceBusAdministrationClientOptions;
}
