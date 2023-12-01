import { Inject } from '@nestjs/common';
import { getMessageTypeSenderToken } from '../libs/sender-provider-utils';

export const InjectMessageTypeSender = (
  queueName,
  messageTypeName,
): ParameterDecorator =>
  Inject(getMessageTypeSenderToken(queueName, messageTypeName));
