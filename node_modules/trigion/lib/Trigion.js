"use strict";

var extend = require('util')._extend;

var request = require('request');

function Trigion( options ) {

	this.options = extend({
		username: false,
		password: false
	}, options);

	this.jar = request.jar();

	this.apiUrl = 'https://pro.trigion.nl/AppRestService';

}

Trigion.prototype.api = function( method, path, body, callback ){
	callback = callback || function(){}

	return request({
		method	: method || 'GET',
		uri		: this.apiUrl + ( path || '/' ),
		jar		: this.jar,
		json	: body,
		headers	: {
			'User-Agent': 'eu.enai.trigion.client/Android/1.0',
			'Cookie2': '$Version=1'
		}
	}, function( err, result, body ){
		try {
			body = JSON.parse(body);
		} catch(e){}

		if( body && body.Error ) return callback( body );

		return callback( err, result, body );
	});

}

Trigion.prototype.login = function( callback ){
	callback = callback || function(){}

	this.api( 'POST', '/Login', {
		"Email": this.options.username,
		"Password": this.options.password,
		"Info": {
			"DeviceId": "unknown",
			"AppVersion": "1.0",
			"DeviceVersion": "6.0.1",
			"DeviceScreenResolution": "1080x1920",
			"DeviceType": "Android",
			"Locale": "en-US",
			"AppType": "KlantTrigion"
		}
	}, function( err, result, body ){
		if( err ) return callback( err );
		return callback( null, result.statusCode === 200 );
	})

}

Trigion.prototype.getObjects = function( callback ) {
	this.api( 'GET', '/GetObjects?AuthTypes=Direct,Groups', null, function( err, result, body ){
		if( err ) return callback( err );
		return callback( null, body );
	})
}

Trigion.prototype.setAlarm = function( opts, callback ){

	opts = extend({
		"alarm_id": "1",
		"reference": "0",
		"endTime": new Date((new Date()).getTime() + (4*60*60*1000)) // + 4h
	}, opts);

	this.api( 'POST', '/SetObjectScheduleTime', {
		"AuthType": "Direct",
		"Reference": opts.reference,
		"Id": opts.alarm_id,
		"EndTime": Math.round( opts.endTime.getTime() / 1000 )
	}, function( err, result, body ){
		if( err ) return callback( err );
		return callback( null, body );
	})

}

module.exports = Trigion;