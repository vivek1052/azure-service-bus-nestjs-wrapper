import { SetMetadata } from '@nestjs/common';
import { QUEUE_CONTROLLER_NAME, QUEUE_CONTROLLER_OPTIONS } from '../constants';
import {
  ServiceBusReceiverOptions,
  SubscribeOptions,
} from '@azure/service-bus';

export interface QueueControllerOptions {
  receiverOptions: ServiceBusReceiverOptions;
  subscribeOptions: SubscribeOptions;
}

/**
 *
 * @param controllerName
 * @param queueControllerOptions
 * @returns
 */
export function QueueController(
  controllerName?: string,
  queueControllerOptions?: QueueControllerOptions,
): ClassDecorator {
  return (target: Function): void => {
    SetMetadata(QUEUE_CONTROLLER_NAME, controllerName || '')(target);
    SetMetadata(QUEUE_CONTROLLER_OPTIONS, queueControllerOptions);
  };
}
