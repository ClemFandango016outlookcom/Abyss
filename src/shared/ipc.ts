// Central registry of IPC channel names so main + preload stay in sync.

export const IPC = {
  // window controls
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',

  // settings
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',

  // accounts / auth
  accountsList: 'accounts:list',
  accountLogin: 'account:login',
  accountLogout: 'account:logout',
  accountSetActive: 'account:setActive',

  // minecraft versions / launching
  mcVersions: 'mc:versions',
  loaderVersions: 'mc:loaderVersions',
  instanceLaunch: 'instance:launch',
  instanceKill: 'instance:kill',
  launchStatus: 'launch:status', // main -> renderer event

  // instances
  instancesList: 'instances:list',
  instanceCreate: 'instance:create',
  instanceUpdate: 'instance:update',
  instanceDelete: 'instance:delete',
  instanceOpenFolder: 'instance:openFolder',
  instanceDuplicate: 'instance:duplicate',

  // mods (modrinth)
  modrinthSearch: 'modrinth:search',
  modrinthProject: 'modrinth:project',
  modrinthVersions: 'modrinth:versions',
  modInstall: 'mod:install',
  modRemove: 'mod:remove',
  modToggle: 'mod:toggle',
  modUpdatesCheck: 'mod:updatesCheck',
  modUpdate: 'mod:update',
  modpackInstall: 'modpack:install',
  gameLog: 'game:log', // main -> renderer event

  // friends
  friendsList: 'friends:list',
  friendAdd: 'friend:add',
  friendRemove: 'friend:remove',
  friendUpdate: 'friend:update',

  // app self-update
  updateCheck: 'update:check',
  updateInstall: 'update:install',
  updateStatusGet: 'update:statusGet',
  updateStatus: 'update:status' // main -> renderer event
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
