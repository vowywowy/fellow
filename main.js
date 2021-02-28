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
    //0xefdd0a(ss)01(tt)(ww)01
    set_temp: (temp) => Uint8Array.of(
        0xef, 0xdd, 0x0a, 0x00,
        0x01, temp, temp, 0x01
    ),
    celsius: {
        max: 100,
        min: 40,
    },
    fahrenheit: {
        max: 212,
        min: 104,
    },
    protocol: {
        start_seq: [0xff, 0xff, 0xff, 0xff],
        track_seq: (i) => [0xef, 0xdd, i],
    },
    off_temp: 0
}

document.addEventListener('DOMContentLoaded', () => {
    ['change','input'].forEach(event => {
        document.getElementById('temp').addEventListener(event, e =>{
            switch (event) {
                case 'change':
                    document.getElementById('temp').value = Math.min(
                        Math.max(
                            e.target.value,
                            fellow.celsius.min
                        ),
                        fellow.fahrenheit.max
                    )
                    break;
                case 'input':
                    document.getElementById('temp_unit').textContent = `°${(
                        e.target.value <= fellow.celsius.max ? "C" : "F"
                    )}`
                    break;
            }
        })
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
            if(characteristic.uuid){
                document.querySelectorAll(".auth_control").forEach(authControl => {
                    authControl.disabled = false
                })
            }
            characteristic.writeValueWithoutResponse(fellow.authenticate);
            characteristic.startNotifications().then(_ => {
                let previous_packet;
                let next_packet;
                characteristic.addEventListener('characteristicvaluechanged', e => {
                    let packet = []
                    for (let i = 0; i < e.target.value.byteLength; i++){
                        packet.push(e.target.value.getUint8(i))
                    }
                    //console.log(packet)
                    switch (JSON.stringify(packet)) {
                        case JSON.stringify(fellow.protocol.start_seq):
                            previous_packet = 'start'
                            break;
                        case JSON.stringify(fellow.protocol.track_seq(packet[2])):
                            if (previous_packet == 'start'){
                                next_packet = 'current_temp'
                            } else if (previous_packet == 'current_temp') {
                                next_packet = 'set_temp'
                            }
                            break;
                        default:
                            if (next_packet == 'current_temp'){
                                console.log(`current: ${packet[0]}`)
                                previous_packet = 'current_temp'
                                if (packet[0] != fellow.off_temp) {
                                    document.getElementById('current_temp').textContent = packet[0]
                                }
                            } else if (next_packet == 'set_temp'){
                                console.log(`set: ${packet[0]}`)
                                previous_packet = null
                                next_packet = null
                                document.getElementById('target_temp').textContent = packet[0]
                            }
                            break;
                    }
                });
            });
            ['on', 'off'].forEach(powerMode => {
                document.getElementById(powerMode).addEventListener('click', () => {
                    console.log(characteristic)
                    characteristic.writeValueWithoutResponse(fellow[`power_${powerMode}`])
                })
            });
            document.getElementById('set_temp').addEventListener('click',() => {
                console.log(characteristic)
                characteristic.writeValueWithoutResponse(fellow.set_temp(document.getElementById('temp').value))
            })
        })
        .catch(error => {console.log(error)})
    });
})
