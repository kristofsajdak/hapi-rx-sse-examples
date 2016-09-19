const Exiting = require('exiting');

const kafkaSSEFilter = require('./kafka-sse-filter');

const server = kafkaSSEFilter.createServer();
new Exiting.Manager(server).start((err)=> {
    if (err) throw err;
    console.log('Server started at:', server.info.uri)
});