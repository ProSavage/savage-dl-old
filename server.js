const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const db = require('./app/config/db');


const app = express();
app.use(bodyParser.urlencoded({extended: true}));


const port = 2001;



MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err);
    require('./app/routes')(app, database.db("savage-dl"));
    app.listen(port, () => {
        console.log("We are live on " + port);
    });
});