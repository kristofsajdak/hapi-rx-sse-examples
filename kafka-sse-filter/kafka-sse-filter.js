const Hapi = require('hapi');
const hapiRxSSE = require('hapi-rx-sse');
const rxNoKafka = require('rx-no-kafka');
const Kafka = require('no-kafka');
const url = require('url');
const _ = require('lodash');
const uuid = require('node-uuid');
const Inert = require('inert');
const Path = require('path');

const kafkaHostUrl = process.env.DOCKER_HOST;
const kafkaHostName = kafkaHostUrl ? url.parse(kafkaHostUrl).hostname : '127.0.0.1';
const options = {connectionString: `${kafkaHostName}:9092`};

function createServer() {
    const server = new Hapi.Server({
        connections: {
            routes: {
                files: {
                    relativeTo: Path.join(__dirname, 'public')
                }
            }
        }
    });
    server.register(Inert, () => {
    });
    server.connection({port: 8088});
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true
            }
        }
    });
    server.route({
        path: '/events/streaming',
        method: 'GET',
        handler: (req, reply) => {

            const observable = rxNoKafka
                .createObservable({
                    consumer: new Kafka.SimpleConsumer(options),
                    topic: 'all',
                    partition: 0,
                    offset: req.headers['last-event-id']
                })
                .map(toSSE)
                .filter(createQueryParamsFilter(req));

            hapiRxSSE.stream(observable, req, reply);
        }
    });
    return server;
}

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
            const match = _.find(filterEvents, (filterEvent) => new RegExp(filterEvent).test(message.event.toString()));
            return !_.isEmpty(match);
        }
        return true
    }
}

function createProducer() {
    return new Kafka.Producer(options);
}

function send(producer, id, type, title) {
    return producer.send({
        topic: 'all',
        partition: 0,
        message: {
            key: `${type}.insert`,
            value: JSON.stringify({
                id,
                type,
                attributes: {
                    title
                }
            })
        }
    });
}

module.exports.createServer = createServer;
module.exports.createProducer = createProducer;
module.exports.send = send;


