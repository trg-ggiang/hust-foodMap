// Shared by the NestJS API and React selectors, including older catalogs.
function normalizeFoodText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesFoodGroup(restaurant, category) {
  const group = normalizeFoodText(category);
  if (!group || group === "tat ca") return true;
  if ([restaurant.category, ...(restaurant.categories || [])]
    .some(label => normalizeFoodText(label) === group)) return true;

  // Combined groups such as “Bún & phở” match either dish type.
  // Search complete words, only in dish names; addresses cannot assign a group.
  const dishes = category.split("&").map(normalizeFoodText).filter(Boolean);
  return restaurant.menu.some(item => {
    const name = ` ${normalizeFoodText(item.name)} `;
    return dishes.some(dish => name.includes(` ${dish} `));
  });
}

exports.matchesFoodGroup = matchesFoodGroup;
