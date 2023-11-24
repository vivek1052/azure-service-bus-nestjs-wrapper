import {
  ServiceBusReceiverOptions,
  SubscribeOptions,
} from '@azure/service-bus';

export interface QueueOptions {
  receiverOptions: ServiceBusReceiverOptions;
  subscribeOptions: SubscribeOptions;
}
