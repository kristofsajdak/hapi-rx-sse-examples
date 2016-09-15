const Hapi = require('hapi');
const hapiRxSSE = require('hapi-rx-sse');
const rxNoKafka = require('rx-no-kafka');
const Kafka = require('no-kafka');
const url = require('url');

const kafkaHostUrl = process.env.DOCKER_HOST;
const kafkaHostName = kafkaHostUrl ? url.parse(kafkaHostUrl).hostname : '127.0.0.1';
const options = { connectionString: `${kafkaHostName}:9092` };

const server = new Hapi.Server();
server.connection({ port: 9090 });
server.route({
    path: '/events/streaming',
    method: 'GET',
    handler: (req, reply) => {

        const observable = rxNoKafka
            .createObservable({
                consumer: new Kafka.SimpleConsumer(options),
                topic: 'all',
                partition: 0
            })
            .map(toSSE)
            .filter(createQueryParamsFilter(req))

        hapiRxSSE.stream(observable, req, reply);
    }
});

function toSSE(message) {
    return {
        id: message.offset,
        event: message.key,
        data: message.value.toString('utf8')
    }
}

function createQueryParamsFilter(req) {
    return function (message) {
        const filterEventQueryParam = req.query['filter[event]'];
        if (filterEventQueryParam) {
            const filterEvents = filterEventQueryParam.split(',');
            const match = _.find(filterEvents, (filterEvent) => new RegExp(filterEvent).test(sseObject.event));
            return !_.isEmpty(match)
        }
        return true
    }
}

module.exports = server;