const uuid = require('node-uuid');
const kafkaSSEFilter = require('./kafka-sse-filter');

const args = process.argv;

const producer = kafkaSSEFilter.createProducer();

producer.init()
    .then(()=> send(producer, args[2], args[3]))
    .then(()=> producer.end())
    .then(()=> process.exit());

function send(producer, type, title) {
    return producer.send({
        topic: 'all',
        partition: 0,
        message: {
            key: `${type}.insert`,
            value: JSON.stringify({
                id: uuid.v4(),
                type,
                attributes: {
                    title
                }
            })
        }
    });
}
