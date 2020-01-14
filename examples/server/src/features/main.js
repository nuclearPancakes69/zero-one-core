import z from '@z1/lib-feature-box-server'

// kits
// import account from '@z1/kit-account-server'
// import bucketStorage from '@z1/kit-bucket-storage-server'
import account from '@z1/kit-account-server-nedb'
import bucketStorage from '@z1/kit-bucket-storage-server-nedb'

// feature ctx
const ctx = {}

// exports
export const features = z.combine([account(ctx), bucketStorage(ctx)])
