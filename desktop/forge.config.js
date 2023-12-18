module.exports = {
  packagerConfig: {
    asar: true,
    icon: './favicon.ico'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ITSTelegram-v3',
        icon: './favicon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        name: 'ITSTelegram-v3',
        options: {
          icon: './favicon.ico'
        }
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        name: 'ITSTelegram-v3',
        options: {
          icon: './favicon.ico'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        name: 'ITSTelegram-v3',
        icon: './favicon.ico'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ]
};
