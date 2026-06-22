import dotenv from "dotenv";
import mongoose from "mongoose";
import Recipe from "../models/recipe.model.js";

dotenv.config();

const recipes = [
    {
        recipeName: "Golden Herb Chicken Bowl",
        recipeImage:
            "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=900&auto=format&fit=crop",
        category: "Dinner",
        cuisineType: "Mediterranean",
        difficultyLevel: "Medium",
        preparationTime: "35 min",
        ingredients: ["Chicken", "Olive oil", "Herbs", "Rice", "Vegetables"],
        instructions:
            "Season the chicken, grill until golden, prepare rice, and serve with herbs and vegetables.",
        authorId: "demo-user-1",
        authorName: "Nadia Rahman",
        authorEmail: "nadia@example.com",
        likesCount: 1287,
        isFeatured: true,
        status: "active",
    },
    {
        recipeName: "Creamy Garden Pasta",
        recipeImage:
            "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=900&auto=format&fit=crop",
        category: "Lunch",
        cuisineType: "Italian",
        difficultyLevel: "Easy",
        preparationTime: "25 min",
        ingredients: ["Pasta", "Cream", "Garlic", "Spinach", "Parmesan"],
        instructions:
            "Boil pasta, prepare creamy garlic sauce, combine with spinach, and finish with parmesan.",
        authorId: "demo-user-2",
        authorName: "Arif Hasan",
        authorEmail: "arif@example.com",
        likesCount: 946,
        isFeatured: true,
        status: "active",
    },
    {
        recipeName: "Smoky Veggie Flatbread",
        recipeImage:
            "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=900&auto=format&fit=crop",
        category: "Snack",
        cuisineType: "Fusion",
        difficultyLevel: "Easy",
        preparationTime: "20 min",
        ingredients: ["Flatbread", "Bell pepper", "Cheese", "Tomato", "Smoked paprika"],
        instructions:
            "Layer vegetables and cheese over flatbread, bake until crisp, and serve warm.",
        authorId: "demo-user-3",
        authorName: "Mira Chowdhury",
        authorEmail: "mira@example.com",
        likesCount: 783,
        isFeatured: true,
        status: "active",
    },
    {
        recipeName: "Honey Garlic Salmon",
        recipeImage:
            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=900&auto=format&fit=crop",
        category: "Dinner",
        cuisineType: "Asian Fusion",
        difficultyLevel: "Medium",
        preparationTime: "30 min",
        ingredients: ["Salmon", "Honey", "Garlic", "Soy sauce", "Lemon"],
        instructions:
            "Prepare honey garlic glaze, sear salmon, brush with sauce, and finish until tender.",
        authorId: "demo-user-4",
        authorName: "Samira Khan",
        authorEmail: "samira@example.com",
        likesCount: 1538,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Spiced Lentil Soup",
        recipeImage:
            "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=900&auto=format&fit=crop",
        category: "Soup",
        cuisineType: "Middle Eastern",
        difficultyLevel: "Easy",
        preparationTime: "40 min",
        ingredients: ["Lentils", "Carrot", "Onion", "Cumin", "Stock"],
        instructions:
            "Cook lentils with vegetables and spices, blend lightly, and serve warm.",
        authorId: "demo-user-5",
        authorName: "Tanvir Alam",
        authorEmail: "tanvir@example.com",
        likesCount: 1124,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Avocado Egg Toast",
        recipeImage:
            "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=900&auto=format&fit=crop",
        category: "Breakfast",
        cuisineType: "American",
        difficultyLevel: "Easy",
        preparationTime: "15 min",
        ingredients: ["Bread", "Avocado", "Eggs", "Lemon Juice", "Black Pepper"],
        instructions:
            "Toast the bread, mash avocado with lemon juice, fry the eggs, and serve together with black pepper.",
        authorId: "demo-user-6",
        authorName: "Nadia Rahman",
        authorEmail: "nadia@example.com",
        likesCount: 867,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Grilled Chicken Rice Bowl",
        recipeImage:
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=900&auto=format&fit=crop",
        category: "Lunch",
        cuisineType: "Asian Fusion",
        difficultyLevel: "Medium",
        preparationTime: "35 min",
        ingredients: ["Chicken Breast", "Rice", "Cucumber", "Carrot", "Soy Sauce"],
        instructions:
            "Grill the chicken, cook rice, slice fresh vegetables, and serve everything in a bowl with soy sauce.",
        authorId: "demo-user-7",
        authorName: "Rafiq Hasan",
        authorEmail: "rafiq@example.com",
        likesCount: 1349,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Garlic Butter Salmon",
        recipeImage:
            "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=900&auto=format&fit=crop",
        category: "Dinner",
        cuisineType: "European",
        difficultyLevel: "Medium",
        preparationTime: "30 min",
        ingredients: ["Salmon Fillet", "Garlic", "Butter", "Lemon", "Parsley"],
        instructions:
            "Sear salmon in butter with garlic, add lemon juice, garnish with parsley, and serve warm.",
        authorId: "demo-user-8",
        authorName: "Mehedi Karim",
        authorEmail: "mehedi@example.com",
        likesCount: 1586,
        isFeatured: true,
        status: "active",
    },
    {
        recipeName: "Crispy Potato Bites",
        recipeImage:
            "https://images.unsplash.com/photo-1623238913973-21e45cced554?q=80&w=900&auto=format&fit=crop",
        category: "Snack",
        cuisineType: "Indian",
        difficultyLevel: "Easy",
        preparationTime: "25 min",
        ingredients: ["Potatoes", "Breadcrumbs", "Chili Powder", "Salt", "Oil"],
        instructions:
            "Boil and mash potatoes, mix with spices, shape into small bites, coat with breadcrumbs, and fry until crispy.",
        authorId: "demo-user-9",
        authorName: "Sadia Islam",
        authorEmail: "sadia@example.com",
        likesCount: 973,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Creamy Mushroom Soup",
        recipeImage:
            "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?q=80&w=900&auto=format&fit=crop",
        category: "Soup",
        cuisineType: "French",
        difficultyLevel: "Easy",
        preparationTime: "35 min",
        ingredients: ["Mushrooms", "Onion", "Garlic", "Cream", "Vegetable Stock"],
        instructions:
            "Sauté mushrooms with onion and garlic, add stock, simmer, blend until smooth, and finish with cream.",
        authorId: "demo-user-10",
        authorName: "Farhan Ahmed",
        authorEmail: "farhan@example.com",
        likesCount: 748,
        isFeatured: false,
        status: "active",
    },
    {
        recipeName: "Chocolate Lava Cake",
        recipeImage:
            "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=900&auto=format&fit=crop",
        category: "Dessert",
        cuisineType: "French",
        difficultyLevel: "Medium",
        preparationTime: "28 min",
        ingredients: ["Dark Chocolate", "Butter", "Eggs", "Sugar", "Flour"],
        instructions:
            "Melt chocolate with butter, mix with eggs, sugar, and flour, bake briefly until the center stays molten.",
        authorId: "demo-user-11",
        authorName: "Tania Chowdhury",
        authorEmail: "tania@example.com",
        likesCount: 1893,
        isFeatured: true,
        status: "active",
    },
];

const seedRecipes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        await Recipe.deleteMany({
            authorEmail: {
                $in: recipes.map((recipe) => recipe.authorEmail),
            },
        });

        await Recipe.insertMany(recipes);

        console.log("Recipe seed completed");
        process.exit(0);
    } catch (error) {
        console.error("Recipe seed failed:", error);
        process.exit(1);
    }
};

seedRecipes();