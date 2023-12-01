# Azure Service Bus Nestjs Wrapper

This is a wrapper library which provides modules for [Azure Service Bus](https://www.npmjs.com/package/@azure/service-bus) package. It allows to create Queues/Controllers using decorators just as Nestjs. Connections are pooled and reused preventing duplicate connections being made to same resource.

## Installation

```
npm install @azure/service-bus
npm install azure-service-bus-nestjs-wrapper
```

Post installation, it can be imported to root module

```
import { Module } from '@nestjs/common';
import { ServiceBusModule } from 'azure-service-bus-nestjs-wrapper';
import { CatsQueueController } from './cats.queue-controller.ts';

@Module({
  imports: [
    ServiceBusModule.forRoot({ connectionString: 'connection string' }),
  ],
  providers: [CatsQueueController],
})
export class RootModule {}
```

> [ServiceBusClientOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/servicebusclientoptions?view=azure-node-latest) and [ServiceBusAdministrationClientOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/servicebusadministrationclientoptions?view=azure-node-latest) can be provided to ServiceBusModule.forRoot() factory method.

## Design walkthrough

There are some design liberty taken which needs to be familiar with.

- **QueueController:** Similar to controllers in Nestjs, QueueController acts as a parent and holds all the queue paths and message types. It can take a name or can be empty. Any class can be created as a QueueController by using decorator @QueueController(). QueueControllers are to be added as _providers_ to root module.

```
import {QueueController} from "azure-service-bus-nestjs-wrapper"

@QueueController('cats')
export class CatsQueueController{

}
```

- **Queue:** Queues will create a queue in Azure Service Bus and register the method decorated with @Queue() as the message processor. The decorator can only be used inside a QueueController. It will take a name as parameter which will be the name of queue.

  > Name of the queue depends on QueueController name and Queue name. If QueueController name is provided, it will be used as a suffix with Queue name separated by '.'. This separator is configurable from dynamic module creation. If QueueController name is empty, Azure Service Bus queue will be create with just the name provided to @Queue()

  Below sample code will create a Service Bus queue named _'cats.cat-adopted'_.

  > [ServiceBusReceiverOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/servicebusreceiveroptions?view=azure-node-latest) and [SubscribeOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/subscribeoptions?view=azure-node-latest) can be passed to the @Queue() decorator to configure the Service Bus Receiver and its subscription respectively

```
import {ServiceBusReceivedMessage,ServiceBusReceiver} from '@azure/service-bus';
import {QueueController,Queue} from "azure-service-bus-nestjs-wrapper"

@QueueController('cats')
export class CatsQueueController{

  @Queue('cat-adopted')
  async catAdopted(message: ServiceBusReceivedMessage, serviceBusReceiver: ServiceBusReceiver): Promise<void>{
    console.log(message.body);
  }
}
```

- **MessageType:** MessageType dont create separate queues rather all MessageTypes inside a QueueController listens to a single queue with name provided in @QueueController() decorator. Messages are segregated using identifiers automatically. Best usecase would be scenarios where the rate of messages is low and the message handler processing happens quickly. It doesnt make sense to create a standalone queue for updating an order status once in a while.

  > QueueController name is mandatory if MessageTypes are used. Single Azure Service Bus queue [ServiceBusReceiverOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/servicebusreceiveroptions?view=azure-node-latest) and [SubscribeOptions](https://learn.microsoft.com/en-in/javascript/api/@azure/service-bus/subscribeoptions?view=azure-node-latest) can be passed to the @QueueController() decorator. These setting are local to the single queue used by MessageTypes only and doesnt affect settings passed to @Queue() since they create separate Azure Service Bus queue altogether.

  > Each message in MessageType queue has additional property messageType which acts as an identifier. This property name is configurable from dynamic module initialization.

  Below code will create an Azure Service Bus queue names _'cats'_ and catAdopted handler will listen to messages in 'cats' queue having identifier messagetType = 'cat-adopted'

```
import {ServiceBusReceivedMessage,ServiceBusReceiver} from '@azure/service-bus';
import {QueueController,MessageType} from "azure-service-bus-nestjs-wrapper"

@QueueController('cats')
export class CatsQueueController{

  @MessageType('cat-adopted')
  async catAdopted(message: ServiceBusReceivedMessage, serviceBusReceiver: ServiceBusReceiver): Promise<void>{
    console.log(message.body);
  }
}
```

- **Sender:** To inject senders, queue names and message types can be passed to ServiceBusModule forRoot method. It will initiate the senders and will be injected if requested.

  > MessageType sender automatically adds the messageType identifier hence no need to add it separately.

```
import { Module } from '@nestjs/common';
import { ServiceBusModule } from 'azure-service-bus-nestjs-wrapper';
import { CatsQueueController } from './cats.queue-controller.ts';

@Module({
  imports: [
    ServiceBusModule.forRoot({
      connectionString: 'connection string',
      queueSendersToBeInjected: ['cats.cat-adopted'],
      messageTypeSendersToBeInjected: [
        {
          queueName: 'cats',
          messageTypeNames: ['cat-adopted'],
        },
      ],
    }),
  ],
  providers: [CatsQueueController],
})
export class RootModule {}
```

Senders can then be injected using decorators @InjectMessageTypeSender() and @InjectQueueSender().

```
import { Injectable } from "@nestjs/common";
import { ServiceBusSender } from '@azure/service-bus';
import { InjectMessageTypeSender, InjectQueueSender, MessageTypeSender} from "azure-service-bus-nestjs-wrapper";

@Injectable()
export class CatsService{

    constructor(
       @InjectQueueSender('cats.cat-adopted') private readonly queueSenderCatAdopted: ServiceBusSender,
       @InjectMessageTypeSender('cats','cat-adopted') private readonly messageTypeSenderCatAdopted: MessageTypeSender,
    ){

    }

    adoptCat(){
        //Queue Sender
        this.queueSenderCatAdopted.sendMessages({body:'Yay!'})

        //MessageType Sender
        this.messageTypeSenderCatAdopted.sendMessages({body:'Yay!'})
    }
}
```
