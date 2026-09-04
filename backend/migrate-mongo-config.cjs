const config = {
  mongodb: {
    url: process.env.MONGODB_URI ?? 'mongodb://mongo:27017/klipa?replicaSet=rs0',
    databaseName: process.env.MONGODB_DB_NAME ?? undefined,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
