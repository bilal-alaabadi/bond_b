// models/products.model.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    // الحقول القديمة (للتوافق)
    name: { type: String, required: true },
    category: { type: String, required: true }, // Men’s/Women’s Washes, Liquid Bath Soap, ...
    size: { type: String },                      // يُستخدم فقط لبعض التصنيفات
    description: { type: String, required: true },

    // 💬 الحقول ثنائية اللغة (اختيارية لكن ننصح بإرسالها)
    name_en: { type: String },
    name_ar: { type: String },
    description_en: { type: String },
    description_ar: { type: String },
    category_en: { type: String },
    category_ar: { type: String },

    price: { type: Number, required: true },
    image: { type: [String], required: true },
    oldPrice: { type: Number },
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // موضع المنتج في الصفحة الرئيسية (1..6). فريد (sparse) ليسمح بتركه فارغًا
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
