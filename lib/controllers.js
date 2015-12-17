'use strict';

var main = module.parent.exports,

	Controllers = {};

Controllers.listAssets = function(req, res, next) {
	main.list(function(err, files) {
		res.render('assets', {
			files: files
		});
	});
};

Controllers.renderAdminPage = function (req, res, next) {
	main.list(function(err, files) {
		res.render('admin/plugins/asset-manager', {
			files: files
		});
	});
};

Controllers.handleUpload = function(req, res, next) {
	// Right now we can only handle one file at a time
	req.files.files[0].meta = {
		name: req.body['upload:name'],
		description: req.body['upload:description']
	}

	main.processUpload(req.files.files, function(err, files) {
		if (err) {
			return res.status(500).json({
				error: err.message
			});
		}

		res.status(200).json({
			files: files
		});
	});
};

module.exports = Controllers;