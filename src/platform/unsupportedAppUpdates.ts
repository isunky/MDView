import type { AppUpdateClient } from './appUpdates'

/** Used by browser builds where desktop package updates do not apply. */
export const unsupportedAppUpdateClient: AppUpdateClient = {
  async getDistribution() {
    return 'unsupported'
  },
  async checkForUpdate() {
    return null
  },
  async downloadAndInstall() {
    throw new Error('Application updates are only available in the desktop app.')
  },
  async openLatestRelease() {
    window.open('https://github.com/isunky/MDView/releases/latest', '_blank', 'noopener,noreferrer')
  },
}
