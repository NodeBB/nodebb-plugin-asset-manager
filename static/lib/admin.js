'use strict';
/* globals $, app, socket */

define('admin/plugins/asset-manager', ['settings', 'uploader', 'csrf'], function(Settings, uploader, csrf) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('asset-manager', $('.asset-manager-settings'));

		$('#save').on('click', function() {
			Settings.save('asset-manager', $('.asset-manager-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'asset-manager-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});

		$('button[data-action="upload"]').on('click', function() {
			$(this).parents('form').ajaxSubmit({
				headers: {
					'x-csrf-token': csrf.get()
				},
				resetForm: true,
				clearForm: true,

				error: function(err) {
					app.alertError('error!', err.message);
				},

				success: function() {
					app.alertSuccess('success');
					console.log(arguments);
				}
			});
		});
	};

	return ACP;
});