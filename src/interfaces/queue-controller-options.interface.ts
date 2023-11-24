import {
  ServiceBusReceiverOptions,
  SubscribeOptions,
} from '@azure/service-bus';

export interface QueueControllerOptions {
  receiverOptions: ServiceBusReceiverOptions;
  subscribeOptions: SubscribeOptions;
}
