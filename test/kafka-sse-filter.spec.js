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


describe(`Given an SSE endpoint /events/streaming mapped to topic 'all' partition 0
          And that partition contains 3 messages`, function () {

    const id1 = uuid.v4();
    const id2 = uuid.v4();
    const id3 = uuid.v4();

    beforeEach(function () {
        return kafkaSSEFilter.send(this.producer, id1, 'books', 'test title1')
            .then(()=>kafkaSSEFilter.send(this.producer, id2, 'books', 'test title2'))
            .then((result)=> this.offset = result[0].offset)
            .then(()=>kafkaSSEFilter.send(this.producer, id3, 'books', 'test title3'));
    });

    describe(`When an EventSource is created for /events/streaming 
        'And specifies a last-event-id equal to the id of the second message`, function () {

        beforeEach(function () {
            this.source = new EventSource(baseUrl + '/events/streaming', {headers: {'Last-Event-ID': this.offset}})
        });

        it(`Then the EventSource should receive the second and third event`, function (done) {
            Rx.Observable.fromEvent(this.source, 'books.insert')
                .bufferWithCount(2)
                .subscribe((events) => {
                    assertEventState(events[0], 'books.insert', id2, 'test title2');
                    assertEventState(events[1], 'books.insert', id3, 'test title3');
                    this.source.close();
                    done()
                })
        })
    })
});


describe(`Given an SSE endpoint /events/streaming mapped to topic 'all' partition 0
    When an EventSource is created for /events/streaming?filter[event]=books.insert,records.insert
    And 3 new event message are added to that topic/partition : 1 books.insert, 1 dvds.insert, 1 books.insert`, function () {

    beforeEach(function (done) {
        this.source = new EventSource(baseUrl + '/events/streaming?filter[event]=books.insert,records.insert');
        Rx.Observable.fromEvent(this.source, 'open')
            .subscribe(() => {
                return kafkaSSEFilter.send(this.producer, uuid.v4(), 'books', 'test title1')
                    .then(() => kafkaSSEFilter.send(this.producer, uuid.v4(), 'dvds', 'test title2'))
                    .then(() => kafkaSSEFilter.send(this.producer, uuid.v4(), 'books', 'test title3'))
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


function assertEventState(e, type, id, title) {
    expect(e.type).to.equal(type)
    var parsed = JSON.parse(e.data)
    expect(parsed.id).to.equal(id)
    expect(parsed.attributes).to.deep.equal({
        title: title
    })
}


