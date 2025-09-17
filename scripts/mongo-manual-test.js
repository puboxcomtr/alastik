#!/usr/bin/env node
/**
 * MongoDB Manuel Test Scripti
 */

const { MongoClient } = require('mongodb');

async function testMongoDB() {
  console.log('🔍 MongoDB Manuel Test Başlatılıyor...');
  
  const configs = [
    {
      name: 'Kullanıcı ile (alastik_db + authSource=admin)',
      uri: 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin'
    },
    {
      name: 'Kullanıcı ile (alastik_db)',
      uri: 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db'
    },
    {
      name: 'Kullanıcı ile (admin)',
      uri: 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/admin'
    },
    {
      name: 'Kullanıcısız (alastik_db)',
      uri: 'mongodb://217.195.202.170:27017/alastik_db'
    },
    {
      name: 'Kullanıcısız (admin)',
      uri: 'mongodb://217.195.202.170:27017/admin'
    }
  ];
  
  for (const config of configs) {
    console.log(`\n🧪 Test: ${config.name}`);
    console.log(`📍 URI: ${config.uri.replace(/:34gm4191M\./, ':***')}`);
    
    try {
      const client = new MongoClient(config.uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      await client.connect();
      console.log('✅ Bağlantı başarılı');
      
      // Admin komutları test et
      const admin = client.db().admin();
      const dbList = await admin.listDatabases();
      console.log('✅ Veritabanları listelendi:', dbList.databases.map(db => db.name));
      
      await client.close();
      
    } catch (error) {
      console.log('❌ Bağlantı hatası:', error.message);
    }
  }
}

testMongoDB().catch(console.error);