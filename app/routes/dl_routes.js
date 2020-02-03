var ObjectID = require('mongodb').ObjectID;
var Binary = require('mongodb').Binary;
const baseURL = "https://ci.savagelabs.net";
const axios = require('axios').default;
const Path = require('path');
const fs = require('fs');
const DiscordOAuth2 = require("discord-oauth2");
const oauth = new DiscordOAuth2();
const fetch = require('node-fetch');
const FormData = require('form-data');
const uuid = require('uuid/v1');


module.exports = function (app, db, client) {

    let sessions = new Map();


    app.get('/auth/setup/:code', (req, res) => {
        const code = req.params.code;
        console.log(`Code: ${code}`);
        const data = new FormData();
        data.append('client_id', process.env.CLIENT_ID);
        data.append('client_secret', process.env.CLIENT_SECRET);
        data.append('grant_type', 'authorization_code');
        data.append('redirect_uri', 'http://localhost:3000/plugins');
        data.append('scope', 'identify');
        data.append('code', code);

        fetch('https://discordapp.com/api/oauth2/token', {
            method: 'POST',
            body: data,
        })
            .then(res => res.json())
            .then(token => {
                if (token.access_token) {
                    const sessionId = uuid();
                    sessions[sessionId.toString()] = token.access_token;
                    setTimeout(function () {
                        console.log("Session Expired: " + sessionId);
                        sessions.delete(sessionId);
                    }, token.expires_in);
                    console.log(token);
                    res.send({code: sessionId});
                } else {
                    console.log("Auth: Invalid Token Request Received.");
                    res.send({code: "INVALID_AUTH_CODE"})
                }
            })
    });

    app.get(`/auth/name/:code`, (req, res) => {
        console.log("Getting user information.");
        const session = req.params.code;
        const token = sessions[session];
        if (!token) {
            console.log("Invalid Token");
            console.log("Current Sessions: " + sessions);
            res.send({message: "Invalid Session ID."});

            return;
        }
        console.log("Token is: " + token);
        fetch('https://discordapp.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${sessions[session]}`
            }
        })
            .then(res => res.json())
            .then(response => res.send({message: "Success", tag: response.username + "#" + response.discriminator}));
    });


    app.get('/builds/:name/:session', (req, res) => {
        const name = req.params.name;
        const session = req.params.session;

        if (sessions.has(session.toString())) {
            console.log(sessions);
            res.send({error: "Invalid Session: " + session});
            return;
        }

        fetch('https://discordapp.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${sessions[session]}`
            }
        })
            .then(res => res.json())
            .then(user => {
                if (user.id) {
                    return client.guilds.get("410507206648135681").members.get(user.id).roles.map(role => role.name.toLocaleLowerCase())
                } else {
                    res.send("Invalid user.")
                }
            })
            .then(roles => roles.includes(name.toLowerCase()))
            .then(result => {
                if (result) {
                    console.log("Approved for " + name);
                    let axiosInstance = axios.create({
                        baseURL: "https://ci.savagelabs.net/app/rest/",
                        headers: {
                            'Authorization':
                                'Bearer ' + process.env.TEAMCITY
                        }
                    });

                    var path = null;
                    var link = null;
                    var buildID = null;
                    const buildsCollection = db.collection('builds');

                    axiosInstance.get("builds/project:" + name + "/artifacts/")
                        .then(function (response) {
                            // console.log(response.data);
                            link = baseURL + response.data.file[0].href.replace("metadata", "content");
                            buildID = response.data.file[0].href.split("/")[4].replace("id:", "");
                            path = Path.resolve(__dirname, "files", name + "-" + buildID + ".jar");
                            // If mongodb has file return;
                            let fileInDb = false;
                            buildsCollection.findOne({buildID: buildID}, (err, results) => {
                                if (results) {
                                    let fileToDl = __dirname + "/staging/" + name + "-" + buildID + ".jar";
                                    fs.writeFile(fileToDl, results.file_data.buffer, function (err) {
                                        if (!err) {
                                            console.log("successfully saved.");
                                            fileInDb = true;
                                            res.download(fileToDl);
                                        }
                                    });
                                }
                            });
                            if (fileInDb) return;
                            return axiosInstance.request({url: link, method: 'GET', responseType: 'stream'})
                        })
                        .catch(function (error) {
                            // handle error
                            console.log(error);
                        })
                        .then(function (response) {
                            // console.log(response);
                            response.data.pipe(fs.createWriteStream(path));
                            const data = Binary(fs.readFileSync(path));
                            var insertData = {buildID};
                            insertData.file_data = data;
                            buildsCollection.insert(insertData, function (error, result) {
                            });
                            res.download(path, function (err) {
                                if (err) {
                                    // Check if headers have been sent
                                    if (res.headersSent) {
                                        // You may want to log something here or do something else
                                    } else {
                                        return res.sendStatus(404); // 404, maybe 500 depending on err
                                    }
                                }
                                // Don't need res.end() here since already sent
                            });
                            // res.send("success")
                        })
                        .catch(function (error) {
                            console.log(error)
                        })
                } else res.send({error: "You do not have permission to download this resource, as you do not have the role."})
            });
    });
};