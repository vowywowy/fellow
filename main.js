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
    celcius: {
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
    off_temp: 0,
}

let bluetoothDevice;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect').addEventListener('click', () => {
        navigator.bluetooth.requestDevice({
            filters: [{
                namePrefix: fellow.namePrefix,
                services: [fellow.service]
            }]
        }).then(device => {
            bluetoothDevice = device
            bluetoothDevice.addEventListener('gattserverdisconnected', () => connect());
            connect()
        }).catch(error => console.log(error))
    });
})
function setStatus(status) { document.getElementById('connection_status').textContent = status }
function connect() {
    setStatus("Connecting")
    bluetoothDevice.gatt.connect()
    .then(server => {
        setStatus("Getting service");
        console.log(server)
        return server.getPrimaryService(fellow.service);
    }).then(service => {
        console.log(service);
        setStatus("Getting characteristic")
        return service.getCharacteristic(fellow.characteristic);
    }).then(characteristic => {
        let detectedUnit;
        console.log(characteristic)
        if (characteristic.uuid) {
            document.querySelectorAll(".auth_control").forEach(authControl => {
                authControl.disabled = false
            })
        }
        setStatus("Authenticating")
        characteristic.writeValueWithoutResponse(fellow.authenticate);
        document.getElementById('set_temp').addEventListener('change', e => {
            e.target.value = Math.min(
                Math.max(
                    e.target.value,
                    fellow[detectedUnit].min
                ),
                fellow[detectedUnit].max
            );
            characteristic.writeValueWithoutResponse(fellow.set_temp(e.target.value));
        });
        ['on', 'off'].forEach(powerMode => {
            document.getElementById(powerMode).addEventListener('click', () => {
                console.log(characteristic)
                characteristic.writeValueWithoutResponse(fellow[`power_${powerMode}`])
            })
        });
        setStatus("Getting temperature");
        characteristic.startNotifications().then(_ => {
            document.querySelectorAll(".auth_control").forEach(authControl => {
                authControl.disabled = false
            })
            setStatus("Connected");
            let previous_packet;
            let next_packet;
            characteristic.addEventListener('characteristicvaluechanged', e => {
                let packet = []
                for (let i = 0; i < e.target.value.byteLength; i++) {
                    packet.push(e.target.value.getUint8(i))
                }
                switch (JSON.stringify(packet)) {
                    case JSON.stringify(fellow.protocol.start_seq):
                        previous_packet = 'start'
                        break;
                    case JSON.stringify(fellow.protocol.track_seq(packet[2])):
                        if (previous_packet == 'start') {
                            next_packet = 'current_temp'
                        } else if (previous_packet == 'current_temp') {
                            next_packet = 'target_temp'
                        }
                        break;
                    default:
                        if (next_packet == 'current_temp') {
                            console.log(`current temp: ${packet[0]}`)
                            previous_packet = next_packet
                            if (packet[0] != fellow.off_temp) {
                                document.getElementById('kettle_status').textContent = "Heating"
                                document.getElementById(next_packet).textContent = packet[0]
                            } else {
                                document.getElementById('kettle_status').textContent = "Off"
                                document.getElementById(next_packet).textContent = "--"
                            }
                        } else if (next_packet == 'target_temp') {
                            console.log(`target temp: ${packet[0]}`)
                            detectedUnit = packet[0] <= fellow.celcius.max ? 'celcius' : 'fahrenheit';
                            document.getElementById('set_temp').min = fellow[detectedUnit].min
                            document.getElementById('set_temp').max = fellow[detectedUnit].max
                            document.getElementById('set_temp').placeholder = (fellow[detectedUnit].max + fellow[detectedUnit].min) / 2
                            document.querySelectorAll('.temp_unit').forEach(temp_unit => {
                                temp_unit.textContent = `°${detectedUnit == 'celcius' ? "C" : "F"}`
                            })
                            document.getElementById(next_packet).textContent = packet[0]
                            previous_packet = null
                            next_packet = null
                        }
                        break;
                }
            });
        });
    }).catch(() => connect())
}