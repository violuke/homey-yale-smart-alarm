'use strict';

const Homey = require('homey');
const request = require('request');
const requestPromise = require('request-promise');

class YaleSmartAlarm extends Homey.App {
	onInit() {
        // Listen to flow actions
        let fullyArmAction = new Homey.FlowCardAction('fully_arm');
        fullyArmAction
            .register()
            .registerRunListener((args, state) => {
                    let isCompleted = this.fullyArm();
                    return Promise.resolve(isCompleted);
                }
            );

        let partArmAction = new Homey.FlowCardAction('part_arm');
        partArmAction
            .register()
            .registerRunListener((args, state) => {

                    let isCompleted = this.partArm();
                    return Promise.resolve(isCompleted);
                }
            );

        let disarmAction = new Homey.FlowCardAction('disarm');
        disarmAction
            .register()
            .registerRunListener((args, state) => {

                    let isCompleted = this.disarm();
                    return Promise.resolve(isCompleted);
                }
            );

        // Setup the request handler. We need to keep cookies.
        this.requestPromise = requestPromise.defaults({jar: true});

        this.log('Yale Smart Alarm App is running...');
	}

    fullyArm() {
		this.log('Fully arm starting');

        let that = this;

        return new Promise(function (resolve, reject) {
            return resolve(that.alarmStateChange('arm', that));
        }).catch(function(err) {
            that.log('Error with main promise', err);
            return Promise.reject(err);
        });
	}

    partArm() {
		this.log('Part arm starting');

        let that = this;

        return new Promise(function (resolve, reject) {
            return resolve(that.alarmStateChange('home', that));
        }).catch(function(err) {
            that.log('Error with main promise', err);
            return Promise.reject(err);
        });
	}

    disarm() {
		this.log('Disarm starting');

        let that = this;

        return new Promise(function (resolve, reject) {
            return resolve(that.alarmStateChange('disarm', that));
        }).catch(function(err) {
            that.log('Error with main promise', err);
            return Promise.reject(err);
        });
	}

    // getLoginId() {
    //     return Homey.get('username');
    // }
    //
    // getLoginPassword() {
    //     const Homey = require('homey');
    //     return Homey.get('password');
    // }

	alarmStateChange(newState, that) {
        //
        // Login to alarm system
        //
        return that.requestPromise({
            uri: 'https://www.yalehomesystem.co.uk/homeportal/api/login/check_login/',
            method: 'POST',
            form: {
                id: Homey.ManagerSettings.get('username'),
                password: Homey.ManagerSettings.get('password')
            },
            headers: {
                'User-Agent': 'YaleSmartAlarm/Homey Integration by violuke.'
            },
            json: true // Automatically parses the JSON string in the response
        }).then(function (parsedBody) {
            // Ensure login was successful
            if (parsedBody.result == 0){
                that.log('Login to alarm system failed with code:', parsedBody.code, 'and message:', parsedBody.message);
                throw 'Login failed';
            }
            that.log('Logged into alarm ok:', parsedBody);

            // Do state change
            that.log('About to do state change to', newState);

            //
            // State change
            //
            return that.requestPromise({
                uri: 'https://www.yalehomesystem.co.uk/homeportal/api/panel/set_panel_mode?area=1&mode='+newState,
                method: 'POST',
                form: {
                    id: Homey.ManagerSettings.get('username'),
                    password: Homey.ManagerSettings.get('password')
                },
                headers: {
                    'User-Agent': 'YaleSmartAlarm/Homey Integration by violuke.'
                },
                json: true // Automatically parses the JSON string in the response
            }).then(function (parsedBody) {
                // Ensure action was successful
                if (parsedBody.result == 0){
                    that.log('State change of alarm system failed with code:', parsedBody.code, 'and message:', parsedBody.message);
                    throw 'State change failed';
                }
                that.log('State change of alarm ok:', parsedBody);

                return Promise.resolve(true);

            }).catch(function (err) {
                that.log('Alarm state change failed with exception:', err);
                throw err;
            }).finally(function (){
                //
                // Logout
                ///
                that.log('Logging out...');
                return that.requestPromise({
                    uri: 'https://www.yalehomesystem.co.uk/homeportal/api/logout/',
                    headers: {
                        'User-Agent': 'YaleSmartAlarm/Homey Integration by violuke.'
                    },
                    json: true // Automatically parses the JSON string in the response
                }).then(function (parsedBody) {
                    // Ensure action was successful
                    that.log('Logout completed ok');

                }).catch(function (err) {
                    that.log('Failed to logout of alarm:', err);
                });
            });

        }).catch(function (err) {
            that.log('Login to alarm system failed with exception:', err);
            throw err;
        });
    }
}

module.exports = YaleSmartAlarm;
