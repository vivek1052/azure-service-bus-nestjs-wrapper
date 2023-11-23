import {
  ServiceBusAdministrationClientOptions,
  ServiceBusClientOptions,
} from '@azure/service-bus';

export interface ModuleOptions {
  separator?: string;
  serviceBusClientOptions?: ServiceBusClientOptions;
  serviceBusAdministrationClientOptions?: ServiceBusAdministrationClientOptions;
}
