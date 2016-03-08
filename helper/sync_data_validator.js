/**
 * Created by arthur.oliveira on 3/2/16.
 */

var fs = require('fs'),
    path = require('path'),
    sync_data_path = path.join(process.cwd(), ".sn-sync_data.json");

module.exports = function () {

    this.loadData = function () {

        return new Promise(function (fulfill, reject) {

            fs.lstat(sync_data_path, function (err, stats) {
                if (err) {
                    if (err.code == 'ENOENT') {
                        fs.writeFile(sync_data_path, JSON.stringify({}), function (err) {
                            fulfill(JSON.parse({}));
                        });
                    }
                } else {
                    fs.readFile(sync_data_path, 'utf8', function (err, data) {
                        if (err) {
                            console.log(err)
                        } else {
                            if (data.length === 0) {
                                data = "{}";
                                return reject()
                            }
                            fulfill(JSON.parse(data));
                        }
                    });
                }
            });

        });
    };

    this.saveData = function (sync_data) {
        return new Promise(function (fulfill, reject) {
            fs.writeFile(sync_data_path, JSON.stringify(sync_data), function (err) {
                if (err) {
                    return console.log(err);
                    reject();
                }
                console.log("The sync file was saved!");
                fulfill();
            });
        });


    }

    return this;
}();
