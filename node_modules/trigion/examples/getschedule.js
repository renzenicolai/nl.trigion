var Trigion = require('..');

if( process.argv.length != 4 ) return console.error('usage:', 'node', require('path').basename(__filename), 'username', 'password');

var t = new Trigion({
	username: process.argv[2],
	password: process.argv[3]
})

t.login(function( err, result ){
	if( err ) return console.error(err);
	console.log('login', arguments)

	t.getObjects(function( err, result ){
		if( err ) return console.error(err);
		console.log('result', result[0].AlarmObjects[0])

		t.getAlarm({
			reference: result[0].AlarmObjects[0].R
		}, function( err, result, body ){
			if( err ) return console.error(err);
			console.log("Alarm is currently set to '"+body[0]['EndTime']+"'")
		})
	})
})
