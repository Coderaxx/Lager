const express = require("express");
const myApp = express();
const PORT = process.env.PORT || 5000;
const path = require("path");
const fs = require("fs");
const Sentry = require("@sentry/node");
const jquery = require("jquery");
const { v4: uuidv4 } = require('uuid');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://coderax:BurlroaD50!@cluster0.xlok50g.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("Inventory").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

Sentry.init({
  dsn: "https://3c602fc817b942cbaf82608c5d9450fe@o4505183347081216.ingest.sentry.io/4505183347081216",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.0,
});

// Angi sti til den offentlige mappen
myApp.use(express.static(path.join(__dirname, "public")));

// Håndter GET-forespørsel for /add
myApp.get("/add", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "add-item.html"));
});

// Håndter GET-forespørsel for /delete
myApp.get("/delete", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "delete-item.html"));
});

myApp.get("/location", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "locations.html"));
});

myApp.get("/all", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "all.html"));
});

myApp.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

myApp.use('/lib/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

myApp.use(express.json());
myApp.use(express.static("public"));

//let inventory = readInventoryFromFile();
let inventory = getInventoryFromDatabase().then((result) => {
  inventory = result[0];
});

async function readInventoryFromFile() {
  try {
    const inventoryData = fs.readFileSync("inventory.json");

    return JSON.parse(inventoryData);
  } catch (error) {
    console.error("Error reading inventory file:", error);
    Sentry.captureException(error);
    return {};
  }
}

async function getInventoryFromDatabase() {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const result = await collection.find({}).toArray();
    if (!result) {
      console.error('No inventory data found in MongoDB.');
      return null;
    }

    client.close();

    return result;

  } catch (error) {
    console.error('Error getting inventory data from MongoDB:', error);
    Sentry.captureException(error);
    return null;
  }
}

async function saveInventoryToFile(inventory) {
  try {
    fs.writeFileSync("inventory.json", JSON.stringify(inventory, null, 2));
  } catch (error) {
    console.error("Error writing inventory file:", error);
    Sentry.captureException(error);
  }
}

async function saveInventoryToDatabase(shelfName, levelName, item) {
  console.log('Saving inventory data to MongoDB...');
  try {
    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const query = { 'shelves.name': shelfName };
    const shelfProjection = { 'shelves.$': 1 };

    const result = await collection.findOne(query, { projection: shelfProjection });
    if (!result || !result.shelves || result.shelves.length === 0) {
      console.error(`Shelf '${shelfName}' not found.`);
      return;
    }

    const shelf = result.shelves[0];
    const level = shelf.levels.find(l => l.name === levelName);
    if (!level) {
      console.error(`Level '${levelName}' not found in shelf '${shelfName}'.`);
      return;
    }

    const newItem = {
      ...item
    };

    level.items.push(newItem);

    const updateQuery = { 'shelves.name': shelfName };
    const updateData = { $set: { 'shelves.$': shelf } };

    await collection.updateOne(updateQuery, updateData);

    console.log('Inventory data saved to MongoDB.');

    client.close();
  } catch (error) {
    console.error('Error saving inventory data to MongoDB:', error);
    Sentry.captureException(error);
  }
}

async function deleteItemFromDb(itemId) {
  try {
    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db('Inventory');
    const collection = db.collection('H21');

    const query = { 'shelves.levels.items._id': itemId };
    const updateData = { $pull: { 'shelves.$[].levels.$[].items': { _id: itemId } } };

    const result = await collection.updateOne(query, updateData);

    if (result.modifiedCount > 0) {
      console.log(`Item with ID '${itemId}' deleted from inventory.`);
    } else {
      console.log(`Item with ID '${itemId}' not found in inventory.`);
    }

    client.close();
  } catch (error) {
    console.error('Error deleting item from inventory:', error);
    Sentry.captureException(error);
  }
}

function searchInventory(query) {
  const results = [];
  const visitedLocations = new Set();

  const getCountOfItem = (item, items) => {
    if (Array.isArray(items)) {
      return items.filter((i) => i.barcode === item.barcode).length;
    }
    return 1;
  };

  for (const category of inventory.shelves) {
    for (const shelf of category.levels) {
      const items = shelf.items;

      if (Array.isArray(items)) {
        const itemLocation = `H21.${category.name}${shelf.name}`;

        if (!visitedLocations.has(itemLocation)) {
          visitedLocations.add(itemLocation);

          const uniqueItemsInLocation = new Set();

          for (const item of items) {
            if (
              query &&
              (item.barcode === query ||
                item.articleNumber === query ||
                `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) ||
                itemLocation === query)
            ) {
              const itemKey = item.barcode;

              if (!uniqueItemsInLocation.has(itemKey)) {
                uniqueItemsInLocation.add(itemKey);
                results.push({
                  _id: item._id,
                  barcode: item.barcode,
                  location: itemLocation,
                  ...item,
                  quantity: getCountOfItem(item, items),
                });
              }
            }
          }
        }
      } else {
        const itemLocation = `H21.${category.name}${shelf.name}`;
        const item = items;

        if (
          query &&
          (item.barcode === query ||
            item.articleNumber === query ||
            `${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()) ||
            itemLocation === query)
        ) {
          const itemKey = item.barcode;

          if (!visitedLocations.has(itemLocation)) {
            visitedLocations.add(itemLocation);
            results.push({
              _id: item._id,
              barcode: item.barcode,
              location: itemLocation,
              ...item,
              quantity: getCountOfItem(item, items),
            });
          }
        }
      }
    }
  }

  return results;
}

// Håndter GET-forespørsel for /locations
myApp.get("/locations", (req, res) => {
  const inventoryData = readInventoryFromFile();
  const locations = getAllLocations(inventoryData);
  res.json(locations);
});

// Håndter POST-forespørsel for /add-location
myApp.post("/add-location", (req, res) => {
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
myApp.get("/remove-location/:location", (req, res) => {
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

myApp.get("/inventory/search/:query", (req, res) => {
  const { query } = req.params;

  const results = searchInventory(query);

  if (results.length > 0) {
    res.status(200).json(results);
  } else {
    res.status(404).json({ message: `Ingen varer funnet i søk etter ${query}` });
  }
});

myApp.get("/inventory", async (req, res) => {
  //const inventoryData = readInventoryFromFile();
  const inventoryData = await getInventoryFromDatabase();
  res.json(inventoryData);
});

myApp.post("/inventory/:location", (req, res) => {
  const newItem = req.body;
  const { location } = req.params;
  const [category, shelfLevel] = location.split(".");
  const shelf = shelfLevel.slice(0, -1);
  const level = shelfLevel.slice(-1);

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

  newItem.location = `H21.${shelf}${level}`;
  newItem._id = uuidv4();
  levelObj.items.push(newItem);

  saveInventoryToDatabase(shelf, level, newItem);
  saveInventoryToFile(inventory);

  res.status(201).json({ message: "Vare lagt til" });
});

// Håndter GET-forespørsel for /inventory/:location
myApp.get("/inventory/:location", (req, res) => {
  let { location } = req.params;

  // Sjekk om plasseringen er i ønsket format, ellers konverter den
  if (!isValidLocationFormat(location)) {
    location = convertToFullLocationFormat(location);
  }

  const locationParts = location.split(".");
  const shelf = locationParts[1];
  const level = locationParts[2];

  const shelfObj = inventory.shelves.find((s) => s.name === shelf);
  if (shelfObj) {
    const levelObj = shelfObj.levels.find((l) => l.name === level);
    if (levelObj) {
      res.json(levelObj.items);
      return;
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

myApp.delete("/inventory/:id", (req, res) => {
  const { id } = req.params;
  //Funksjon for håndtering av sletting av vare basert på id. Vi skal slette varen fra databasen og fra inventory.json.
  //Vi skal også håndtere eventuelle feil som kan oppstå.
  //Husk å sende riktig statuskode tilbake til klienten.
  const item = deleteItemFromDb(id);
  if (item) {
    res.status(200).json({ message: "Vare slettet" });
  } else {
    res.status(404).json({ message: "Vare ikke funnet" });
  }
});

// Håndter feil ved 404-not found
myApp.use((req, res, next) => {
  res.status(404).json({ message: "Ressurs ikke funnet" });
});

// Håndter generelle feil
myApp.use((err, req, res, next) => {
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