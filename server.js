const dotenv = require('dotenv').config();
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const db = require('./app/config/db');
const Discord = require('discord.js');

const app = express();
app.use(bodyParser.urlencoded({extended: true}));



const port = 2001;



MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err);
    const client = new Discord.Client();
    client.login(process.env.DISCORD_BOT_TOKEN);
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
    });
    app.use(function (req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Max-Age", "1800");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.setHeader("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, PATCH, OPTIONS");
        next();
    });

    require('./app/routes')(app, database.db("savage-dl"), client);
    app.listen(port, () => {
        console.log("We are live on " + port);
    });
});