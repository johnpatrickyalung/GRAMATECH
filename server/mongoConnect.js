const ATLAS_PATTERNS = [/mongodb\+srv:\/\//i, /\.mongodb\.net/i]

export function isAtlasUri(uri) {
  return ATLAS_PATTERNS.some((re) => re.test(uri))
}

export function getMongoConnectOptions(uri) {
  const atlas = isAtlasUri(uri)
  const base = {
    serverSelectionTimeoutMS: atlas ? 30000 : 10000,
    connectTimeoutMS: atlas ? 30000 : 10000,
    socketTimeoutMS: atlas ? 45000 : 20000,
  }
  if (!atlas) return base
  return {
    ...base,
    family: 4,
    autoSelectFamily: false,
    retryWrites: true,
    retryReads: true,
    ...(process.env.MONGODB_TLS_RELAXED === 'true'
      ? { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true }
      : {}),
  }
}
