module.exports = function (grunt) {
	grunt.registerTask('pullLike', 'Pull wrapper to add prefix.', function (folder_name,prefix) {

		grunt.config.set("pull_prefix",prefix);

		grunt.task.run("pull:" + folder_name);
	});
}
