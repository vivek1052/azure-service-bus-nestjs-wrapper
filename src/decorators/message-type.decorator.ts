import { SetMetadata } from '@nestjs/common';
import { MESSAGE_TYPE } from '../constants';

/**
 * MessageType decorator will create a queue with the name of QueueController
 * and different MessageType will be produced on the same queue with unique identifier
 * @param messageType
 * @returns MethodDecorator
 */
export function MessageType(messageType: string): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    SetMetadata(MESSAGE_TYPE, messageType)(target, propertyKey, descriptor);
  };
}
