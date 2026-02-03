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
  const clearLogBtn = document.getElementById('clear-log');
  const logFilterInput = document.getElementById('log-filter');
  const connectionStatusPill = document.getElementById('connection-status');
  const activeDevicePill = document.getElementById('active-device');
  const lastActionPill = document.getElementById('last-action');
  const presetButtons = document.querySelectorAll('.preset-button');
  const rebootDeviceBtn = document.getElementById('reboot-device');
  const disconnectDeviceBtn = document.getElementById('disconnect-device');
  const autoScrollCheckbox = document.getElementById('auto-scroll');
  const commandPreview = document.getElementById('command-preview');
  const copyCommandBtn = document.getElementById('copy-command');
  const resetOptionsBtn = document.getElementById('reset-options');

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
  updateStatusPills({ connection: 'Searching...', device: 'Detecting device', action: 'Idle' });

  // Functions
  const defaultOptions = {
    codec: 'h265',
    recordingFormat: 'mp4',
    showTouches: false,
    fullscreen: false,
    alwaysOnTop: false,
    turnScreenOff: false,
    disableControl: false,
    stayAwake: false,
    noAudio: false,
    autoScroll: true
  };
  const presets = {
    quality: {
      resolution: '1440',
      bitrate: '16',
      maxFps: '60',
      codec: 'h265',
      audioBitrate: '256',
      windowSize: '1280x720',
      showTouches: false,
      fullscreen: false
    },
    balanced: {
      resolution: '1080',
      bitrate: '8',
      maxFps: '60',
      codec: 'h265',
      audioBitrate: '128',
      windowSize: '1280x720',
      showTouches: true,
      fullscreen: false
    },
    latency: {
      resolution: '960',
      bitrate: '4',
      maxFps: '45',
      codec: 'h264',
      audioBitrate: '96',
      windowSize: '1024x576',
      showTouches: true,
      fullscreen: false
    }
  };

  function updateStatusPills({ connection, device, action }) {
    if (connection) {
      connectionStatusPill.textContent = connection;
    }
    if (device) {
      activeDevicePill.textContent = device;
    }
    if (action) {
      lastActionPill.textContent = action;
    }
  }

  function setLastAction(text) {
    updateStatusPills({ action: text });
  }

  function appendLogEntry(data, commandType = 'local') {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');
    logEntry.dataset.logText = data.toLowerCase();
    logEntry.textContent = data;
    outputDiv.appendChild(logEntry);
    if (autoScrollCheckbox.checked) {
      outputDiv.scrollTop = outputDiv.scrollHeight;
    }
    outputDiv.scrollTop = outputDiv.scrollHeight;

    if (logFilterInput.value) {
      const query = logFilterInput.value.toLowerCase();
      logEntry.hidden = !logEntry.dataset.logText.includes(query);
    }
    if (commandType === 'error') {
      setLastAction('Action failed');
    }
  }

  function getDevices() {
    window.electronAPI.executeCommand('adb', ['devices'], 'adb-devices');
  }

  function updateDeviceDetails(deviceId) {
    if (!deviceId || deviceId === 'No devices found' || deviceId.includes('No device')) {
      deviceNameSpan.textContent = 'N/A';
      deviceBatterySpan.textContent = 'N/A';
      deviceConnectionSpan.textContent = 'N/A';
      updateStatusPills({ connection: 'Disconnected', device: 'No device selected' });
      return;
    }

    // Get device name
    window.electronAPI.executeCommand('adb', ['-s', deviceId, 'shell', 'getprop', 'ro.product.model'], 'get-device-name');

    // Get battery level
    window.electronAPI.executeCommand('adb', ['-s', deviceId, 'shell', 'dumpsys', 'battery'], 'get-battery-level');

    // Determine connection type
    const connectionType = deviceId.includes(':') ? 'Wireless' : 'USB';
    deviceConnectionSpan.textContent = connectionType;
    updateStatusPills({ connection: `Connected · ${connectionType}`, device: deviceId });
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
    if (windowSize) {
      const delimiter = windowSize.includes('x') ? 'x' : windowSize.includes(',') ? ',' : null;
      if (delimiter) {
        const [width, height] = windowSize.split(delimiter).map(value => value.trim());
        if (width && height) {
          args.push(`--window-width=${width}`, `--window-height=${height}`);
        }
      }
    }

    if (disableControlCheckbox.checked) args.push('-n');
    if (stayAwakeCheckbox.checked) args.push('-w');
    if (noAudioCheckbox.checked) args.push('--no-audio');
    const audioBitrate = audioBitrateInput.value;
    if (audioBitrate) args.push('--audio-bit-rate', `${audioBitrate}K`);
    
    const crop = cropInput.value;
    if (crop) args.push('--crop', crop);

    return args;
  }

  function updateCommandPreview() {
    const args = getScrcpyArgs();
    const command = ['scrcpy', ...args].join(' ');
    commandPreview.value = command;
  }

  function resetOptions() {
    resolutionInput.value = '';
    bitrateInput.value = '';
    maxFpsInput.value = '';
    codecSelect.value = defaultOptions.codec;
    encoderInput.value = '';
    fullscreenCheckbox.checked = defaultOptions.fullscreen;
    alwaysOnTopCheckbox.checked = defaultOptions.alwaysOnTop;
    showTouchesCheckbox.checked = defaultOptions.showTouches;
    turnScreenOffCheckbox.checked = defaultOptions.turnScreenOff;
    windowPosInput.value = '';
    windowSizeInput.value = '';
    disableControlCheckbox.checked = defaultOptions.disableControl;
    stayAwakeCheckbox.checked = defaultOptions.stayAwake;
    noAudioCheckbox.checked = defaultOptions.noAudio;
    audioBitrateInput.value = '';
    cropInput.value = '';
    recordingFormatSelect.value = defaultOptions.recordingFormat;
    autoScrollCheckbox.checked = defaultOptions.autoScroll;
    updateCommandPreview();
  }

  // Event Listeners
  refreshDevicesBtn.addEventListener('click', () => {
    getDevices();
    setLastAction('Refreshing devices...');
  });
  refreshDevicesBtn.addEventListener('click', getDevices);
  ipAddressInput.addEventListener('input', () => {
    ipAddressInput.classList.remove('input-error');
  });

  connectWirelessBtn.addEventListener('click', () => {
    const ipAddress = ipAddressInput.value;
    const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    if (!ipAddress || !ipPattern.test(ipAddress)) {
      ipAddressInput.classList.add('input-error');
      appendLogEntry('Invalid IP address. Example format: 192.168.1.10', 'error');
      setLastAction('Fix wireless IP');
      return;
    }
    ipAddressInput.classList.remove('input-error');
    updateStatusPills({ action: 'Connecting wirelessly...' });
    if (ipAddress) {
      window.electronAPI.executeCommand('adb', ['tcpip', '5555'], 'adb-tcpip');
      setTimeout(() => {
        window.electronAPI.executeCommand('adb', ['connect', `${ipAddress}:5555`], 'adb-connect');
        setTimeout(getDevices, 1000); // Refresh devices after connecting
      }, 1000);
    }
  });

  rebootDeviceBtn.addEventListener('click', () => {
    const selectedDevice = deviceSelect.value;
    if (!selectedDevice || selectedDevice.includes('No device')) {
      appendLogEntry('No device selected to reboot.', 'error');
      return;
    }
    window.electronAPI.executeCommand('adb', ['-s', selectedDevice, 'reboot'], 'adb-reboot');
    setLastAction('Rebooting device...');
  });

  disconnectDeviceBtn.addEventListener('click', () => {
    const selectedDevice = deviceSelect.value;
    if (!selectedDevice || selectedDevice.includes('No device')) {
      appendLogEntry('No device selected to disconnect.', 'error');
      return;
    }
    if (!selectedDevice.includes(':')) {
      appendLogEntry('Disconnect is only available for wireless devices.', 'error');
      return;
    }
    window.electronAPI.executeCommand('adb', ['disconnect', selectedDevice], 'adb-disconnect');
    setLastAction('Disconnecting device...');
  });
  
  startMirroringBtn.addEventListener('click', () => {
    console.log('Starting mirroring...');
    setLastAction('Starting mirroring...');
    const args = getScrcpyArgs();
    window.electronAPI.executeCommand('scrcpy', args);
    updateCommandPreview();
  });

  recordScreenBtn.addEventListener('click', async () => {
    console.log('Starting screen recording...');
    setLastAction('Preparing recording...');
    const format = recordingFormatSelect.value;
    const filePath = await window.electronAPI.showSaveDialog(format);
    if (filePath) {
      const args = getScrcpyArgs();
      args.push('--record', filePath);
      window.electronAPI.executeCommand('scrcpy', args);
      updateCommandPreview();
    }
  });

  window.electronAPI.onCommandOutput((event, { data, commandType }) => {
    appendLogEntry(data, commandType);

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
        setLastAction('Devices refreshed');
    } else if (commandType === 'get-device-name') {
        deviceNameSpan.textContent = data.trim();
    } else if (commandType === 'get-battery-level') {
        const batteryLevelMatch = data.match(/level: (\d+)/);
        if (batteryLevelMatch && batteryLevelMatch[1]) {
            deviceBatterySpan.textContent = `${batteryLevelMatch[1]}%`;
        }
    } else if (commandType === 'adb-connect') {
        setLastAction('Wireless connection updated');
    } else if (commandType === 'adb-reboot') {
        setLastAction('Reboot command sent');
    } else if (commandType === 'adb-disconnect') {
        setLastAction('Device disconnected');
    }
  });

  copyLogBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputDiv.textContent).then(() => {
      setLastAction('Log copied');
    }).catch(err => {
      appendLogEntry(`Failed to copy log: ${err}`, 'error');
    });
  });

  const saveLogBtn = document.getElementById('save-log');
  saveLogBtn.addEventListener('click', async () => {
    const logContent = outputDiv.textContent;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `log-${timestamp}.txt`;
    
    try {
      await window.electronAPI.saveLog(logContent, defaultFilename);
      setLastAction('Log saved');
    } catch (err) {
      appendLogEntry(`Failed to save log: ${err}`, 'error');
    }
  });

  clearLogBtn.addEventListener('click', () => {
    outputDiv.innerHTML = '';
    setLastAction('Log cleared');
  });

  logFilterInput.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    const entries = outputDiv.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      entry.hidden = query ? !entry.dataset.logText.includes(query) : false;
    });
  });

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const presetKey = button.dataset.preset;
      const preset = presets[presetKey];
      if (!preset) {
        return;
      }

      resolutionInput.value = preset.resolution || '';
      bitrateInput.value = preset.bitrate || '';
      maxFpsInput.value = preset.maxFps || '';
      codecSelect.value = preset.codec || codecSelect.value;
      audioBitrateInput.value = preset.audioBitrate || '';
      windowSizeInput.value = preset.windowSize || '';
      showTouchesCheckbox.checked = preset.showTouches;
      fullscreenCheckbox.checked = preset.fullscreen;
      noAudioCheckbox.checked = false;
      disableControlCheckbox.checked = false;
      stayAwakeCheckbox.checked = true;

      setLastAction(`Preset applied: ${button.textContent}`);
      updateCommandPreview();
    });
  });

  copyCommandBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(commandPreview.value).then(() => {
      setLastAction('Command copied');
    }).catch(err => {
      appendLogEntry(`Failed to copy command: ${err}`, 'error');
    });
  });

  resetOptionsBtn.addEventListener('click', () => {
    resetOptions();
    setLastAction('Options reset');
  });

  [
    resolutionInput,
    bitrateInput,
    maxFpsInput,
    codecSelect,
    encoderInput,
    fullscreenCheckbox,
    alwaysOnTopCheckbox,
    showTouchesCheckbox,
    turnScreenOffCheckbox,
    windowPosInput,
    windowSizeInput,
    disableControlCheckbox,
    stayAwakeCheckbox,
    noAudioCheckbox,
    audioBitrateInput,
    cropInput,
    recordingFormatSelect,
    deviceSelect
  ].forEach(element => {
    element.addEventListener('input', updateCommandPreview);
    element.addEventListener('change', updateCommandPreview);
  });

  autoScrollCheckbox.addEventListener('change', () => {
    setLastAction(autoScrollCheckbox.checked ? 'Auto-scroll enabled' : 'Auto-scroll disabled');
  });

  updateCommandPreview();
    });
  });
});
