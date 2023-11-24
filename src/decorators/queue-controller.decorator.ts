import { ServiceBusReceiverOptions } from '@azure/service-bus';
import { SetMetadata } from '@nestjs/common';
import { QUEUE_CONTROLLER_NAME, QUEUE_CONTROLLER_OPTIONS } from '../constants';

/**
 *
 * @param controllerName
 * @returns ClassDecorator
 */
export function QueueController(
  controllerName?: string,
  serviceBusReceiverOptions?: ServiceBusReceiverOptions,
): ClassDecorator {
  return (target: Function): void => {
    SetMetadata(QUEUE_CONTROLLER_NAME, controllerName || '')(target);
    SetMetadata(QUEUE_CONTROLLER_OPTIONS, serviceBusReceiverOptions)(target);
  };
}
