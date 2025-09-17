// Alastik B2C MongoDB Initialization Script

// Switch to alastik_db database
db = db.getSiblingDB('alastik_db');

// Create admin user with necessary permissions
db.createUser({
  user: 'alastik_admin',
  pwd: 'alastik_admin_password',
  roles: [
    {
      role: 'readWrite',
      db: 'alastik_db'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'Email is required and must be a string'
        },
        name: {
          bsonType: 'string',
          description: 'Name is required and must be a string'
        }
      }
    }
  }
});

db.createCollection('products', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'price', 'category'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Product name is required'
        },
        price: {
          bsonType: 'number',
          minimum: 0,
          description: 'Price must be a positive number'
        }
      }
    }
  }
});

db.createCollection('orders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'items', 'total'],
      properties: {
        userId: {
          bsonType: 'objectId',
          description: 'User ID is required'
        },
        total: {
          bsonType: 'number',
          minimum: 0,
          description: 'Total must be a positive number'
        }
      }
    }
  }
});

// Admin collections
db.createCollection('adminusers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'Valid email is required'
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          description: 'Name is required and must be at least 2 characters'
        },
        password: {
          bsonType: 'string',
          minLength: 6,
          description: 'Password is required and must be at least 6 characters'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'super_admin', 'manager', 'editor'],
          description: 'Role must be one of the predefined values'
        }
      }
    }
  }
});

db.createCollection('adminsessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'sessionToken', 'expires'],
      properties: {
        userId: {
          bsonType: 'objectId',
          description: 'User ID is required'
        },
        sessionToken: {
          bsonType: 'string',
          description: 'Session token is required'
        },
        expires: {
          bsonType: 'date',
          description: 'Expiration date is required'
        }
      }
    }
  }
});

db.createCollection('adminlogs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['action', 'timestamp'],
      properties: {
        action: {
          bsonType: 'string',
          description: 'Action is required'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp is required'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ isActive: 1 });

db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ isActive: 1 });
db.products.createIndex({ createdAt: -1 });

db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

// Admin indexes
db.adminusers.createIndex({ email: 1 }, { unique: true });
db.adminusers.createIndex({ role: 1 });
db.adminusers.createIndex({ isActive: 1 });
db.adminusers.createIndex({ createdAt: -1 });

db.adminsessions.createIndex({ sessionToken: 1 }, { unique: true });
db.adminsessions.createIndex({ userId: 1 });
db.adminsessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });

db.adminlogs.createIndex({ userId: 1 });
db.adminlogs.createIndex({ action: 1 });
db.adminlogs.createIndex({ timestamp: -1 });

// Insert sample data
db.categories.insertMany([
  {
    name: 'Yaz Lastikleri',
    slug: 'yaz-lastikleri',
    description: 'Yaz mevsimi için özel lastikler',
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Kış Lastikleri',
    slug: 'kis-lastikleri',
    description: 'Kış mevsimi için özel lastikler',
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Dört Mevsim Lastikleri',
    slug: 'dort-mevsim-lastikleri',
    description: 'Tüm mevsimler için uygun lastikler',
    isActive: true,
    createdAt: new Date()
  }
]);

// Insert default admin user (password will be hashed by the application)
db.adminusers.insertOne({
  email: 'admin@alastik.com',
  name: 'Super Admin',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgLpQrKcjgbMQYu', // admin123
  role: 'super_admin',
  permissions: [
    {
      resource: '*',
      actions: ['create', 'read', 'update', 'delete', 'manage']
    }
  ],
  isActive: true,
  preferences: {
    theme: 'light',
    language: 'tr',
    timezone: 'Europe/Istanbul',
    emailNotifications: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Success message
print('Alastik B2C MongoDB initialized successfully!');
print('Default admin user: admin@alastik.com / admin123');
print('Database: alastik_db');
print('Collections created with validation and indexes'); 