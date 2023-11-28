# Azure Service Bus Nestjs Wrapper

This is a wrapper library which provides modules for [Azure Service Bus](https://www.npmjs.com/package/@azure/service-bus) package. It allows to create Queues/Controllers using decorators just as Nestjs.

## Installation

```
npm install @azure/service-bus
npm install @sede-x/azure-service-bus-nestjs-wrapper
```

## Design walkthrough

There are some design liberty taken which needs to be familiar with.

- **QueueController:** Similar to controllers in Nestjs, QueueController acts as a parent and holds all the queue paths and message types. It can take a name or can be empty. Any class can be created as a QueueController by using decorator @QueueController()

```
import {QueueController} from "@sede-x/azure-service-bus-nestjs-wrapper"

@QueueController('cats')
export class CatsQueueController{

}
```

- **Queue:** Queues will create a queue in Azure Service Bus and register the method decorated with @Queue() as the message processor. It will take a name as parameter which will be the name of queue.

  > Name of the queue depends on QueueController name and Queue name. If QueueController name is provided, it will be used as a suffix with Queue name separated by '.'. This separator is configurable from dynamic module creation. It QueueController name is empty, Azure Service Bus queue will be create with just the name provided to @Queue()

```
import {ServiceBusReceivedMessage,ServiceBusReceiver} from '@azure/service-bus';
import {QueueController} from "@sede-x/azure-service-bus-nestjs-wrapper"

@QueueController('cats')
export class CatsQueueController{

  @Queue('cat-adopted')
  async catAdopted(message: ServiceBusReceivedMessage, serviceBusReceiver: ServiceBusReceiver): Promise<void>{
    console.log(message.body);
    return serviceBusReceiver.completeMessage(message);
  }
}
```
