'use strict';
/* globals $, app, socket */

define('admin/plugins/asset-manager', ['settings', 'uploader', 'csrf', 'components'], function(Settings, uploader, csrf, components) {

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
					app.alertError(err.message);
				},

				success: function(data) {
					app.alertSuccess('File uploaded');
					templates.parse('admin/partials/asset-manager-list', data, function(html) {
						components.get('asset-manager/nofiles').remove();
						components.get('asset-manager/files').append(html);
					});
				}
			});
		});

		components.get('asset-manager/files')
			.on('click', '[data-action="delete"]', function() {
				var parentEl = $(this).parents('div[data-uuid]'),
					uuid = parentEl.attr('data-uuid');

				bootbox.confirm('Are you sure you want to delete this file?', function(ok) {
					if (ok) {
						socket.emit('plugins.asset-manager.delete', {
							uuid: uuid
						}, function(err) {
							if (err) {
								return app.alertError(err.message);
							}

							parentEl.remove();
							if (!components.get('asset-manager/files').find('div').length) {
								ajaxify.refresh();
							}
						});
					}
				});
			});
	};

	return ACP;
});