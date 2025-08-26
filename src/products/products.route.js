// routes/products.route.js
const express = require("express");
const Products = require("./products.model");
const Reviews = require("../reviews/reviews.model");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const router = express.Router();

// post a product
const { uploadImages } = require("../utils/uploadImage");

router.post("/uploadImages", async (req, res) => {
  try {
    const { images } = req.body; // images هي مصفوفة من base64
    if (!images || !Array.isArray(images)) {
      return res.status(400).send({ message: "يجب إرسال مصفوفة من الصور" });
    }
    const uploadedUrls = await uploadImages(images);
    res.status(200).send(uploadedUrls);
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).send({ message: "حدث خطأ أثناء تحميل الصور" });
  }
});

const CATEGORIES_NEED_SIZE = new Set([
  "Men’s Washes",
  "Women’s Washes",
  "Liquid Bath Soap",
]);

// create product
router.post("/create-product", async (req, res) => {
  try {
    const { name, category, size, description, oldPrice, price, image, author, homeIndex } = req.body;

    if (!name || !category || !description || !price || !image || !author) {
      return res.status(400).send({ message: "جميع الحقول المطلوبة يجب إرسالها" });
    }

    if (CATEGORIES_NEED_SIZE.has(category) && !size) {
      return res.status(400).send({ message: "يجب تحديد الحجم لهذا التصنيف" });
    }

    // التحقق من قيمة موضع الصفحة الرئيسية إن تم إرساله
    let parsedHomeIndex = undefined;
    if (homeIndex !== undefined && homeIndex !== null && homeIndex !== '') {
      const n = Number(homeIndex);
      if (Number.isNaN(n) || n < 1 || n > 6) {
        return res.status(400).send({ message: "homeIndex يجب أن يكون رقمًا بين 1 و 6" });
      }
      parsedHomeIndex = n;
    }

    const productData = {
      name: CATEGORIES_NEED_SIZE.has(category) && size ? `${name} - ${size}` : name,
      category,
      description,
      price,
      oldPrice,
      image,
      author,
    };

    if (CATEGORIES_NEED_SIZE.has(category)) {
      productData.size = size;
    }
    if (parsedHomeIndex !== undefined) {
      productData.homeIndex = parsedHomeIndex;
    }

    const newProduct = new Products(productData);
    const savedProduct = await newProduct.save();

    res.status(201).send(savedProduct);
  } catch (error) {
    console.error("Error creating new product", error);
    res.status(500).send({ message: "Failed to create new product" });
  }
});

// get all products
router.get("/", async (req, res) => {
  try {
    const {
      category,
      size,
      color,
      minPrice,
      maxPrice,
      homeIndex,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
      if (category === 'حناء بودر' && size) {
        filter.size = size;
      }
    }

    if (homeIndex !== undefined) {
      if (homeIndex === "" || homeIndex === "null") {
        // لا شيء
      } else {
        const n = Number(homeIndex);
        if (!Number.isNaN(n)) filter.homeIndex = n;
      }
    }

    if (color && color !== "all") {
      filter.color = color;
    }

    if (minPrice && maxPrice) {
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && !isNaN(max)) {
        filter.price = { $gte: min, $lte: max };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    const products = await Products.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "email")
      .sort({ createdAt: -1 });

    res.status(200).send({ products, totalPages, totalProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Failed to fetch products" });
  }
});

// get single Product (يدعم كلا المسارين)
router.get(["/:id", "/product/:id"], async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Products.findById(productId).populate(
      "author",
      "email username"
    );
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    const reviews = await Reviews.find({ productId }).populate(
      "userId",
      "username email"
    );
    res.status(200).send({ product, reviews });
  } catch (error) {
    console.error("Error fetching the product", error);
    res.status(500).send({ message: "Failed to fetch the product" });
  }
});

// update a product
const multer = require('multer');
const upload = multer();

router.patch(
  '/update-product/:id',
  verifyToken,
  verifyAdmin,
  upload.array('image'),
  async (req, res) => {
    try {
      const productId = req.params.id;

      let updateData = {
        name: req.body.name,
        category: req.body.category,
        price: req.body.price,
        oldPrice: req.body.oldPrice || null,
        description: req.body.description,
        size: req.body.size || null,
        author: req.body.author,
      };

      // homeIndex (اختياري)
      if (req.body.homeIndex !== undefined) {
        if (req.body.homeIndex === '' || req.body.homeIndex === null) {
          updateData.homeIndex = undefined; // عدم التغيير
        } else {
          const n = Number(req.body.homeIndex);
          if (Number.isNaN(n) || n < 1 || n > 6) {
            return res.status(400).send({ message: "homeIndex يجب أن يكون رقمًا بين 1 و 6" });
          }
          updateData.homeIndex = n;
        }
      }

      if (!updateData.name || !updateData.category || !updateData.price || !updateData.description) {
        return res.status(400).send({ message: 'جميع الحقول المطلوبة يجب إرسالها' });
      }

      if (CATEGORIES_NEED_SIZE.has(updateData.category) && !updateData.size) {
        return res.status(400).send({ message: 'يجب تحديد الحجم لهذا التصنيف' });
      }

      if (req.files && req.files.length > 0) {
        updateData.image = req.files.map((f) => f.path);
      } else if (req.body.existingImages) {
        try {
          const parsed = JSON.parse(req.body.existingImages);
          if (Array.isArray(parsed)) {
            updateData.image = parsed;
          }
        } catch (_) {}
      }

      const updatedProduct = await Products.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).send({ message: 'المنتج غير موجود' });
      }

      res.status(200).send({
        message: 'تم تحديث المنتج بنجاح',
        product: updatedProduct,
      });
    } catch (error) {
      console.error('خطأ في تحديث المنتج', error);
      res.status(500).send({
        message: 'فشل تحديث المنتج',
        error: error.message,
      });
    }
  }
);

// delete a product
router.delete("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await Products.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).send({ message: "Product not found" });
    }

    await Reviews.deleteMany({ productId: productId });

    res.status(200).send({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting the product", error);
    res.status(500).send({ message: "Failed to delete the product" });
  }
});

// get related products
router.get("/related/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send({ message: "Product ID is required" });
    }
    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    const titleRegex = new RegExp(
      product.name
        .split(" ")
        .filter((word) => word.length > 1)
        .join("|"),
      "i"
    );

    const relatedProducts = await Products.find({
      _id: { $ne: id },
      $or: [
        { name: { $regex: titleRegex } },
        { category: product.category },
      ],
    });

    res.status(200).send(relatedProducts);
  } catch (error) {
    console.error("Error fetching the related products", error);
    res.status(500).send({ message: "Failed to fetch related products" });
  }
});

module.exports = router;
