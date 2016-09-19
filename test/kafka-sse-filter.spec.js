'use strict';

const _ = require('lodash');
const Rx = require('rx');
const uuid = require('node-uuid');
const chai = require('chai');
const expect = chai.expect;
const Kafka = require('no-kafka');
const url = require('url');
const EventSource = require('eventsource');

const kafkaSSEFilter = require('../kafka-sse-filter/kafka-sse-filter');

const baseUrl = 'http://localhost:8088';

beforeEach(function () {
    this.producer = kafkaSSEFilter.createProducer();
    return this.producer.init()
        .then(()=> kafkaSSEFilter.createServer())
        .then((server)=> {
            this.server = server;
            return server.start();
        })
});


afterEach(function () {
    return this.server.stop().then(()=> this.producer.end())
});

describe(`Given a SSE endpoint /events/streaming 
    When an EventSource is created for /events/streaming?filter[event]=books.insert,records.insert
    And 3 new event message are added to that same topic : 1 books.insert, 1 dvds.insert, 1 books.insert`, function () {

        beforeEach(function (done) {
            this.source = new EventSource(baseUrl + '/events/streaming?filter[event]=books.insert,records.insert');
            Rx.Observable.fromEvent(this.source, 'open')
                .subscribe(() => {
                    return kafkaSSEFilter.send(this.producer, 'books', 'test title1')
                        .then(() => kafkaSSEFilter.send(this.producer, 'dvds', 'test title2'))
                        .then(() => kafkaSSEFilter.send(this.producer, 'books', 'test title3'))
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


