$(document).ready(() => {
    const addLocationForm = document.getElementById("addLocationForm");
    const locationInput = document.getElementById("locationInput");
    const locationsContainer = document.getElementById("locationsTableBody");

    // Oppdater plasseringstabellen
    function updateLocationsTable(locations) {
        console.log("Updating locations table:", locations);
        locationsContainer.innerHTML = "";

        const shelves = Object.keys(locations);
        for (const shelf of shelves) {
            const levels = Object.keys(locations[shelf]);
            for (const level of levels) {
                const row = document.createElement("tr");
                const sectionCell = document.createElement("td");
                sectionCell.textContent = shelf;
                const levelCell = document.createElement("td");
                levelCell.textContent = level;
                const actionCell = document.createElement("td");
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Slett";
                deleteButton.classList.add("button", "is-danger", "is-small");
                deleteButton.addEventListener("click", () => {
                    deleteLocation(shelf, level);
                });

                actionCell.appendChild(deleteButton);
                row.appendChild(sectionCell);
                row.appendChild(levelCell);
                row.appendChild(actionCell);
                locationsContainer.appendChild(row);
            }
        }

        locationsContainer.appendChild(tableBody);
    }

    // Hent eksisterende plasseringer fra serveren
    async function getLocations() {
        try {
            const response = await axios.get("/locations");
            const data = response.data;
            console.log("Received locations data:", data);
            if (Object.keys(data).length > 0) {
                updateLocationsTable(data);
            } else {
                console.error("No categories found in data");
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved henting av plasseringer:", error);
        }
    }

    // Legg til en ny plassering
    async function addLocation(shelf, level) {
        const location = `${shelf}.${level}`;

        try {
            const response = await axios.post("/locations", { location });
            const data = response.data;
            if (data.success) {
                await getLocations();
                locationInput.value = "";
            } else {
                console.error("Feil ved legging til plassering:", data.error);
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved legging til plassering:", error);
        }
    }

    // Slett en plassering
    async function deleteLocation(shelf, level) {
        const location = `${shelf}.${level}`;

        try {
            const response = await axios.delete(`/locations/${location}`);
            const data = response.data;
            if (data.success) {
                await getLocations();
            } else {
                console.error("Feil ved sletting av plassering:", data.error);
            }
        } catch (error) {
            Sentry.captureException(error);
            console.error("Feil ved sletting av plassering:", error);
        }
    }

    // Lytt til innsending av skjema for å legge til en ny plassering
    addLocationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("Form submitted");
        const location = locationInput.value.trim();
        if (location) {
            const locationParts = location.split(".");
            if (locationParts.length === 2) {
                const shelf = locationParts[0];
                const level = locationParts[1];
                addLocation(shelf, level);
            } else {
                console.error("Feil format på plassering");
            }
        }
    });

    // Hent og vis plasseringer ved lasting av siden
    console.log("Fetching locations...");
    getLocations();
});
