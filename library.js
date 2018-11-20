"use strict";

var path = require('path');
var fs = require('fs');
var async = require.main.require('async');
var winston = require.main.require('winston');
var nconf = require.main.require('nconf');
var mv = require('mv');
var pretty = require('prettysize');
var express = require.main.require('express');

var db = require.main.require('./src.database');
var utils = require.main.require('./src/utils');

var plugin = {
	ready: false,
	settings: {
		storage: path.join(nconf.get('base_dir'), nconf.get('upload_path'), 'asset-manager')
	}
};

plugin.init = function(params, callback) {
	var router = params.router;
	var hostMiddleware = params.middleware;
	var hostControllers = params.controllers;
	var controllers = require('./lib/controllers');

	var multipart = require.main.require('connect-multiparty');
	var multipartMiddleware = multipart();
	var middlewares = [multipartMiddleware, hostMiddleware.validateFiles, hostMiddleware.applyCSRF];

	// Websockets
	var SocketPlugins = require.main.require('./src/socket.io/plugins');
	var SocketMethods = require('./websockets');
	SocketPlugins['asset-manager'] = SocketMethods;
		
	router.get('/admin/plugins/asset-manager', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/asset-manager', controllers.renderAdminPage);

	router.get('/assets', hostMiddleware.buildHeader, controllers.listAssets);
	router.get('/api/assets', controllers.listAssets);

	router.use('/assets', express.static(plugin.settings.storage));
	router.post('/asset-manager/upload', middlewares, controllers.handleUpload);

	// Create storage directory if not already created
	fs.access(plugin.settings.storage, fs.R_OK | fs.W_OK, function(err, perms) {
		if (err) {
			if (err.code === 'ENOENT') {
				// Directory missing, create directory
				winston.info('[asset-manager] Upload directory does not exist! Creating...');
				fs.mkdir(plugin.settings.storage, function() {
					plugin.ready = true;
				});
			} else if (err.code === 'EACCES') {
				winston.error('[asset-manager] Cannot read and write to output directory, plugin disabled');
			}
		} else {
			winston.verbose('[asset-manager] Startup checks... ' + 'OK'.green);
			plugin.ready = true;
		}
	});

	callback();
};

plugin.list = function(callback) {
	async.waterfall([
		async.apply(db.getSortedSetRange, 'asset-manager:assets', 0, -1),
		async.apply(plugin.get)
	], callback);
};

plugin.get = function(uuids, callback) {
	if (!Array.isArray(uuids)) {
		uuids = [uuids];
	}

	var keys = uuids.map(function(uuid) {
		return 'asset-manager:file:' + uuid;
	});

	async.waterfall([
		async.apply(db.getObjects, keys),
		function(files, next) {
			next(null, files.map(function(file, idx) {
				file.uuid = uuids[idx];
				file.prettySize = pretty(parseInt(file.size, 10));
				return file;
			}));
		}
	], callback);
};

plugin.remove = function(uuid, callback) {
	db.getObjectField('asset-manager:file:' + uuid, 'path', function(err, path) {
		async.series([
			async.apply(db.sortedSetRemove, 'asset-manager:assets', uuid),
			async.apply(db.delete, 'asset-manager:file:' + uuid),
			async.apply(fs.unlink, path)
		], callback);
	});
};

plugin.processUpload = function(files, callback) {
	var uuids = [];
	async.each(files, function(fileObj, next) {
		var targetPath = path.join(plugin.settings.storage, fileObj.originalFilename),
			uuid = utils.generateUUID();

		uuids.push(uuid);

		async.series([
			function(next) {
				// Move to storage location
				mv(fileObj.path, targetPath, next);
			},
			function(next) {
				// Index the file
				db.sortedSetAdd('asset-manager:assets', Date.now(), uuid, next);
			},
			function(next) {
				// Save meta data into database
				console.log(fileObj);
				db.setObject('asset-manager:file:' + uuid, {
					name: fileObj.meta.name,
					description: fileObj.meta.description,
					path: targetPath,
					size: fileObj.size,
					fileName: fileObj.originalFilename,
					type: fileObj.type
				}, next);
			}
		], function(err) {
			if (err) {
				return callback(err);
			}

			// If no error, then retrieve the files from the db and return in cb
			plugin.get(uuids, callback);
		});
	});
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/asset-manager',
		icon: 'fa-tint',
		name: 'Asset Manager'
	});

	callback(null, header);
};

plugin.addNavigation = function(menu, callback) {
	menu = menu.concat(
		[
			{
				"route": "/assets",
				"title": "Assets",
				"iconClass": "fa-file",
				"text": "Files made available for download"
			}
		]
	);

	callback (null, menu);
};

module.exports = plugin;
