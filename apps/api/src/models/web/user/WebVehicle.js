// apps/api/src/models/web/user/WebVehicle.js
const mongoose = require('mongoose');
const webVehicleSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebMember',
        required: true,
        index: true
    },

    wheelSizeData: {
        make: String,        
        makeName: String,   
        model: String,       
        modelName: String,   
        year: Number,       
        generation: String,  
        modification: String 
    },

    userInputs: {
        plateNumber: String,   
        mileage: Number,      
        bodyType: String,      
        enginePower: String    
    },

    // Araç görseli
    image: {
        url: String,          
        source: {              
            type: String,
            enum: ['wheelsize', 'upload', 'default'],
            default: 'default'
        },
        uploadedAt: Date      
    },

    compatibleSizes: {
        tires: [{
            width: Number,
            aspectRatio: Number,
            diameter: Number,
            display: String   
        }],
        wheels: [{
            diameter: Number,
            width: Number,
            offset: Number,
            boltPattern: String,
            centerBore: Number,
            display: String
        }],
        lastUpdated: Date
    },

    isActive: { type: Boolean, default: true },
    isPrimary: { type: Boolean, default: false }, 

}, {
    timestamps: true,
    collection: 'webvehicles'
});

module.exports = mongoose.model('WebVehicle', webVehicleSchema);