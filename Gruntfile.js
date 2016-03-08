var require_config = require("./helper/config_validator");

var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
    var snConfig = grunt.file.readJSON('.sn-config.json');

    var watchObj = {};
    for (key in snConfig.folders) {
        watchObj[key] = {
            files: ['dist/' + key + '/*'],
            tasks: ['push:' + key + ':<%= filechanged %>']
        };
    }

	grunt.initConfig({
        //This allows us to refer to the values of properties within our package.json file. e.g. <%= pkg.name %>
        pkg: grunt.file.readJSON('package.json'),
        //This allows us to refer to the values of properties within our .sn-config.json file. e.g. <%= pkg.project_prefix %>
        sn_config: snConfig,
        pull: snConfig.folders,
        push: snConfig.folders,
        watchAndPush: watchObj,
		destination : "dist"


    });

    // TODO This should be removed if we don't want to offer watchAndPush functionality (filesync alike)
    grunt.event.on('watch', function (action, filepath) {
        grunt.config(['filechanged'], filepath);
    });


    grunt.loadNpmTasks('grunt-servicenow');
    //    OR (TBD)
     grunt.task.loadTasks('./tasks');


    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.task.renameTask("watch", "watchAndPush");

    //	TODO Tasks should be moved to ./tasks/
    //	Make sure to add new tasks to /tasks/index.js
    //	grunt.registerTask("pullSN",[]);


};
