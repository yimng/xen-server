import Collection from '../collection/redis'
import Model from '../model'

// ===================================================================

export default class License extends Model {}

License.prototype.default = {
  permission: 'none'
}

// -------------------------------------------------------------------

export class Licenses extends Collection {
  get Model () {
    return License 
  }

  async create (properties) {
    const license = new License(properties)
    return /* await */ this.add(license)
  }
  async save (license) {
    return /* await */ this.update(license)
  }
  async get (properties) {
    const users = await super.get(properties)
    return users
  }
}
