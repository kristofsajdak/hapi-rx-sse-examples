const uuid = require('node-uuid');
const kafkaSSEFilter = require('./kafka-sse-filter');

const args = process.argv;

const producer = kafkaSSEFilter.createProducer();

producer.init()
    .then(()=> kafkaSSEFilter.send(producer, uuid.v4(), args[2], args[3]))
    .then(()=> producer.end())
    .then(()=> process.exit());