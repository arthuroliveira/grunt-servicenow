'use strict';

module.exports = function (grunt) {
    require('./init')(grunt);
    require('./pull')(grunt);
	require('./pullLike')(grunt);
    require('./push')(grunt);
	require('./pushLike')(grunt);
    require('./runserver')(grunt);
};
