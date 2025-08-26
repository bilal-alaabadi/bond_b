// models/products.model.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true }, // Men’s/Women’s Washes, Liquid Bath Soap, Deodorant, Body Wet Wipes, Body Powder, Body Moisturizer
    size: { type: String },                      // يُستخدم فقط للفئات التي تحتاج حجمًا
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: [String], required: true },
    oldPrice: { type: Number },
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // موضع المنتج في الصفحة الرئيسية (1..6). حقل اختياري وفريد (sparse) ليسمح بتركه فارغًا
    homeIndex: {
      type: Number,
      min: 1,
      max: 6,
      index: { unique: true, sparse: true }
    }
  },
  { timestamps: true }
);

const Products = mongoose.model("Product", ProductSchema);
module.exports = Products;
