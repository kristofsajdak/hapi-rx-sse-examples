# **kafka-sse-filter**

This sample app demonstrates how you can combine a [Kafka Observable](https://github.com/kristofsajdak/rx-no-kafka) with 
[hapi-rx-sse](https://github.com/kristofsajdak/hapi-rx-sse) to expose a Kafka topic/partition as Server-Sent Events, and consume those event messages with an [html5 Eventsource](http://www.html5rocks.com/en/tutorials/eventsource/basics/)    
  
## start the Hapi server
  
```  
node index.js
```

## Open Browser

```
open http://localhost:8088/
```

## Publish

Publish some messages

```
node publish.js dvds omen   
node publish.js books orphanx
```

and watch the magic happen ( a more stylish UX coming soon :-)

## Filter

The current filter on the SSE endpoint is set to include dvds.* and books.* events

```
var source = new EventSource('/events/streaming?filter[event]=books.*,dvds.*');
```

When publishing same messages on let's say cds, no updates should flow through

```
node publish.js cds bleach   
```

Change the filter parameter to include other types of events 

For example

```
var source = new EventSource('/events/streaming?filter[event]=books.*,cds.*');
```