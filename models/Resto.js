const mongoose = require('mongoose');

const RestoSchema = new mongoose.Schema({
    restoID: Number,
    restoName: String,
    restoDesc: String,
    aveRating: {
        type: String,
        enum: ['W', 'L', 'M']
    },
    W_ratings: Number,
    L_ratings: Number,
    M_ratings: Number,
    image: String
});

const Resto = mongoose.model('Resto', RestoSchema);

module.exports = Resto;
