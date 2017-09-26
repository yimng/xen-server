import { noSuchObject } from 'xo-common/api-errors'

import { Licenses as LicenseDb } from '../models/license'
import { mapToArray } from '../utils'

// ===================================================================

export default class Licenses {
  constructor (xo) {
      this._licenses = new LicenseDb({
      connection: xo._redis,
      prefix: 'xo:license',
      indexes: ['expire']
    })

    xo.on('clean', () => licensesDb.rebuildIndexes())
    xo.on('start', () => {
      xo.addConfigManager('licenses',
        () => licensesDb.get(),
        licenses => Promise.all(mapToArray(licenses, license =>
          licensesDb.save(license)
        ))
      )
    })
  }

  async importLicense(license) {
    const lic = await this._licenses.create(license)
    return lic.properties
  }

  async getLicense () {
    const license = await this._licenses.get()
    return license[0].properties
  }
}
