var ObjectID = require('mongodb').ObjectID;


module.exports = function (app, db) {
    app.get('/notes/:id', (req, res) => {
        console.log("bruh");
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('users').findOne(details, (err, item) => {
            if (err) {
                res.send({ 'error': 'Something went wrong.'})
            } else {
                res.send(item)
            }
        });
    });
    app.post('/create-user', (req, res) => {
        // We create the user here.
        const user = {id: req.body.id};
        db.collection('users').insert(user, (err, results) => {
            if (err) {
                res.send({ 'error': 'Something went wrong.'})
            } else {
                res.send(results.ops[0])
            }
        })
    });


};