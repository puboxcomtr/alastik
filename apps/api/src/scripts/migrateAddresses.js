const mongoose = require('mongoose');

mongoose.connect('mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin').then(async () => {
  const db = mongoose.connection.db;
  
  const collections = await db.listCollections().toArray();
  console.log('Mevcut collections:', collections.map(c => c.name));
  
  const hasAddresses = collections.some(c => c.name === 'addresses');
  const hasWebAddresses = collections.some(c => c.name === 'webaddresses');
  
  if (hasAddresses && !hasWebAddresses) {
    await db.collection('addresses').rename('webaddresses');
    console.log('addresses -> webaddresses olarak yeniden adlandırıldı');
  } else if (hasAddresses && hasWebAddresses) {
    const docs = await db.collection('addresses').find({}).toArray();
    if (docs.length > 0) {
      await db.collection('webaddresses').insertMany(docs);
      await db.collection('addresses').drop();
      console.log(docs.length + ' kayıt taşındı, addresses silindi');
    }
  } else {
    console.log('addresses collection yok veya webaddresses zaten var');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Hata:', err);
  process.exit(1);
});
