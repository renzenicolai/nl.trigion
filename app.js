'use strict';

const Homey = require('homey');
const Trigion = require('trigion');

class TrigionApp extends Homey.App {
	
	onInit() {
		this.alarm_previous_setpoint = new Date(0);
		this.alarm_current_setpoint = new Date(0); //Before querying the server we assume the alarm is set to epoch
				
		let settings = Homey.ManagerSettings;
		this.user = settings.get('user');
				
		if (!this.user) {
			this.log('Not logged in.');
			return callback( new Error( __('not_logged_in') ) );
		}
		
		let scheduleAction = new Homey.FlowCardAction('schedule');
		scheduleAction
			.register()
			.registerRunListener(( args, state ) => {
				var now = new Date();
				args.time = args.time.split(':');
				var alarmTime = new Date( now.getFullYear(), now.getMonth(), now.getDate(), args.time[0], args.time[1] );
				
				if( alarmTime < now ) {
					alarmTime.setDate(alarmTime.getDate() + 1);
				}
				
				var status = false;
				this.log("Absolute reschedule to "+alarmTime);
				this.alarmSet( alarmTime, (err, result) => {
					if ( !err ) status = result;
				});
				this.statusUpdate();
				return Promise.resolve( status );
			});
		
		let scheduleRelativeAction = new Homey.FlowCardAction('scheduleRelative');
		scheduleRelativeAction
			.register()
			.registerRunListener(( args, state ) => {
				var alarmTime = new Date((new Date()).getTime() + (args.addHours*60*60*1000));
				alarmTime.setSeconds(0); //Round time to minutes								
				var status = false;
				this.alarmSet( alarmTime, (err, result) => {
					if ( !err ) { 
						status = result;
						this.log("Could not reschedule "+result);
					}
					this.log("Rescheduled to "+alarmTime);
				});
				this.statusUpdate();
				return Promise.resolve( status );
			});
			
		let alarmStateCondition = new Homey.FlowCardCondition('alarm_state');
		alarmStateCondition
			.register()
			.registerRunListener(( args, state ) => {
				let active = this.alarmCheckActive(new Date());
				return Promise.resolve( active );
			})
			
		let alarmSetpointBeforeRelativeCondition = new Homey.FlowCardCondition('alarm_setpoint_before_relative');
		alarmSetpointBeforeRelativeCondition
			.register()
			.registerRunListener(( args, state ) => {
				let active = this.alarmCheckActive(new Date((new Date()).getTime() + (args.time*60*60*1000)));
				return Promise.resolve( active );
			})
					
		this.statusUpdate();
		this.timerStart();
		this.log('Trigion app has been started.');
	}
	
	alarmSet( alarmTime, callback ) {
		var trigion = new Trigion({
			username: this.user.username,
			password: this.user.password
		});
		
		trigion.login(( err, result ) => {
			if ( err ) return callback(err.Error.ErrorText);
			trigion.getObjects(( err, result ) => {
				if ( err ) return callback(err.Error.ErrorText);
				alarmTime.setSeconds(0);
				trigion.setAlarm({
					reference	: result[0].AlarmObjects[0].R,
					endTime		: alarmTime
				}, ( err, result ) => {
					if( err ) return callback(err.Error.ErrorText);
					if( result.ResultCode === 'Ok' ) {
						return callback( null, true );
					} else {
						return callback( result.ResultText );
					}
				})
			})
		})
	}
	
	alarmGet( callback ) {
		var trigion = new Trigion({
			username: this.user.username,
			password: this.user.password
		});
		
		trigion.login(( err, result ) => {
			if ( err ) return callback(err.Error.ErrorText);
			trigion.getObjects(( err, result ) => {
				if ( err ) return callback(err.Error.ErrorText);
				trigion.getAlarm({
					reference: result[0].AlarmObjects[0].R
				}, ( err, result, body ) => {
					if( err ) return console.error(err);
					var endTime = new Date(body[0]['EndTime']*1000);
					endTime.setSeconds(0);
					return callback( null, endTime );   
				});
			})
		})
	}
	
	alarmCheckActive(when) {
		var result = false;
		when.setSeconds(0);
		var setTo = this.alarm_current_setpoint.getTime();
		var compareTo = when.getTime();
		if (setTo<compareTo) result = true;
		this.log("Alarm is active? "+setTo+"<"+compareTo+" ("+this.alarm_current_setpoint+"<"+when+") = "+result);
		return result;
	}
	
	statusUpdate() {
		this.alarmGet(( err, result ) => {
			if ( err ) {
				this.log("Error while updating alarm setpoint: "+err);
			} else {
				this.alarm_current_setpoint = result;
				if ((this.alarm_previous_setpoint.getTime()==this.alarm_current_setpoint.getTime())||(this.alarm_previous_setpoint.getTime()==0)) {
					this.log("Alarm setpoint did not change: "+this.alarm_current_setpoint);
				} else {
					this.log("Alarm setpoint updated: "+this.alarm_current_setpoint);
					var tokens = { "time": this.alarm_current_setpoint.getHours()+":"+this.alarm_current_setpoint.getMinutes() };
					let setpointChangedTrigger = new Homey.FlowCardTrigger('setpoint_changed');
					setpointChangedTrigger
						.register()
						.trigger( tokens )
							.catch( this.error )
							.then( this.log("Trigger: setpoint changed") )
				}
				this.alarm_previous_setpoint = this.alarm_current_setpoint;
			}
		});
	}
	
	timerStart() {
		let settings = Homey.ManagerSettings;
		var refresh_interval = settings.get('auto_refresh');
		if (typeof this.update_interval !== 'undefined' && typeof this.update_interval !== 'undefined') {
			clearInterval(this.update_interval); // clear running interval
			this.log('Interval disabled');
		}
		
		if (typeof refresh_interval == 'number' && refresh_interval > 0) {
			this.update_interval = setInterval(() => {
				this.statusUpdate();
			}, 60000 * refresh_interval);
			this.log("Interval enabled ("+refresh_interval+" mins)");
		}
	}
}

module.exports = TrigionApp;
