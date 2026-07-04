import Category from "../models/Category.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: 1 }).lean();
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    // Generate a string _id from the name to satisfy the schema requirements
    const _id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newCategory = new Category({ _id, name });
    await newCategory.save();
    return res.status(201).json(newCategory);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
