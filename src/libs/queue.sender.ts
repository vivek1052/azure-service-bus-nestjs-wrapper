import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
  ServiceBusSender,
} from '@azure/service-bus';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export class QueueSender {
  private serviceBusSender: ServiceBusSender;

  constructor(
    private readonly queueName: string,
    private readonly serviceBusClient: ServiceBusClient,
    private readonly serviceBusAdministrationClient: ServiceBusAdministrationClient,
    private readonly logger: Logger,
  ) {}

  async connect(): Promise<this> {
    await this.createQueueInServiceBus();

    this.serviceBusSender = this.serviceBusClient.createSender(this.queueName);

    return this;
  }

  getSender(): ServiceBusSender {
    return this.serviceBusSender;
  }

  private async createQueueInServiceBus(): Promise<any> {
    if (
      !(await this.serviceBusAdministrationClient.queueExists(this.queueName))
    ) {
      try {
        await this.serviceBusAdministrationClient.createQueue(this.queueName);
        this.logger.log(
          `Queue ${this.queueName} created in service bus successfully`,
        );
      } catch (error) {
        throw new InternalServerErrorException(
          `Unable to create queue ${this.queueName} in service bus`,
        );
      }
    }
  }
}
