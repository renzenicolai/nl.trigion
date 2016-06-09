"use strict";

const Trigion = require('trigion');

function init() {

	console.log("nl.trigion running...");

	Homey.manager('flow').on('action.schedule', function( callback, args ){

		var user = Homey.manager('settings').get('user');

		var t = new Trigion({
			username: user.username,
			password: user.password
		})

		var now = new Date();
		args.time = args.time.split(':');
		var alarmTime = new Date( now.getFullYear(), now.getMonth(), now.getDate(), args.time[0], args.time[1] );

		// if time is less than now, next day
		if( alarmTime < now ) {
			alarmTime.setDate(alarmTime.getDate() + 1);
		}

		t.login(function( err, result ){
			if( err ) return callback(err.Error.ErrorText);

			t.getObjects(function( err, result ){
				if( err ) return callback(err.Error.ErrorText);

				t.setAlarm({
					reference	: result[0].AlarmObjects[0].R,
					endTime		: alarmTime
				}, function( err, result ){
					if( err ) return callback(err.Error.ErrorText);
					if( result.ResultCode === 'Ok' ) {
						return callback( null, true );
					} else {
						return callback( result.ResultText );
					}
				})
			})
		})

	})

	Homey.manager('flow').on('action.scheduleRelative', function( callback, args ){

		var user = Homey.manager('settings').get('user');

		var t = new Trigion({
			username: user.username,
			password: user.password
		})

		var endTime = new Date((new Date()).getTime() + (args.addHours*60*60*1000));

		t.login(function( err, result ){
			if( err ) return callback(err.Error.ErrorText);

			t.getObjects(function( err, result ){
				if( err ) return callback(err.Error.ErrorText);

				t.setAlarm({
					reference	: result[0].AlarmObjects[0].R,
					endTime		: endTime
				}, function( err, result ){
					if( err ) return callback(err.Error.ErrorText);
					if( result.ResultCode === 'Ok' ) {
						return callback( null, true );
					} else {
						return callback( result.ResultText );
					}
				})
			})
		})

	})

}

module.exports.init = init;