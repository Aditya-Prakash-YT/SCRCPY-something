document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const deviceSelect = document.getElementById('device');
  const refreshDevicesBtn = document.getElementById('refresh-devices');
  const ipAddressInput = document.getElementById('ip-address');
  const connectWirelessBtn = document.getElementById('connect-wireless');
  const startMirroringBtn = document.getElementById('start-mirroring');
  const recordScreenBtn = document.getElementById('record-screen');
  const recordingFormatSelect = document.getElementById('recording-format');
  const outputDiv = document.getElementById('output');
  const copyLogBtn = document.getElementById('copy-log');

  // Device Details Elements
  const deviceNameSpan = document.getElementById('device-name');
  const deviceBatterySpan = document.getElementById('device-battery');
  const deviceConnectionSpan = document.getElementById('device-connection');

  // Input Elements
  const resolutionInput = document.getElementById('resolution');
  const bitrateInput = document.getElementById('bitrate');
  const maxFpsInput = document.getElementById('max-fps');
  const codecSelect = document.getElementById('codec');
  const encoderInput = document.getElementById('encoder');
  const fullscreenCheckbox = document.getElementById('fullscreen');
  const alwaysOnTopCheckbox = document.getElementById('always-on-top');
  const showTouchesCheckbox = document.getElementById('show-touches');
  const turnScreenOffCheckbox = document.getElementById('turn-screen-off');
  const windowPosInput = document.getElementById('window-pos');
  const windowSizeInput = document.getElementById('window-size');
  const disableControlCheckbox = document.getElementById('disable-control');
  const stayAwakeCheckbox = document.getElementById('stay-awake');
  const noAudioCheckbox = document.getElementById('no-audio');
  const audioBitrateInput = document.getElementById('audio-bitrate');
  const cropInput = document.getElementById('crop');

  // Initial Actions
  getDevices();

  // Functions
  function getDevices() {
    window.electronAPI.executeCommand('adb', ['devices'], 'adb-devices');
  }

  function updateDeviceDetails(deviceId) {
    if (!deviceId || deviceId === 'No devices found' || deviceId.includes('No device')) {
      deviceNameSpan.textContent = 'N/A';
      deviceBatterySpan.textContent = 'N/A';
      deviceConnectionSpan.textContent = 'N/A';
      return;
    }

    // Get device name
    window.electronAPI.executeCommand('adb', ['-s', deviceId, 'shell', 'getprop', 'ro.product.model'], 'get-device-name');

    // Get battery level
    window.electronAPI.executeCommand('adb', ['-s', deviceId, 'shell', 'dumpsys', 'battery'], 'get-battery-level');

    // Determine connection type
    const connectionType = deviceId.includes(':') ? 'Wireless' : 'USB';
    deviceConnectionSpan.textContent = connectionType;
  }

  // Event Listener for device selection change
  deviceSelect.addEventListener('change', (event) => {
    updateDeviceDetails(event.target.value);
  });

  function getScrcpyArgs() {
    const args = [];
    const selectedDevice = deviceSelect.value;
    if (selectedDevice && selectedDevice !== 'No devices found' && !selectedDevice.includes('No device')) {
      args.push('-s', selectedDevice);
    }

    const resolution = resolutionInput.value;
    if (resolution) args.push('-m', resolution);
    const bitrate = bitrateInput.value;
    if (bitrate) args.push('-b', `${bitrate}M`);
    const maxFps = maxFpsInput.value;
    if (maxFps) args.push('--max-fps', maxFps);
    
    args.push('--video-codec', codecSelect.value);
    const encoder = encoderInput.value;
    if (encoder) args.push('--video-encoder', encoder);
    
    if (fullscreenCheckbox.checked) args.push('-f');
    if (alwaysOnTopCheckbox.checked) args.push('--always-on-top');
    if (showTouchesCheckbox.checked) args.push('-t');
    if (turnScreenOffCheckbox.checked) args.push('-S');
    
    const windowPos = windowPosInput.value;
    if (windowPos && windowPos.includes(',')) args.push(`--window-x=${windowPos.split(',')[0]}`, `--window-y=${windowPos.split(',')[1]}`);
    const windowSize = windowSizeInput.value;
    if (windowSize && windowSize.includes('x')) args.push(`--window-width=${windowSize.split('x')[0]}`, `--window-height=${windowSize.split('x')[1]}`);

    if (disableControlCheckbox.checked) args.push('-n');
    if (stayAwakeCheckbox.checked) args.push('-w');
    if (noAudioCheckbox.checked) args.push('--no-audio');
    const audioBitrate = audioBitrateInput.value;
    if (audioBitrate) args.push('--audio-bit-rate', `${audioBitrate}K`);
    
    const crop = cropInput.value;
    if (crop) args.push('--crop', crop);

    return args;
  }

  // Event Listeners
  refreshDevicesBtn.addEventListener('click', getDevices);

  connectWirelessBtn.addEventListener('click', () => {
    const ipAddress = ipAddressInput.value;
    if (ipAddress) {
      window.electronAPI.executeCommand('adb', ['tcpip', '5555'], 'adb-tcpip');
      setTimeout(() => {
        window.electronAPI.executeCommand('adb', ['connect', `${ipAddress}:5555`], 'adb-connect');
        setTimeout(getDevices, 1000); // Refresh devices after connecting
      }, 1000);
    }
  });
  
  startMirroringBtn.addEventListener('click', () => {
    console.log('Starting mirroring...');
    const args = getScrcpyArgs();
    window.electronAPI.executeCommand('scrcpy', args);
  });

  recordScreenBtn.addEventListener('click', async () => {
    console.log('Starting screen recording...');
    const format = recordingFormatSelect.value;
    const filePath = await window.electronAPI.showSaveDialog(format);
    if (filePath) {
      const args = getScrcpyArgs();
      args.push('--record', filePath);
      window.electronAPI.executeCommand('scrcpy', args);
    }
  });

  window.electronAPI.onCommandOutput((event, { data, commandType }) => {
    const logEntry = document.createElement('div');
    logEntry.textContent = data;
    outputDiv.appendChild(logEntry);
    outputDiv.scrollTop = outputDiv.scrollHeight;

    // Handle device list update
    if (commandType === 'adb-devices') {
        const lines = data.trim().split('\n').slice(1);
        deviceSelect.innerHTML = ''; 

        if (lines.length > 0 && lines[0].trim() !== '') {
            lines.forEach(line => {
                const deviceId = line.split('\t')[0];
                if (deviceId) {
                    const option = document.createElement('option');
                    option.value = deviceId;
                    option.textContent = deviceId;
                    deviceSelect.appendChild(option);
                }
            });
            updateDeviceDetails(deviceSelect.value); // Update details for the first device
        } else {
            const option = document.createElement('option');
            option.textContent = 'No devices found';
            option.disabled = true;
            deviceSelect.appendChild(option);
            updateDeviceDetails('No devices found');
        }
    } else if (commandType === 'get-device-name') {
        deviceNameSpan.textContent = data.trim();
    } else if (commandType === 'get-battery-level') {
        const batteryLevelMatch = data.match(/level: (\d+)/);
        if (batteryLevelMatch && batteryLevelMatch[1]) {
            deviceBatterySpan.textContent = `${batteryLevelMatch[1]}%`;
        }
    }
  });

  copyLogBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputDiv.textContent).then(() => {
      console.log('Log copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy log: ', err);
    });
  });

  const saveLogBtn = document.getElementById('save-log');
  saveLogBtn.addEventListener('click', async () => {
    const logContent = outputDiv.textContent;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `log-${timestamp}.txt`;
    
    try {
      await window.electronAPI.saveLog(logContent, defaultFilename);
      console.log('Log saved successfully!');
    } catch (err) {
      console.error('Failed to save log: ', err);
    }
  });
});