'use strict';

const _ = require('lodash');
const Rx = require('rx');
const uuid = require('node-uuid');
const chai = require('chai');
const expect = chai.expect;
const Kafka = require('no-kafka');
const url = require('url');
const EventSource = require('eventsource');

const baseUrl = 'http://localhost:8088';

beforeEach(function () {
    const kafkaHostUrl = process.env.DOCKER_HOST;
    const kafkaHostName = kafkaHostUrl ? url.parse(kafkaHostUrl).hostname : '127.0.0.1';
    this.options = { connectionString: `${kafkaHostName}:9092` };
    this.noKafkaProducer = new Kafka.Producer(this.options);
    return this.noKafkaProducer.init()
        .then(()=> require('../kafka-sse-filter/kafka-sse-filter'))
        .then((server)=> {
            this.server = server;
            return server.start();
        })
});


afterEach(function () {
    return this.server.stop().then(()=> this.noKafkaProducer.end())
});

function insert(producer, topic, partition, type, id, title) {
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

describe(`Given a SSE endpoint /events/streaming 
    When an EventSource is created for /events/streaming?filter[event]=books.insert,records.insert
    And 3 new event message are added to that same topic : 1 books.insert, 1 dvds.insert, 1 books.insert`, function () {

        beforeEach(function (done) {
            this.source = new EventSource(baseUrl + '/events/streaming?filter[event]=books.insert,records.insert');
            Rx.Observable.fromEvent(this.source, 'open')
                .subscribe(() => {
                    return insert(this.noKafkaProducer, 'all', 0, 'books', uuid.v4(), 'test title1')
                        .then(() => insert(this.noKafkaProducer, 'all', 0, 'dvds', uuid.v4(), 'test title2'))
                        .then(() => insert(this.noKafkaProducer, 'all', 0, 'books', uuid.v4(), 'test title3'))
                        .then(() => done()).catch(done)
                })
        });

        it('Then the EventSource should only receive the books.insert messages', function (done) {

            const subject = new Rx.Subject();

            Rx.Observable.fromEvent(this.source, 'books.insert').subscribe(subject);
            Rx.Observable.fromEvent(this.source, 'dvds.insert').subscribe(subject);
            Rx.Observable.fromEvent(this.source, 'records.insert').subscribe(subject);

            subject
                .take(2)
                .bufferWithCount(2)
                .subscribe((events) => {
                    events.map((event) => {
                        expect(event.type).to.equal('books.insert')
                    });
                    this.source.close();
                    subject.dispose();
                    done()
                })

        })
    });