import fs from 'fs-extra'
import * as child from 'child_process'
// ===================================================================

export function clean () {
  return this.clean()
}

clean.permission = 'admin'

// -------------------------------------------------------------------

export async function importLicense () {
  return {
    $sendTo: await this.registerHttpRequest(async (req, res) => {
      const licensefile = '/etc/license'
      const dest = fs.createWriteStream(licensefile)
      req.pipe(dest)
      const src = fs.createReadStream(licensefile)
      const de = child.spawn('gpg', ['--status-fd', '2', '--decrypt'])
      src.pipe(de.stdin)
      de.stderr.on('data', (data) => {
        console.log(`gpg stderr:\n${data}`)
      })

      de.stdout.on('data', (data) => {
        console.log(`gpg stdout:\n${data}`)
        this.importLicense(JSON.parse(data))
      })

      res.end('license successfully imported')
    })
  }
}

importLicense.permission = 'admin'

export async function getLicense () {
  const licensefile = '/etc/license'
  const src = fs.createReadStream(licensefile)
  const de = child.spawn('gpg', ['--status-fd', '2', '--decrypt'])
  src.pipe(de.stdin)
  de.stderr.on('data', (data) => {
    let validsig = false
    let trust = false
    let validfinger = false
    console.log(`gpg stderr:\n${data}`)
    let lines = data.split('\n')
    lines.forEach(function(line) {
      if (line.startsWith('[GNUPG:] GOODSIG')) {
        validsig = true
      }
    })
    lines.forEach(function(line) {
      if (line.startsWith('[GNUPG:] TRUST_ULTIMATE')) {
        trust = true
      }
    })
    lines.forEach(function(line) {
      if (line.startsWith('[GNUPG:] VALIDSIG')) {
        let finger = line.split(' ')[2]  
        if (finger === 'A83B AA6F 2FD3 B493 256F  E753 D544 C62C 6AE0 3E6D') {
          validfinger = true
        }
      }
    })

    if (!validsig || !trust || !validfinger) {
      throw new Error('The licnse file is invalid')
    }
  })
  de.stdout.on('data', (data) => {
    console.log(`gpg stdout:\n${data}`)
    this.importLicense(JSON.parse(data))
    return JSON.parse(data)
  })
}

get.permission = 'admin'
get.description = 'Gets existing License'


