var apiUrl = 'https://nutriplan-api.vercel.app/api';
var foodLogKey = 'nutriplan-food-log';

function getElement(selector) {
  return document.querySelector(selector);
}

function getApiData(endpoint) {
  return fetch(apiUrl + endpoint).then(function (response) {
    if (!response.ok) {
      throw new Error('Could not load data. Please try again.');
    }
    return response.json();
  });
}

function safeText(text) {
  var element = document.createElement('div');
  element.textContent = text || '';
  return element.innerHTML;
}

function getFoodLog() {
  return JSON.parse(localStorage.getItem(foodLogKey) || '[]');
}

function saveFoodLog(foodLog) {
  localStorage.setItem(foodLogKey, JSON.stringify(foodLog));
}

function showToast(message) {
  var toast = getElement('#toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(function () { toast.classList.remove('show'); }, 3000);
}

function addFoodToLog(food) {
  var log = getFoodLog();
  var nutrients = food.nutrients || {};

  log.push({
    id: Date.now(),
    name: food.name,
    thumbnail: food.thumbnail || '',
    nutrients: {
      calories: Number(nutrients.calories) || 0,
      protein: Number(nutrients.protein) || 0,
      carbs: Number(nutrients.carbs) || 0,
      fat: Number(nutrients.fat) || 0
    }
  });

  saveFoodLog(log);
  showToast(food.name + ' was added to your food log.');
}

function makeMealCard(meal) {
  return '<article class="meal-card">' +
    '<a href="recipe-detail.html?id=' + encodeURIComponent(meal.id) + '">' +
    '<img src="' + safeText(meal.thumbnail) + '" alt="' + safeText(meal.name) + '" loading="lazy">' +
    '<div class="meal-card-body">' +
    '<p>' + safeText(meal.category || 'Recipe') + ' · ' + safeText(meal.area || 'World cuisine') + '</p>' +
    '<h3>' + safeText(meal.name) + '</h3><span>View recipe →</span>' +
    '</div></a></article>';
}

function showMeals(meals) {
  var recipesGrid = getElement('#recipes-grid');
  var recipesCount = getElement('#recipes-count');

  if (meals.length === 0) {
    recipesGrid.innerHTML = '<p class="empty-state">No recipes found.</p>';
  } else {
    recipesGrid.innerHTML = '';
    meals.forEach(function (meal) {
      recipesGrid.innerHTML += makeMealCard(meal);
    });
  }

  recipesCount.textContent = meals.length + ' recipes';
}

function loadMeals(endpoint) {
  var recipesGrid = getElement('#recipes-grid');
  recipesGrid.innerHTML = '<p class="page-loading">Loading recipes...</p>';

  getApiData(endpoint).then(function (data) {
    showMeals(data.results || []);
  }).catch(function (error) {
    recipesGrid.innerHTML = '<p class="empty-state">' + error.message + '</p>';
  });
}

function makeFilterButton(text, endpoint) {
  var button = document.createElement('button');
  button.className = 'filter-chip';
  button.textContent = text;

  button.addEventListener('click', function () {
    loadMeals(endpoint);
  });

  return button;
}

function startMealsPage() {
  if (!getElement('#recipes-grid')) return;

  var searchInput = getElement('#search-input');
  var categoriesGrid = getElement('#categories-grid');
  var areasGrid = getElement('#area-filter-pills');
  var typingTimer;

  getApiData('/meals/categories').then(function (data) {
    data.results.forEach(function (category) {
      var endpoint = '/meals/filter?category=' + encodeURIComponent(category.name) + '&limit=24';
      categoriesGrid.appendChild(makeFilterButton(category.name, endpoint));
    });
  });

  getApiData('/meals/areas').then(function (data) {
    data.results.slice(0, 16).forEach(function (area) {
      var endpoint = '/meals/filter?area=' + encodeURIComponent(area.name) + '&limit=24';
      areasGrid.appendChild(makeFilterButton(area.name, endpoint));
    });
  });

  searchInput.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      var word = searchInput.value.trim();
      loadMeals(word ? '/meals/search?q=' + encodeURIComponent(word) : '/meals/random?count=12');
    }, 400);
  });

  loadMeals('/meals/random?count=12');
}

function startRecipePage() {
  var recipeContent = getElement('#recipe-content');
  if (!recipeContent) return;

  var mealId = new URLSearchParams(window.location.search).get('id');
  if (!mealId) {
    recipeContent.textContent = 'Please choose a recipe from the meals page.';
    return;
  }

  getApiData('/meals/' + encodeURIComponent(mealId)).then(function (data) {
    var meal = data.result;
    var ingredients = '';
    var instructions = '';

    meal.ingredients.forEach(function (item) {
      ingredients += '<li>' + safeText(item.measure + ' ' + item.ingredient) + '</li>';
    });

    meal.instructions.forEach(function (step, index) {
      instructions += '<p><strong>' + (index + 1) + '.</strong> ' + safeText(step) + '</p>';
    });

    recipeContent.innerHTML = '<article class="recipe-detail">' +
      '<img class="recipe-hero" src="' + safeText(meal.thumbnail) + '" alt="' + safeText(meal.name) + '">' +
      '<p class="eyebrow">' + safeText(meal.category) + ' · ' + safeText(meal.area) + '</p>' +
      '<h1>' + safeText(meal.name) + '</h1>' +
      '<button id="add-recipe-button" class="primary-button">Add to food log</button>' +
      '<section><h2>Ingredients</h2><ul>' + ingredients + '</ul></section>' +
      '<section><h2>Instructions</h2>' + instructions + '</section></article>';

    getElement('#add-recipe-button').addEventListener('click', function () {
      addFoodToLog({
        name: meal.name,
        thumbnail: meal.thumbnail,
        nutrients: { calories: 400, protein: 25, carbs: 45, fat: 14 }
      });
    });
  }).catch(function (error) {
    recipeContent.textContent = error.message;
  });
}

function showProducts(products) {
  var productsGrid = getElement('#products-grid');
  getElement('#products-count').textContent = products.length + ' products';
  productsGrid.innerHTML = '';

  if (products.length === 0) {
    productsGrid.innerHTML = '<p class="empty-state">No products found.</p>';
    return;
  }

  products.forEach(function (product) {
    var nutrients = product.nutrients || {};
    var card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = '<p class="eyebrow">' + safeText(product.nutritionGrade || 'Product') + '</p>' +
      '<h3>' + safeText(product.name || 'Unnamed product') + '</h3>' +
      '<p>' + (nutrients.calories || 0) + ' kcal · Protein ' + (nutrients.protein || 0) + 'g · Carbs ' + (nutrients.carbs || 0) + 'g</p>' +
      '<button class="primary-button">Add to log</button>';

    card.querySelector('button').addEventListener('click', function () {
      addFoodToLog(product);
    });

    productsGrid.appendChild(card);
  });
}

function startProductsPage() {
  if (!getElement('#products-grid')) return;

  getElement('#product-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var name = getElement('#product-search-input').value.trim();
    if (!name) return;

    getApiData('/products/search?q=' + encodeURIComponent(name)).then(function (data) {
      showProducts(data.results || []);
    }).catch(function (error) {
      getElement('#products-grid').textContent = error.message;
    });
  });

  getElement('#barcode-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var barcode = getElement('#barcode-input').value.trim();
    if (!barcode) return;

    getApiData('/products/barcode/' + encodeURIComponent(barcode)).then(function (data) {
      showProducts(data.result ? [data.result] : []);
    }).catch(function (error) {
      getElement('#products-grid').textContent = error.message;
    });
  });
}

function startFoodLogPage() {
  var loggedItemsList = getElement('#logged-items-list');
  if (!loggedItemsList) return;

  getElement('#foodlog-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  function renderFoodLog() {
    var foods = getFoodLog();
    var totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    foods.forEach(function (food) {
      totals.calories += food.nutrients.calories;
      totals.protein += food.nutrients.protein;
      totals.carbs += food.nutrients.carbs;
      totals.fat += food.nutrients.fat;
    });

    getElement('#nutrition-summary').innerHTML =
      '<article class="summary-card"><span>Calories</span><strong>' + Math.round(totals.calories) + ' kcal</strong></article>' +
      '<article class="summary-card"><span>Protein</span><strong>' + Math.round(totals.protein) + ' g</strong></article>' +
      '<article class="summary-card"><span>Carbs</span><strong>' + Math.round(totals.carbs) + ' g</strong></article>' +
      '<article class="summary-card"><span>Fat</span><strong>' + Math.round(totals.fat) + ' g</strong></article>';

    loggedItemsList.innerHTML = '';
    if (foods.length === 0) {
      loggedItemsList.innerHTML = '<p class="empty-state">No items logged yet.</p>';
    }

    foods.forEach(function (food) {
      var item = document.createElement('article');
      item.className = 'log-item';
      item.innerHTML = '<h3>' + safeText(food.name) + '</h3><p>' + food.nutrients.calories + ' kcal</p><button class="text-button">Remove</button>';
      item.querySelector('button').addEventListener('click', function () {
        var newFoods = getFoodLog().filter(function (savedFood) {
          return savedFood.id !== food.id;
        });
        saveFoodLog(newFoods);
        renderFoodLog();
      });
      loggedItemsList.appendChild(item);
    });
  }

  getElement('#clear-foodlog').addEventListener('click', function () {
    saveFoodLog([]);
    renderFoodLog();
  });

  getElement('#custom-entry-btn').addEventListener('click', function () {
    var name = prompt('Food name');
    var calories = prompt('Calories');
    if (name) {
      addFoodToLog({ name: name, nutrients: { calories: Number(calories) || 0 } });
      renderFoodLog();
    }
  });

  renderFoodLog();
}

document.addEventListener('DOMContentLoaded', function () {
  startMealsPage();
  startRecipePage();
  startProductsPage();
  startFoodLogPage();
});
