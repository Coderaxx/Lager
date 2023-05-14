$(document).ready(() => {
    const addLocationForm = document.getElementById("addLocationForm");
    const locationInput = document.getElementById("locationInput");
    const locationsTableBody = document.getElementById("locationsTableBody");

    // Oppdater plasseringstabellen
    function updateLocationsTable(locations) {
        locationsTableBody.innerHTML = "";

        locations.forEach((location) => {
            const row = document.createElement("tr");
            const locationCell = document.createElement("td");
            const deleteCell = document.createElement("td");
            const deleteButton = document.createElement("button");

            locationCell.textContent = location;
            deleteButton.textContent = "Slett";
            deleteButton.classList.add("button", "is-danger", "is-small");
            deleteButton.addEventListener("click", () => {
                deleteLocation(location);
            });

            locationCell.appendChild(deleteCell);
            deleteCell.appendChild(deleteButton);
            row.appendChild(locationCell);
            locationsTableBody.appendChild(row);
        });
    }

    // Hent eksisterende plasseringer fra serveren
    function getLocations() {
        fetch("/locations")
            .then((response) => response.json())
            .then((data) => {
                updateLocationsTable(data.locations);
            })
            .catch((error) => {
                console.error("Feil ved henting av plasseringer:", error);
            });
    }

    // Legg til en ny plassering
    function addLocation(location) {
        fetch("/locations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ location }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    getLocations();
                    locationInput.value = "";
                } else {
                    console.error("Feil ved legging til plassering:", data.error);
                }
            })
            .catch((error) => {
                console.error("Feil ved legging til plassering:", error);
            });
    }

    // Slett en plassering
    function deleteLocation(location) {
        fetch(`/locations/${location}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    getLocations();
                } else {
                    console.error("Feil ved sletting av plassering:", data.error);
                }
            })
            .catch((error) => {
                console.error("Feil ved sletting av plassering:", error);
            });
    }

    // Lytt til innsending av skjema for å legge til en ny plassering
    addLocationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const location = locationInput.value.trim();
        if (location) {
            addLocation(location);
        }
    });

    // Hent og vis plasseringer ved lasting av siden
    getLocations();
});
