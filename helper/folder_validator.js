/**
 * Created by arthur.oliveira on 3/1/16.
 */

var fs = require('fs');

module.exports = function (folder_path) {
    // Check if config file exist inside current folder
    return new Promise(function (fulfill, reject) {
        fs.stat(folder_path, function(err, stats){
            if (err) {
                fs.mkdir(folder_path, function(mkerr, data){
                    fulfill();
                });
            } else {
                fulfill();
            }
        });
    });
};

