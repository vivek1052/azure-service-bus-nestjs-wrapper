import { SetMetadata } from '@nestjs/common';
import { QUEUE_CONTROLLER_NAME } from 'src/constants';

/**
 *
 * @param controllerName
 * @returns ClassDecorator
 */
export function QueueController(controllerName?: string): ClassDecorator {
  return (target: Function): void => {
    SetMetadata(QUEUE_CONTROLLER_NAME, controllerName || '')(target);
  };
}
