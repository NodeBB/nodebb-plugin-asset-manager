var user = require.main.require('./src/user'),
	main = require('./library'),

	Sockets = {};

Sockets.delete = function(socket, data, callback) {
	user.isAdministrator(socket.uid, function(err, isAdmin) {
		if (isAdmin) {
			main.remove(data.uuid, callback);
		}
	});
}

module.exports = Sockets;