var syncDataHelper = require('../helper/sync_data_validator');

var crypto = require('crypto');

module.exports = function (sync_data) {

    var saveHash = function (file_path, hash) {
        if (!(file_path in sync_data)) {
            sync_data[file_path] = {}
        }
        sync_data[file_path].hash = hash;

        syncDataHelper.saveData(sync_data);
    };

    this.hashContent = function (content) {
        return crypto.createHash('md5').update(content).digest('hex');
    };

    this.compareHash = function (file_path) {
        var that = this;
        return new Promise(function (fulfill, reject) {
            fs.readFile(config_path, 'utf8', function (err, data) {
                var hash_comparison;

                if (err) {
                    console.log(err);
                } else {
                    var file_hash = that.hashContent(data);
                }

                if (!(file_path in sync_data)) {
                    // Use a logger
                    console.log("Hash doesn't exist, creating one.");
                    hash_comparison = true;
                } else {
                    hash_comparison = sync_data[file_path].hash == file_hash
                }


                if (hash_comparison) {
                    fulfill();
                } else {
                    reject();
                }
            });
        });
    };

    return this;
};
