var require_config = require("./helper/config_validator");

var fs = require('fs');
var path = require('path');
var inquirer = require('inquirer');

module.exports = function (grunt) {
    // ?
    // Is this for testing purpose? I believe we can get away from it by npm link and npm link grunt-servicenow
    require('load-grunt-tasks')(grunt);

    var snConfig = grunt.file.readJSON('.sn-config.json');

    var watchObj = {};
    for (key in snConfig.folders) {
        watchObj[key] = {
            files: ['dist/' + key + '/*'],
            tasks: ['push:' + key + ':<%= filechanged %>']
        };
    }

    // TODO This should be moved to a task specific file, maybe a helper that runs before every servicenow task
    var destination = path.join(process.cwd(), "dist");
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination);
    }

    // TODO This should be moved to the task specific file. e.g.  ./tasks/pull.js
    var questions = [
        {
            type: "checkbox",
            config: "tables",
            message: "What table(s) do you want to pull?",
            choices: Object.keys(snConfig.folders)
        }, {
            type: "confirm",
            config: "existing_files",
            message: "Do you want to pull the existing files?",
            default: false
        }, {
            type: "input",
            config: "specific",
            message: "What filename do you want to pull?",
            when: function (answers) {
                return !answers.existing_files;
            }
        }
    ];

    grunt.initConfig({
        //This allows us to refer to the values of properties within our package.json file. e.g. <%= pkg.name %>
        pkg: grunt.file.readJSON('package.json'),
        //This allows us to refer to the values of properties within our .sn-config.json file. e.g. <%= pkg.project_prefix %>
        sn_config: snConfig,
        pull: snConfig.folders,
        push: snConfig.folders,
        watchAndPush: watchObj,
        prompt: {
            pull: {
                options: {
                    questions: questions
                }
            }
        }

    });

    // TODO This should be removed if we don't want to offer watchAndPush functionality (filesync alike)
    grunt.event.on('watch', function (action, filepath) {
        grunt.config(['filechanged'], filepath);
    });


    grunt.loadNpmTasks('grunt-servicenow');
    //    OR (TBD)
    // grunt.task.loadTasks('./tasks');


    grunt.registerTask("yo", ['prompt:pull', 'pullSN']);
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.task.renameTask("watch", "watchAndPush");

    //	TODO Tasks should be moved to ./tasks/
    //	Make sure to add new tasks to /tasks/index.js
    //	grunt.registerTask("pullSN",[]);


};