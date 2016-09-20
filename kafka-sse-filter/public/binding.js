$(function () {

    // very simple impl.
    // todo add some visuals to this sample app

    var titleDiv = $('#title');
    var source = new EventSource('/events/streaming?filter[event]=books.*,dvds.*');

    var subject = new Rx.Subject();
    Rx.Observable.fromEvent(source, 'books.insert').subscribe(subject);
    Rx.Observable.fromEvent(source, 'dvds.insert').subscribe(subject);

    subject.subscribe(
        function (e) {
            console.log('Received data: ' + e.data);
            const parsed = JSON.parse(e.data);
            titleDiv.html('<a>' + parsed.attributes.title + '</a>');
        },
        function (err) {
            console.error(err);
        },
        function () {
            console.log('completed');
        });

});