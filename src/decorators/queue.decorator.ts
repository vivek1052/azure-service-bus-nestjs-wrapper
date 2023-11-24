import { SetMetadata } from '@nestjs/common';
import { QUEUE_NAME, QUEUE_OPTIONS } from '../constants';
import { QueueOptions } from 'src/interfaces/queue-options.interface';

/**
 *Queue Decorator will listen to the queue having name provided in QueueController + Queuename.
 eg:- QueueController('SERVICE-A') and Queue('APPROVE-ENTITY) will listen to queue SERVICE-A/APPROVE-ENTITY
 If QueueController name is empty, it will listen to queue with name queueName itself.
 * @param queueName
 * @returns MethodDecorator
 */
export function Queue(
  queueName: string,
  queueOptions: QueueOptions,
): MethodDecorator {
  return (target, propertyKey, descriptor): void => {
    SetMetadata(QUEUE_NAME, queueName)(target, propertyKey, descriptor);
    SetMetadata(QUEUE_OPTIONS, queueOptions)(target, propertyKey, descriptor);
  };
}
