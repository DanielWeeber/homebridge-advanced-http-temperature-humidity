var Service, Characteristic;
var request = require('request');
var pollingtoevent = require("polling-to-event");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-advancedhttptemperaturehumidity", "AdvancedHttpTemperatureHumidity", AdvancedHttpTemperatureHumidity);
}

function AdvancedHttpTemperatureHumidity(log, config) {
    this.log = log;
    this.humidityService = false;

    // Config
    this.url = config["url"];
    this.http_method = config["http_method"] || "GET";
    this.sendimmediately = config["sendimmediately"] || false;
    this.username = config["username"] || "";
    this.password = config["password"] || "";

    this.name = config["name"];

    this.manufacturer = config["manufacturer"] || "HttpTemperatureHumidity";
    this.model = config["model"] || "Default";
    this.serial = config["serial"] || "18981898";

    this.disableHumidity = config["humidity"] || false;
    
    //realtime changes
    
       //realtime polling info
    this.state = false;
    this.currentlevel = 0;
    this.enableSet = true;
    var that = this;
    
    


     var statusemitter = pollingtoevent(function (callback) {
     that.log('Entered Polling-to-Event-Function');    
     that.httpRequest(that.url, "", "GET", that.username, that.password, that.sendimmediately, function (error, response, responseBody) {

            if (error) {
                that.log('Get Temperature failed: %s', error.message);
                callback(error);
            } else {
                that.log('Get JSON in Auto-Update succeeded!');
                that.log(responseBody);
                //var info = JSON.parse(responseBody);
                //var temperature = parseFloat(info.temperature);
                //that.log(temperature);
                //that.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                
                //that.log('Temp auto update sent'); 
                //if (this.humidityService !== false) {
                //    var humidity = parseFloat(info.humidity);
                //    that.log(humidity);
                    //that.humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                //    that.log('Hum auto update sent'); 
                //    that.humidity = humidity;
                //}

                callback(null, responseBody);
                }
        });
    
        }, { longpolling: true, interval: 4000, longpollEventName: "statuspoll" });
    //statusemitter end
    
    
        function compareStates(customStatus, stateData) {
            var objectsEqual = true;
            for (var param in customStatus) {
                if (!stateData.hasOwnProperty(param) || customStatus[param] !== stateData[param]) {
                    objectsEqual = false;
                    break;
                }
            }
            // that.log("Equal", objectsEqual);
            return objectsEqual;
        }
    
     statusemitter.on("statuspoll", function (responseBody) {
      
         that.log("Change of data detected! Sending new data to HomeKit.");
         
         var info = JSON.parse(responseBody);
         var temperature = parseFloat(info.temperature);
         this.temperature = temperature;
         this.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
         var humidity = parseFloat(info.humidity);
         this.humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
         this.humidity = humidity;
                
         
         
     });
    
    
        
    
}

AdvancedHttpTemperatureHumidity.prototype = {

    httpRequest: function (url, body, method, username, password, sendimmediately, callback) {
        request({
                url: url,
                body: body,
                method: method,
                rejectUnauthorized: false,
                auth: {
                    user: username,
                    pass: password,
                    sendImmediately: sendimmediately
                }
            },
            function (error, response, body) {
                callback(error, response, body);
            })
    },

    getStateHumidity: function (callback) {
        callback(null, this.humidity);
    },

    getState: function (callback) {
        this.httpRequest(this.url, "", "GET", this.username, this.password, this.sendimmediately, function (error, response, responseBody) {

            if (error) {
                this.log('Get Temperature failed: %s', error.message);
                callback(error);
            } else {
                this.log('Get Temperature succeeded!');
                var info = JSON.parse(responseBody);

                var temperature = parseFloat(info.temperature);
                this.temperature = temperature;
                this.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);

                if (this.humidityService !== false) {
                    var humidity = parseFloat(info.humidity);

                    this.humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                    this.humidity = humidity;
                }

                callback(null, temperature);
            }
        }.bind(this));
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        var services = [],
            informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        services.push(informationService);

        temperatureService = new Service.TemperatureSensor(this.name);
        temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getState.bind(this));
        services.push(temperatureService);

        if (this.disableHumidity !== true) {
            this.humidityService = new Service.HumiditySensor(this.name);
            this.humidityService
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .setProps({minValue: 0, maxValue: 100})
                .on('get', this.getStateHumidity.bind(this));
            services.push(this.humidityService);
        }

        return services;
    }
};
