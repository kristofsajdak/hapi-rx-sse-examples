# **kafka-sse-filter**

This sample app demonstrates how you can combine a [Kafka Observable](https://github.com/kristofsajdak/rx-no-kafka) with 
[hapi-rx-sse](https://github.com/kristofsajdak/hapi-rx-sse) to expose a Kafka topic/partition as Server-Sent Events.

[Filtering](#filter) is supported via request query parameters in the form of `?filter[events]=` 

*Coming soon*: EventSource and Last-event-id support
  
## start the Hapi server
  
```  
node index.js
```

## Open Browser

```
open http://localhost:8088/events/streaming
```

## Publish

Publish some messages

```
node publish.js dvds bleach   
node publish.js dvds dirt
node publish.js books orphanx
```

## Filter

Add the `filter[event]` query parameter to filter events

```
open http://localhost:8088/events/streaming?filter[event]=dvds.*
```

When republishing the same messages, only dvds should show up in the stream

```
node publish.js dvds bleach   
node publish.js dvds dirt
node publish.js books orphanx
```