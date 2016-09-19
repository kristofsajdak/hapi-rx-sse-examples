const uuid = require('node-uuid');
const url = require('url');
const Kafka = require('no-kafka');

function send(producer, topic, partition, id, type, title) {
    return producer.send({
        topic: topic,
        partition: partition,
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

const args = process.argv;

const kafkaHostUrl = process.env.DOCKER_HOST;
const kafkaHostName = kafkaHostUrl ? url.parse(kafkaHostUrl).hostname : '127.0.0.1';
const options = {connectionString: `${kafkaHostName}:9092`};
const noKafkaProducer = new Kafka.Producer(options);
noKafkaProducer.init()
    .then(()=> send(noKafkaProducer, 'all', 0, uuid.v4(), args[2], args[3]))
    .then(()=> noKafkaProducer.end())
    .then(()=> process.exit());
