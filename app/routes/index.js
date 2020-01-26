const dlRoutes = require('./dl_routes');


// We can have files PER route.
module.exports = function (app, db) {
    dlRoutes(app, db)
};