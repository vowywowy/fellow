'use strict';
const fellow = {
    // BLE
    namePrefix: 'FELLOW',
    service: 'internet_protocol_support',
    characteristic: 'age',
    //0xefdd0b3031323334353637383930313233349a6d,
    authenticate: Uint8Array.of(
        0xef, 0xdd, 0x0b, 0x30,
        0x31, 0x32, 0x33, 0x34,
        0x35, 0x36, 0x37, 0x38,
        0x39, 0x30, 0x31, 0x32,
        0x33, 0x34, 0x9a, 0x6d
    ),
    //0xefdd0a0000010100
    power_on: Uint8Array.of(
        0xef, 0xdd, 0x0a, 0x00,
        0x00, 0x01, 0x01, 0x00
    ),
    //0xefdd0a0400000400
    power_off: Uint8Array.of(
        0xef, 0xdd, 0x0a, 0x04,
        0x00, 0x00, 0x04, 0x00
    ),
    celciusMax: 100
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('temp').addEventListener('input', (e) => {
        document.getElementById('temp_unit').textContent = (
            e.target.value < fellow.celciusMax ? "Celcius" : "Fahrenheit"
        )
        console.log(e.target.value)
    })
    document.getElementById('connect').addEventListener('click', () => {
        navigator.bluetooth.requestDevice({
            filters: [{
                namePrefix: fellow.namePrefix,
                services: [fellow.service]
            }]
        })
        .then(device => {
            console.log(device);
            return device.gatt.connect();
        })
        .then(server => {
            console.log(server);
            return server.getPrimaryService(fellow.service);
        })
        .then(service => {
            console.log(service);
            return service.getCharacteristic(fellow.characteristic);
        })
        .then(characteristic => {
            console.log(characteristic)
            characteristic.writeValueWithoutResponse(fellow.authenticate);
            ['on', 'off'].forEach(powerMode => {
                document.getElementById(powerMode).addEventListener('click', () => {
                    console.log(characteristic)
                    characteristic.writeValueWithoutResponse(fellow[`power_${powerMode}`])
                })
            });
        })
        .catch(error => {console.log(error)})
    });
})
