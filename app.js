const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const path = require("path");
const fs = require("fs");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://3c602fc817b942cbaf82608c5d9450fe@o4505183347081216.ingest.sentry.io/4505183347081216",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// Angi sti til den offentlige mappen
app.use(express.static(path.join(__dirname, "public")));

// Håndter GET-forespørsel for /add
app.get("/add", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "add-item.html"));
});

// Håndter GET-forespørsel for /delete
app.get("/delete", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "delete-item.html"));
});

app.get("/location", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "locations.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(express.json());
app.use(express.static("public"));

let inventory = readInventoryFromFile();

function readInventoryFromFile() {
  try {
    const inventoryData = fs.readFileSync("inventory.json");
    return JSON.parse(inventoryData);
  } catch (error) {
    console.error("Error reading inventory file:", error);
    Sentry.captureException(error);
    return {};
  }
}

function saveInventoryToFile(inventory) {
  try {
    fs.writeFileSync("inventory.json", JSON.stringify(inventory, null, 2));
  } catch (error) {
    console.error("Error writing inventory file:", error);
    Sentry.captureException(error);
  }
}

function searchInventory(query) {
  const results = [];

  for (const category of inventory.categories) {
    for (const shelf of category.shelves) {
      for (const level of shelf.levels) {
        const items = level.items;

        if (Array.isArray(items)) {
          for (const item of items) {
            if (
              item.barcode === query ||
              `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase())
            ) {
              results.push({ location: `${category.name}.${shelf.name}.${level.name}`, ...item });
            }
          }
        } else {
          if (
            items.barcode === query ||
            `${items.brand} ${items.model}`.toLowerCase().includes(query.toLowerCase())
          ) {
            results.push({ location: `${category.name}.${shelf.name}.${level.name}`, ...items });
          }
        }
      }
    }
  }
  return results;
}

// Håndter GET-forespørsel for /locations
app.get("/locations", (req, res) => {
  const inventoryData = readInventoryFromFile();
  const locations = getAllLocations(inventoryData);
  res.json(locations);
});

// Håndter POST-forespørsel for /add-location
app.post("/add-location", (req, res) => {
  const { category, shelf, level } = req.body;

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (!categoryObj) {
    inventory.categories.push({ name: category, shelves: [] });
  }

  const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
  if (!shelfObj) {
    categoryObj.shelves.push({ name: shelf, levels: [] });
  }

  const levelObj = shelfObj.levels.find((l) => l.name === level);
  if (!levelObj) {
    shelfObj.levels.push({ name: level, items: [] });
  }

  saveInventoryToFile(inventory);

  res.redirect("/locations");
});

// Håndter GET-forespørsel for /remove-location
app.get("/remove-location/:location", (req, res) => {
  const { location } = req.params;
  const [category, shelf, level] = location.split(".");

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (categoryObj) {
    const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
    if (shelfObj) {
      const levelObj = shelfObj.levels.find((l) => l.name === level);
      if (levelObj) {
        // Fjern plasseringen fra inventory.json
        shelfObj.levels = shelfObj.levels.filter((l) => l.name !== level);
        saveInventoryToFile(inventory);
        res.redirect("/locations");
        return;
      }
    }
  }

  res.status(404).json({ message: "Plassering ikke funnet" });
});

app.get("/inventory/search/:query", (req, res) => {
  const { query } = req.params;

  const results = searchInventory(query);

  if (results.length > 0) {
    res.status(200).json(results);
  } else {
    res.status(404).json({ message: "Ingen varer funnet" });
  }
});

app.get("/inventory", (req, res) => {
  const inventoryData = readInventoryFromFile();
  res.json(inventoryData);
});

app.post("/inventory/:location", (req, res) => {
  const newItem = req.body;
  const { location } = req.params;
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.charAt(0);
  const level = shelfLevel.substr(1);

  if (!inventory.categories) {
    inventory.categories = [];
  }

  let categoryObj = inventory.categories.find((c) => c.name === category);
  if (!categoryObj) {
    categoryObj = { name: category, shelves: [] };
    inventory.categories.push(categoryObj);
  }

  let shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
  if (!shelfObj) {
    shelfObj = { name: shelf, levels: [] };
    categoryObj.shelves.push(shelfObj);
  }

  let levelObj = shelfObj.levels.find((l) => l.name === level);
  if (!levelObj) {
    levelObj = { name: level, items: [] };
    shelfObj.levels.push(levelObj);
  }

  newItem.location = location;
  levelObj.items.push(newItem);

  saveInventoryToFile(inventory);

  res.status(201).json({ message: "Vare lagt til" });
});

// Håndter GET-forespørsel for /inventory/:location
app.get("/inventory/:location", (req, res) => {
  let { location } = req.params;

  // Sjekk om plasseringen er i ønsket format, ellers konverter den
  if (!isValidLocationFormat(location)) {
    location = convertToFullLocationFormat(location);
  }

  const locationParts = location.split(".");
  const category = locationParts[0];
  const shelf = locationParts[1];
  const level = locationParts[2];

  const categoryObj = inventory.categories.find((c) => c.name === category);
  if (categoryObj) {
    const shelfObj = categoryObj.shelves.find((s) => s.name === shelf);
    if (shelfObj) {
      const levelObj = shelfObj.levels.find((l) => l.name === level);
      if (levelObj) {
        res.json(levelObj.items);
        return;
      }
    }
  }

  res.status(404).json({ message: "Plassering ikke funnet" });
});

// Hjelpefunksjon for å sjekke om en plassering er i ønsket format
function isValidLocationFormat(location) {
  const regex = /^[A-Z]+\d+\.[A-Z]+\.\d+$/;
  return regex.test(location);
}

// Hjelpefunksjon for å konvertere en plassering til ønsket format
function convertToFullLocationFormat(location) {
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.charAt(0);
  const level = shelfLevel.substr(1);
  return `${category}.${shelf}.${level}`;
}

app.delete("/inventory/:barcode", (req, res) => {
  const { barcode } = req.params;

  let itemFound = false;

  for (const categoryObj of inventory.categories) {
    for (const shelfObj of categoryObj.shelves) {
      for (const levelObj of shelfObj.levels) {
        const itemIndex = levelObj.items.findIndex((item) => item.barcode === barcode);
        if (itemIndex !== -1) {
          levelObj.items.splice(itemIndex, 1);
          itemFound = true;
          break;
        }
      }
      if (itemFound) {
        break;
      }
    }
    if (itemFound) {
      break;
    }
  }

  if (itemFound) {
    saveInventoryToFile(inventory);
    res.json({ message: "Vare slettet" });
  } else {
    res.status(404).json({ message: "Vare ikke funnet" });
  }
});

// Håndter feil ved 404-not found
app.use((req, res, next) => {
  res.status(404).json({ message: "Ressurs ikke funnet" });
});

// Håndter generelle feil
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Noe gikk galt på serveren" });
});

// Funksjon for å generere liste over plasseringer i inventory.json
function getAllLocations(inventoryData) {
  const locations = {};

  for (const category of inventoryData.categories) {
    for (const shelf of category.shelves) {
      if (!locations[shelf.name]) {
        locations[shelf.name] = {};
      }

      for (const level of shelf.levels) {
        if (!locations[shelf.name][level.name]) {
          locations[shelf.name][level.name] = [];
        }

        locations[shelf.name][level.name] = [...locations[shelf.name][level.name], ...level.items];
      }
    }
  }

  return locations;
}