import { Inject } from '@nestjs/common';
import { getQueueSenderToken } from '../libs/sender-provider-utils';

export const InjectQueueSender = (queueName): ParameterDecorator =>
  Inject(getQueueSenderToken(queueName));
